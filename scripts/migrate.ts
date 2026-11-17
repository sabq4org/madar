import { resolve } from 'node:path';
import { createPool, migrate } from '@madar/db';
import { config } from './config.js';

const pool = createPool(config().DATABASE_URL);
try {
  await migrate(pool, resolve('packages/db/migrations'));
  console.log('Database migrations applied.');
} finally {
  await pool.end();
}
