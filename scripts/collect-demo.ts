import { DEMO_SOURCE_ID } from '@madar/db';
import { config } from './config.js';
import { enqueueSource, startQueue } from './queue.js';

const env = config();
if (env.NODE_ENV === 'production') throw new Error('Demo collection is disabled in production');
const boss = await startQueue(env.DATABASE_URL);
try {
  const id = await enqueueSource(boss, DEMO_SOURCE_ID);
  console.log(
    id
      ? `Demo queued: ${id}. Run pnpm dev to consume it.`
      : 'A job for this source is already queued or running.',
  );
} finally {
  await boss.stop();
}
