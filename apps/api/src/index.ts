import { createPool } from '@madar/db';
import { config } from '../../../scripts/config.js';
import { enqueueSource, startQueue } from '../../../scripts/queue.js';
import { buildApp } from './app.js';

const env = config();
if (env.NODE_ENV === 'production' && !env.ADMIN_API_KEY)
  throw new Error('ADMIN_API_KEY is required for the production API');
const pool = createPool(env.DATABASE_URL);
pool.on('error', () => console.error('DATABASE_CONNECTION_ERROR'));
const boss = await startQueue(env.DATABASE_URL, () => console.error('QUEUE_ERROR'));
const app = await buildApp({
  pool,
  adminKey: env.ADMIN_API_KEY,
  enqueue: (id) => enqueueSource(boss, id),
  logger: true,
  networkEnabled: env.ENABLE_NETWORK_INGESTION,
  production: env.NODE_ENV === 'production',
});
app.addHook('onClose', async () => {
  await boss.stop();
  await pool.end();
});
await app.listen({ host: env.HOST, port: env.API_PORT });
process.once('SIGTERM', () => void app.close());
process.once('SIGINT', () => void app.close());
