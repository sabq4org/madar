import { createPool, seedDemo } from '@madar/db';
import { config } from './config.js';

const env = config();
if (env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production');
const pool = createPool(env.DATABASE_URL);
try {
  await seedDemo(pool);
  console.log('Synthetic demo source ready. No external source was enabled.');
} finally {
  await pool.end();
}
