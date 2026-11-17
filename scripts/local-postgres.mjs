import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve('.local');
const data = resolve(root, 'postgres');
const socket = resolve(root, 'socket');
const env = { ...process.env, PGPASSWORD: 'madar_local_only' };
function run(bin, args, options = {}) {
  return execFileSync(bin, args, { env, stdio: 'inherit', ...options });
}
if (process.argv[2] === 'stop') {
  if (existsSync(resolve(data, 'postmaster.pid')))
    run('pg_ctl', ['-D', data, '-m', 'fast', '-w', 'stop']);
} else if (process.argv[2] === 'start') {
  mkdirSync(socket, { recursive: true, mode: 0o700 });
  if (!existsSync(resolve(data, 'PG_VERSION'))) {
    const pw = resolve(root, 'init-password');
    writeFileSync(pw, 'madar_local_only\n', { mode: 0o600 });
    try {
      run('initdb', [
        '-D',
        data,
        '-U',
        'madar',
        '--auth-local=trust',
        '--auth-host=scram-sha-256',
        '--encoding=UTF8',
        '--locale=C',
        `--pwfile=${pw}`,
      ]);
    } finally {
      rmSync(pw, { force: true });
    }
  }
  if (!existsSync(resolve(data, 'postmaster.pid')))
    run('pg_ctl', [
      '-D',
      data,
      '-l',
      resolve(root, 'postgres.log'),
      '-o',
      `-p 55432 -h 127.0.0.1 -k ${socket}`,
      '-w',
      'start',
    ]);
  const present = run(
    'psql',
    [
      '-h',
      '127.0.0.1',
      '-p',
      '55432',
      '-U',
      'madar',
      '-d',
      'postgres',
      '-tAc',
      "SELECT 1 FROM pg_database WHERE datname='madar'",
    ],
    { stdio: 'pipe' },
  )
    .toString()
    .trim();
  if (present !== '1') run('createdb', ['-h', '127.0.0.1', '-p', '55432', '-U', 'madar', 'madar']);
  console.log('Madar local PostgreSQL ready on 127.0.0.1:55432.');
} else {
  throw new Error('Usage: node scripts/local-postgres.mjs start|stop');
}
