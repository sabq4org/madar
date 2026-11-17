import { cp, mkdir } from 'node:fs/promises';

const target = 'apps/web/.next/standalone/apps/web';
await mkdir(`${target}/.next`, { recursive: true });
await cp('apps/web/public', `${target}/public`, { recursive: true });
await cp('apps/web/.next/static', `${target}/.next/static`, { recursive: true });
