import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { type CollectJob, QUEUES } from '@madar/contracts';
import { createPool, DEMO_SOURCE_ID, migrate, recordCollection, seedDemo } from '@madar/db';
import { afterAll, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildApp } from '../../apps/api/src/app.js';
import { processSource } from '../../apps/worker/src/processor.js';
import { parseFeed } from '../../packages/ingestion/src/index.js';
import { enqueueSource, startQueue } from '../../scripts/queue.js';

const url = process.env.TEST_DATABASE_URL;
if (!url || !/^\/madar_test_[a-z0-9_]+$/.test(new URL(url).pathname))
  throw new Error('Use pnpm test:integration to create an isolated database.');
const pool = createPool(url);
const key = 'integration-test-only-key-32-characters';
const options = { networkEnabled: false, production: false };
const xml = await readFile(resolve('fixtures/demo-feed.xml'), 'utf8');
const app = await buildApp({ pool, adminKey: key, enqueue: async () => 'test-job' });
beforeAll(async () => {
  await migrate(pool, resolve('packages/db/migrations'));
  await app.ready();
});
beforeEach(async () => {
  await pool.query('TRUNCATE sources,stories CASCADE');
  await seedDemo(pool);
});
afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('foundation against real PostgreSQL', () => {
  test('migration re-run is safe and readiness checks schema', async () => {
    await migrate(pool, resolve('packages/db/migrations'));
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM schema_migrations')).rows[0].count,
    ).toBe(3);
    expect((await app.inject('/health/ready')).statusCode).toBe(200);
    const latest = (
      await pool.query(
        "DELETE FROM schema_migrations WHERE name='003_require_rights_basis.sql' RETURNING *",
      )
    ).rows[0];
    try {
      expect((await app.inject('/health/ready')).statusCode).toBe(503);
    } finally {
      await pool.query(
        'INSERT INTO schema_migrations(name,checksum,applied_at) VALUES ($1,$2,$3)',
        [latest.name, latest.checksum, latest.applied_at],
      );
    }
    const live = await app.inject('/health/live');
    expect(live.json().service).toBe('madar-api');
  });
  test('recollection is idempotent and changed content preserves prior revisions', async () => {
    expect(await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml })).toEqual({
      inserted: 2,
      updated: 0,
    });
    expect(await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml })).toEqual({
      inserted: 0,
      updated: 0,
    });
    const changed = xml.replace('تحديد موعد تشغيل خط المطار', 'تعديل موعد تشغيل خط المطار');
    expect(await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: changed })).toEqual({
      inserted: 0,
      updated: 1,
    });
    expect(await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml })).toEqual({
      inserted: 0,
      updated: 1,
    });
    expect((await pool.query('SELECT count(*)::int AS count FROM articles')).rows[0].count).toBe(2);
    const list = (await app.inject('/v1/articles')).json();
    expect(list.data).toHaveLength(2);
    const edited = list.data.find((a: { revisionCount: number }) => a.revisionCount === 3);
    expect(edited.isDemo).toBe(true);
    const detail = (await app.inject(`/v1/articles/${edited.id}`)).json();
    expect(detail.revisions).toHaveLength(3);
  });
  test('concurrent duplicate processing still stores each item exactly once', async () => {
    await Promise.all([
      processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml }),
      processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml }),
    ]);
    expect(
      (await pool.query('SELECT count(*)::int AS count FROM article_revisions')).rows[0].count,
    ).toBe(2);
  });
  test('cursor returns all items with identical timestamps without duplicates', async () => {
    await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml });
    const first = (await app.inject('/v1/articles?limit=1')).json();
    expect(first.nextCursor).toBeTruthy();
    const second = (await app.inject(`/v1/articles?limit=1&before=${first.nextCursor}`)).json();
    expect(second.data).toHaveLength(1);
    expect(second.data[0].id).not.toBe(first.data[0].id);
    expect(second.nextCursor).toBeNull();
    expect((await app.inject('/v1/articles?before=broken')).statusCode).toBe(400);
    expect((await app.inject('/v1/articles?limit=999')).statusCode).toBe(400);
  });
  test('admin writes require auth; default source cannot collect; conflicting source is409', async () => {
    const payload = {
      name: 'مصدر اختبار',
      homepageUrl: 'https://news.example.com',
      feedUrl: 'https://news.example.com/rss',
      allowedHosts: ['news.example.com'],
    };
    expect(
      (await app.inject({ method: 'POST', url: '/v1/admin/sources', payload })).statusCode,
    ).toBe(401);
    const headers = { authorization: `Bearer ${key}` };
    const saved = await app.inject({ method: 'POST', url: '/v1/admin/sources', headers, payload });
    expect(saved.statusCode).toBe(201);
    const sourceId = saved.json().data.id;
    expect(
      (await app.inject({ method: 'POST', url: `/v1/admin/sources/${sourceId}/collect`, headers }))
        .statusCode,
    ).toBe(409);
    expect(
      (await app.inject({ method: 'POST', url: '/v1/admin/sources', headers, payload })).statusCode,
    ).toBe(409);
    expect(
      (
        await app.inject({
          method: 'POST',
          url: '/v1/admin/sources',
          headers,
          payload: { ...payload, feedUrl: 'http://127.0.0.1' },
        })
      ).statusCode,
    ).toBe(400);
  });
  test('failed/unapproved collection records failure and never publishes items', async () => {
    await pool.query("UPDATE sources SET rights_status='blocked' WHERE id=$1", [DEMO_SOURCE_ID]);
    await expect(
      processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml }),
    ).rejects.toThrow();
    expect((await pool.query('SELECT count(*)::int AS count FROM articles')).rows[0].count).toBe(0);
    expect((await pool.query('SELECT status FROM fetch_runs')).rows[0].status).toBe('failed');
    await pool.query("UPDATE sources SET rights_status='approved' WHERE id=$1", [DEMO_SOURCE_ID]);
    await expect(
      processSource(pool, DEMO_SOURCE_ID, { ...options, production: true, fixtureXml: xml }),
    ).rejects.toThrow('FIXTURE_DISABLED_IN_PRODUCTION');
  });
  test('rights revocation hides materials and metadata policy hides stored excerpts', async () => {
    await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml });
    const headers = { authorization: `Bearer ${key}` };
    const id = (await app.inject('/v1/articles')).json().data[0].id;
    expect(
      (
        await app.inject({
          method: 'PATCH',
          url: `/v1/admin/sources/${DEMO_SOURCE_ID}`,
          headers,
          payload: { contentPolicy: 'metadata_only' },
        })
      ).statusCode,
    ).toBe(200);
    const detail = (await app.inject(`/v1/articles/${id}`)).json();
    expect(detail.data.excerpt).toBeNull();
    expect(detail.revisions[0].excerpt).toBeNull();
    await app.inject({
      method: 'PATCH',
      url: `/v1/admin/sources/${DEMO_SOURCE_ID}`,
      headers,
      payload: { rightsStatus: 'blocked' },
    });
    expect((await app.inject('/v1/articles')).json().data).toEqual([]);
    expect((await app.inject(`/v1/articles/${id}`)).statusCode).toBe(404);
  });
  test('production reads never expose synthetic fixtures', async () => {
    await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml });
    const production = await buildApp({
      pool,
      adminKey: key,
      enqueue: async () => null,
      production: true,
    });
    try {
      expect((await production.inject('/v1/articles')).json().data).toEqual([]);
      expect((await production.inject('/v1/sources')).json().data).toEqual([]);
    } finally {
      await production.close();
    }
  });
  test('content policy changed during fetch is enforced before storage', async () => {
    const staleResult = {
      articles: parseFeed(xml, 'excerpt'),
      etag: null,
      lastModified: null,
      notModified: false,
    };
    await pool.query("UPDATE sources SET content_policy='metadata_only' WHERE id=$1", [
      DEMO_SOURCE_ID,
    ]);
    await recordCollection(pool, DEMO_SOURCE_ID, staleResult, new Date());
    expect(
      (await pool.query('SELECT excerpt FROM articles')).rows.every((r) => r.excerpt === null),
    ).toBe(true);
    expect(
      (await pool.query('SELECT excerpt FROM article_revisions')).rows.every(
        (r) => r.excerpt === null,
      ),
    ).toBe(true);
    expect(await processSource(pool, DEMO_SOURCE_ID, { ...options, fixtureXml: xml })).toEqual({
      inserted: 0,
      updated: 0,
    });
  });
  test('persistent queue suppresses duplicate jobs and delivers through processor', async () => {
    const boss = await startQueue(url);
    try {
      const id = await enqueueSource(boss, DEMO_SOURCE_ID);
      expect(id).toBeTruthy();
      expect(await enqueueSource(boss, DEMO_SOURCE_ID)).toBeNull();
      await boss.work<CollectJob>(QUEUES.collect, { pollingIntervalSeconds: 0.5 }, async (jobs) => {
        for (const job of jobs)
          await processSource(pool, job.data.sourceId, { ...options, fixtureXml: xml });
      });
      await vi.waitFor(
        async () => {
          expect(
            (await pool.query('SELECT count(*)::int AS count FROM articles')).rows[0].count,
          ).toBe(2);
        },
        { timeout: 10000, interval: 100 },
      );
      await vi.waitFor(
        async () => {
          expect((await boss.getJobById(QUEUES.collect, id ?? ''))?.state).toBe('completed');
        },
        { timeout: 10000, interval: 100 },
      );
    } finally {
      await boss.stop({ graceful: true });
    }
  });
  test('queue failure reaches dead letter after retries are exhausted', async () => {
    const boss = await startQueue(url);
    try {
      const id = await boss.send(QUEUES.collect, { sourceId: DEMO_SOURCE_ID }, { retryLimit: 0 });
      await boss.work(QUEUES.collect, { pollingIntervalSeconds: 0.5 }, async () => {
        throw new Error('INTENTIONAL_TEST_FAILURE');
      });
      await vi.waitFor(
        async () => {
          expect((await boss.getJobById(QUEUES.collect, id ?? ''))?.state).toBe('failed');
        },
        { timeout: 10000, interval: 100 },
      );
      const dead = await boss.fetch(QUEUES.dead);
      expect(dead.length).toBe(1);
    } finally {
      await boss.stop({ graceful: true });
    }
  });
});
