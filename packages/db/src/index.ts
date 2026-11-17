import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import type { ArticleDto, CollectionResult, SourceForCollection } from '@madar/contracts';
import pg, { type Pool, type PoolClient } from 'pg';

export type { Pool } from 'pg';
export function createPool(connectionString: string): Pool {
  return new pg.Pool({
    connectionString,
    max: 8,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 15_000,
    idleTimeoutMillis: 30_000,
    application_name: 'madar',
  });
}

export async function migrate(pool: Pool, directory: string): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(74261117)');
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    );
    const names = (await readdir(directory)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    for (const name of names) {
      const sql = await readFile(`${directory}/${name}`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const prior = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE name=$1',
        [name],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].checksum !== checksum)
          throw new Error(`Applied migration changed: ${name}`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name,checksum) VALUES ($1,$2)', [
          name,
          checksum,
        ]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(74261117)');
    client.release();
  }
}

export async function transaction<T>(
  pool: Pool,
  run: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await run(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export interface SourceRecord extends SourceForCollection {
  homepageUrl: string;
  pollIntervalSeconds: number;
}
const sourceColumns = `id,name,kind,homepage_url AS "homepageUrl",feed_url AS "feedUrl",allowed_hosts AS "allowedHosts",enabled,rights_status AS "rightsStatus",content_policy AS "contentPolicy",etag,last_modified AS "lastModified",poll_interval_seconds AS "pollIntervalSeconds"`;
export async function getSource(pool: Pool, id: string): Promise<SourceRecord | null> {
  return (
    (await pool.query<SourceRecord>(`SELECT ${sourceColumns} FROM sources WHERE id=$1`, [id]))
      .rows[0] ?? null
  );
}
export async function dueSources(pool: Pool): Promise<{ id: string }[]> {
  return (
    await pool.query<{ id: string }>(
      "SELECT id FROM sources WHERE enabled AND rights_status='approved' AND next_fetch_at <= now() ORDER BY next_fetch_at LIMIT 100",
    )
  ).rows;
}

export async function recordCollection(
  pool: Pool,
  sourceId: string,
  result: CollectionResult,
  startedAt: Date,
): Promise<{ inserted: number; updated: number }> {
  return transaction(pool, async (client) => {
    const source = (
      await client.query<{ enabled: boolean; rights_status: string; content_policy: string }>(
        'SELECT enabled,rights_status,content_policy FROM sources WHERE id=$1 FOR UPDATE',
        [sourceId],
      )
    ).rows[0];
    if (!source?.enabled || source.rights_status !== 'approved')
      throw new Error('SOURCE_NOT_APPROVED');
    let inserted = 0;
    let updated = 0;
    for (const collected of result.articles) {
      const article =
        source.content_policy === 'metadata_only'
          ? {
              ...collected,
              excerpt: null,
              contentHash: createHash('sha256')
                .update(
                  JSON.stringify({
                    canonicalUrl: collected.canonicalUrl,
                    title: collected.title,
                    excerpt: null,
                  }),
                )
                .digest('hex'),
            }
          : collected;
      const existing = (
        await client.query<{ id: string; content_hash: string; revision_count: number }>(
          'SELECT id,content_hash,revision_count FROM articles WHERE source_id=$1 AND canonical_url=$2',
          [sourceId, article.canonicalUrl],
        )
      ).rows[0];
      let id: string;
      let revision: number;
      if (!existing) {
        const row = (
          await client.query<{ id: string }>(
            'INSERT INTO articles(source_id,external_id,canonical_url,title,excerpt,published_at,content_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [
              sourceId,
              article.externalId,
              article.canonicalUrl,
              article.title,
              article.excerpt,
              article.publishedAt,
              article.contentHash,
            ],
          )
        ).rows[0];
        if (!row) throw new Error('ARTICLE_INSERT_FAILED');
        id = row.id;
        revision = 1;
        inserted++;
      } else if (existing.content_hash !== article.contentHash) {
        id = existing.id;
        revision = existing.revision_count + 1;
        updated++;
        await client.query(
          'UPDATE articles SET title=$2,excerpt=$3,content_hash=$4,revision_count=$5,last_seen_at=now(),published_at=COALESCE($6,published_at) WHERE id=$1',
          [id, article.title, article.excerpt, article.contentHash, revision, article.publishedAt],
        );
      } else {
        await client.query('UPDATE articles SET last_seen_at=now() WHERE id=$1', [existing.id]);
        continue;
      }
      await client.query(
        'INSERT INTO article_revisions(article_id,revision_number,title,excerpt,content_hash) VALUES ($1,$2,$3,$4,$5)',
        [id, revision, article.title, article.excerpt, article.contentHash],
      );
    }
    await client.query(
      `UPDATE sources SET etag=$2,last_modified=$3,last_success_at=now(),last_error_code=NULL,next_fetch_at=now()+make_interval(secs=>poll_interval_seconds) WHERE id=$1`,
      [sourceId, result.etag, result.lastModified],
    );
    await client.query(
      'INSERT INTO fetch_runs(source_id,status,started_at,discovered,inserted,updated) VALUES ($1,$2,$3,$4,$5,$6)',
      [
        sourceId,
        result.notModified ? 'not_modified' : 'success',
        startedAt,
        result.articles.length,
        inserted,
        updated,
      ],
    );
    return { inserted, updated };
  });
}

export async function recordFailure(
  pool: Pool,
  sourceId: string,
  startedAt: Date,
  code: string,
): Promise<void> {
  await transaction(pool, async (client) => {
    await client.query(
      'UPDATE sources SET last_error_code=$2,next_fetch_at=now()+make_interval(secs=>GREATEST(poll_interval_seconds,300)) WHERE id=$1',
      [sourceId, code],
    );
    await client.query(
      "INSERT INTO fetch_runs(source_id,status,started_at,error_code) VALUES ($1,'failed',$2,$3)",
      [sourceId, startedAt, code],
    );
  });
}

export const articleSelect = `SELECT a.id,a.source_id AS "sourceId",s.name AS "sourceName",a.canonical_url AS "canonicalUrl",a.title,CASE WHEN s.content_policy='excerpt' THEN a.excerpt ELSE NULL END AS excerpt,a.published_at AS "publishedAt",a.first_seen_at AS "firstSeenAt",a.last_seen_at AS "lastSeenAt",a.revision_count AS "revisionCount",(s.kind='fixture') AS "isDemo" FROM articles a JOIN sources s ON s.id=a.source_id`;
type ArticleRow = Omit<ArticleDto, 'publishedAt' | 'firstSeenAt' | 'lastSeenAt'> & {
  publishedAt: Date | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
};
export function toArticleDto(row: ArticleRow): ArticleDto {
  return {
    ...row,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    firstSeenAt: row.firstSeenAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  };
}
export type { ArticleRow };

export const DEMO_SOURCE_ID = '00000000-0000-4000-8000-000000000001';
export async function seedDemo(pool: Pool): Promise<void> {
  await pool.query(
    `INSERT INTO sources(id,name,kind,homepage_url,feed_url,allowed_hosts,enabled,rights_status,rights_basis,content_policy,poll_interval_seconds)
    VALUES ($1,'مصدر مدار التجريبي','fixture','https://example.test','https://example.test/feed.xml',ARRAY['example.test'],true,'approved','Synthetic fixture authored for local Madar development only','excerpt',300)
    ON CONFLICT (id) DO NOTHING`,
    [DEMO_SOURCE_ID],
  );
}
