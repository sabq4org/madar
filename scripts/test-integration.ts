import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createPool } from '@madar/db';

const base = new URL(
  process.env.DATABASE_URL ?? 'postgres://madar:madar_local_only@127.0.0.1:55432/madar',
);
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
  throw new Error(
    'Integration runner requires a local PostgreSQL host; it creates an isolated test database.',
  );
const name = `madar_test_${process.pid}_${randomBytes(4).toString('hex')}`;
const adminUrl = new URL(base);
adminUrl.pathname = '/postgres';
const admin = createPool(adminUrl.toString());
let created = false;
let exitCode = 1;
try {
  await admin.query(`CREATE DATABASE "${name}"`);
  created = true;
  base.pathname = `/${name}`;
  exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['node_modules/vitest/vitest.mjs', 'run', 'tests/integration'],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          TEST_DATABASE_URL: base.toString(),
          NODE_ENV: 'test',
          ENABLE_NETWORK_INGESTION: 'false',
        },
      },
    );
    child.once('error', reject);
    child.once('exit', (code) => resolve(code ?? 1));
  });
} finally {
  if (created) {
    await admin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=$1 AND pid<>pg_backend_pid()',
      [name],
    );
    await admin.query(`DROP DATABASE "${name}"`);
  }
  await admin.end();
}
process.exitCode = exitCode;
