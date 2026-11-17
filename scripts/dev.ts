import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { config } from './config.js';

const env = config();
const commands = [
  ['--import', 'tsx', 'apps/api/src/index.ts'],
  ['--import', 'tsx', 'apps/worker/src/index.ts'],
  ['node_modules/next/dist/bin/next', 'dev', '-p', String(env.WEB_PORT), '--hostname', env.HOST],
];
const children = commands.map((args, index) =>
  spawn(process.execPath, args, {
    stdio: 'inherit',
    env: process.env,
    cwd: index === 2 ? resolve('apps/web') : process.cwd(),
  }),
);
let stopping = false;
function stop(code: number) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
    process.exit(code);
  }, 7000).unref();
  Promise.all(
    children.map((child) =>
      child.exitCode !== null
        ? Promise.resolve()
        : new Promise((resolve) => child.once('exit', resolve)),
    ),
  ).then(() => process.exit(code));
}
for (const child of children) {
  child.on('error', () => stop(1));
  child.on('exit', (code) => {
    if (!stopping) stop(code ?? 1);
  });
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
