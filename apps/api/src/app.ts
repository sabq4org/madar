import { timingSafeEqual } from 'node:crypto';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { type ArticleRow, articleSelect, getSource, type Pool, toArticleDto } from '@madar/db';
import Fastify from 'fastify';
import { z } from 'zod';

interface Options {
  pool: Pool;
  adminKey?: string;
  enqueue: (sourceId: string) => Promise<string | null>;
  logger?: boolean;
  networkEnabled?: boolean;
  production?: boolean;
}
const uuid = z.string().uuid();
const cursorSchema = z.object({ t: z.string().datetime(), id: uuid });
const httpsUrl = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const u = new URL(value);
    return u.protocol === 'https:' && !u.username && !u.password && (!u.port || u.port === '443');
  }, 'Use HTTPS without credentials or custom port');
const newSource = z
  .object({
    name: z.string().trim().min(1).max(160),
    homepageUrl: httpsUrl,
    feedUrl: httpsUrl,
    allowedHosts: z
      .array(
        z
          .string()
          .regex(/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i)
          .max(253),
      )
      .min(1)
      .max(10),
    enabled: z.boolean().default(false),
    rightsStatus: z.enum(['pending', 'approved', 'blocked']).default('pending'),
    rightsBasis: z.string().trim().min(20).max(2000).optional(),
    contentPolicy: z.enum(['metadata_only', 'excerpt']).default('metadata_only'),
    pollIntervalSeconds: z.number().int().min(60).max(86400).default(300),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (!value.allowedHosts.map((h) => h.toLowerCase()).includes(new URL(value.feedUrl).hostname))
      ctx.addIssue({
        code: 'custom',
        message: 'Feed host must appear in allowedHosts',
        path: ['allowedHosts'],
      });
    if (value.rightsStatus === 'approved' && !value.rightsBasis)
      ctx.addIssue({
        code: 'custom',
        message: 'Approved sources require a recorded rights basis',
        path: ['rightsBasis'],
      });
  });

export async function buildApp(options: Options) {
  const app = Fastify({
    logger: options.logger
      ? { redact: ['req.headers.authorization', 'req.headers.cookie'] }
      : false,
    bodyLimit: 16_384,
    requestTimeout: 10_000,
  });
  await app.register(helmet);
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof z.ZodError)
      return reply
        .code(400)
        .send({ error: 'INVALID_REQUEST', fields: error.issues.map((i) => i.path.join('.')) });
    const e = error as { statusCode?: number; code?: string };
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500)
      return reply
        .code(e.statusCode)
        .send({ error: e.statusCode === 429 ? 'RATE_LIMITED' : 'INVALID_REQUEST' });
    if (e.code === '23505') return reply.code(409).send({ error: 'SOURCE_ALREADY_EXISTS' });
    request.log.error({ code: e.code ?? 'INTERNAL_ERROR' }, 'Request failed');
    return reply.code(500).send({ error: 'INTERNAL_ERROR' });
  });
  app.get('/health/live', () => ({ status: 'ok', service: 'madar-api' }));
  app.get('/health/ready', async (_, reply) => {
    try {
      const check = await options.pool.query(
        "SELECT 1 FROM schema_migrations WHERE name IN ('001_foundation.sql','002_cursor_precision.sql','003_require_rights_basis.sql')",
      );
      if (check.rowCount !== 3) return reply.code(503).send({ status: 'not_ready' });
      return { status: 'ready', database: 'ok' };
    } catch {
      return reply.code(503).send({ status: 'not_ready' });
    }
  });
  const productionFilter = options.production ? " AND s.kind<>'fixture'" : '';
  app.get('/v1/sources', async () => ({
    data: (
      await options.pool.query(
        `SELECT id,name,homepage_url AS "homepageUrl",kind,enabled,rights_status AS "rightsStatus" FROM sources s WHERE true ${productionFilter} ORDER BY name,id`,
      )
    ).rows,
  }));
  app.get('/v1/articles', async (request) => {
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(50).default(20),
        before: z.string().max(512).optional(),
      })
      .strict()
      .parse(request.query);
    let cursor: z.infer<typeof cursorSchema> | null = null;
    if (query.before) {
      try {
        cursor = cursorSchema.parse(
          JSON.parse(Buffer.from(query.before, 'base64url').toString('utf8')),
        );
      } catch {
        throw new z.ZodError([{ code: 'custom', path: ['before'], message: 'Invalid cursor' }]);
      }
    }
    const rows = (
      await options.pool.query<ArticleRow>(
        `${articleSelect} WHERE s.rights_status='approved' ${productionFilter} ${cursor ? 'AND (a.first_seen_at,a.id)<($2::timestamptz,$3::uuid)' : ''} ORDER BY a.first_seen_at DESC,a.id DESC LIMIT $1`,
        cursor ? [query.limit + 1, cursor.t, cursor.id] : [query.limit + 1],
      )
    ).rows;
    const data = rows.slice(0, query.limit).map(toArticleDto);
    const last = data.at(-1);
    return {
      data,
      nextCursor:
        rows.length > query.limit && last
          ? Buffer.from(JSON.stringify({ t: last.firstSeenAt, id: last.id })).toString('base64url')
          : null,
    };
  });
  app.get('/v1/articles/:id', async (request, reply) => {
    const { id } = z.object({ id: uuid }).parse(request.params);
    const row = (
      await options.pool.query<ArticleRow>(
        `${articleSelect} WHERE a.id=$1 AND s.rights_status='approved' ${productionFilter}`,
        [id],
      )
    ).rows[0];
    if (!row) return reply.code(404).send({ error: 'ARTICLE_NOT_FOUND' });
    const revisions = (
      await options.pool.query(
        `SELECT r.id,r.title,CASE WHEN s.content_policy='excerpt' THEN r.excerpt ELSE NULL END AS excerpt,r.observed_at AS "observedAt" FROM article_revisions r JOIN articles a ON a.id=r.article_id JOIN sources s ON s.id=a.source_id WHERE r.article_id=$1 ORDER BY r.revision_number DESC`,
        [id],
      )
    ).rows;
    return { data: toArticleDto(row), revisions };
  });
  await app.register(
    async (admin) => {
      admin.addHook('onRequest', async (request, reply) => {
        if (!options.adminKey) return reply.code(503).send({ error: 'ADMIN_DISABLED' });
        const header = request.headers.authorization ?? '';
        const expected = `Bearer ${options.adminKey}`;
        const supplied = Buffer.from(header);
        const target = Buffer.from(expected);
        if (supplied.length !== target.length || !timingSafeEqual(supplied, target))
          return reply.code(401).send({ error: 'UNAUTHORIZED' });
      });
      admin.post('/sources', async (request, reply) => {
        const input = newSource.parse(request.body);
        const result = await options.pool.query<{ id: string }>(
          `INSERT INTO sources(name,kind,homepage_url,feed_url,allowed_hosts,enabled,rights_status,rights_basis,content_policy,poll_interval_seconds) VALUES ($1,'rss',$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [
            input.name,
            input.homepageUrl,
            input.feedUrl,
            input.allowedHosts.map((h) => h.toLowerCase()),
            input.enabled,
            input.rightsStatus,
            input.rightsBasis ?? null,
            input.contentPolicy,
            input.pollIntervalSeconds,
          ],
        );
        return reply.code(201).send({ data: result.rows[0] });
      });
      admin.patch('/sources/:id', async (request, reply) => {
        const { id } = z.object({ id: uuid }).parse(request.params);
        const patch = z
          .object({
            enabled: z.boolean().optional(),
            rightsStatus: z.enum(['pending', 'approved', 'blocked']).optional(),
            rightsBasis: z.string().trim().min(20).max(2000).optional(),
            contentPolicy: z.enum(['metadata_only', 'excerpt']).optional(),
          })
          .strict()
          .refine((v) => Object.keys(v).length > 0)
          .parse(request.body);
        const current = (
          await options.pool.query<{ rights_status: string; rights_basis: string | null }>(
            'SELECT rights_status,rights_basis FROM sources WHERE id=$1',
            [id],
          )
        ).rows[0];
        if (!current) return reply.code(404).send({ error: 'SOURCE_NOT_FOUND' });
        if (
          (patch.rightsStatus ?? current.rights_status) === 'approved' &&
          !(patch.rightsBasis ?? current.rights_basis)
        )
          return reply.code(400).send({ error: 'RIGHTS_BASIS_REQUIRED' });
        await options.pool.query(
          'UPDATE sources SET enabled=COALESCE($2,enabled),rights_status=COALESCE($3,rights_status),rights_basis=COALESCE($4,rights_basis),content_policy=COALESCE($5,content_policy) WHERE id=$1',
          [id, patch.enabled, patch.rightsStatus, patch.rightsBasis, patch.contentPolicy],
        );
        return { data: { id } };
      });
      admin.post('/sources/:id/collect', async (request, reply) => {
        const { id } = z.object({ id: uuid }).parse(request.params);
        const source = await getSource(options.pool, id);
        if (!source) return reply.code(404).send({ error: 'SOURCE_NOT_FOUND' });
        if (!source.enabled || source.rightsStatus !== 'approved')
          return reply.code(409).send({ error: 'SOURCE_NOT_APPROVED' });
        if (source.kind === 'rss' && !options.networkEnabled)
          return reply.code(409).send({ error: 'NETWORK_INGESTION_DISABLED' });
        if (source.kind === 'fixture' && options.production)
          return reply.code(409).send({ error: 'FIXTURE_DISABLED_IN_PRODUCTION' });
        const jobId = await options.enqueue(id);
        return reply.code(202).send({ jobId, queued: jobId !== null });
      });
    },
    { prefix: '/v1/admin' },
  );
  return app;
}
