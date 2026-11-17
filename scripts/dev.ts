import { spawn } from 'node:child_process';
import { config } from './config.js';

const env = config();
const commands = [
  ['--import', 'tsx', 'apps/api/src/index.ts'],
  ['--import', 'tsx', 'apps/worker/src/index.ts'],
  [
    'apps/web/node_modules/next/dist/bin/next',
    'dev',
    'apps/web',
    '-p',
    String(env.WEB_PORT),
    '--hostname',
    env.HOST,
  ],
];
const children = commands.map((args) =>
  spawn(process.execPath, args, { stdio: 'inherit', env: process.env }),
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
