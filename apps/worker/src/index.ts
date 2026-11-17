import { type CollectJob, QUEUES } from '@madar/contracts';
import { createPool, dueSources, getSource } from '@madar/db';
import pino from 'pino';
import { config } from '../../../scripts/config.js';
import { enqueueSource, startQueue } from '../../../scripts/queue.js';
import { processSource } from './processor.js';

const env = config();
const logger = pino({ level: env.LOG_LEVEL });
const pool = createPool(env.DATABASE_URL);
pool.on('error', () =>
  logger.error({ code: 'DATABASE_CONNECTION_ERROR' }, 'Database connection failed'),
);
const boss = await startQueue(env.DATABASE_URL, () =>
  logger.error({ code: 'QUEUE_ERROR' }, 'Queue failed'),
);
await boss.work<CollectJob>(
  QUEUES.collect,
  { batchSize: 1, localConcurrency: 2, pollingIntervalSeconds: 1 },
  async (jobs) => {
    for (const job of jobs) {
      const result = await processSource(pool, job.data.sourceId, {
        networkEnabled: env.ENABLE_NETWORK_INGESTION,
        production: env.NODE_ENV === 'production',
      });
      logger.info(
        { sourceId: job.data.sourceId, jobId: job.id, ...result },
        'Collection completed',
      );
    }
  },
);
let scheduling = false;
let stopping = false;
async function schedule() {
  if (scheduling || stopping) return;
  scheduling = true;
  try {
    for (const { id } of await dueSources(pool)) {
      const source = await getSource(pool, id);
      if (
        !source ||
        (source.kind === 'rss' && !env.ENABLE_NETWORK_INGESTION) ||
        (source.kind === 'fixture' && env.NODE_ENV === 'production')
      )
        continue;
      await enqueueSource(boss, id);
    }
  } catch {
    logger.error({ code: 'SCHEDULER_FAILED' }, 'Source scheduling failed');
  } finally {
    scheduling = false;
  }
}
await schedule();
const timer = setInterval(() => void schedule(), env.WORKER_POLL_SECONDS * 1000);
logger.info({ networkEnabled: env.ENABLE_NETWORK_INGESTION }, 'Madar worker started');
async function stop() {
  if (stopping) return;
  stopping = true;
  clearInterval(timer);
  await boss.stop({ graceful: true, timeout: 15_000 });
  await pool.end();
}
process.once('SIGTERM', () => void stop());
process.once('SIGINT', () => void stop());
