import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';

const external = new Set<string>();
for (const path of [
  'package.json',
  'apps/api/package.json',
  'apps/worker/package.json',
  'packages/db/package.json',
  'packages/ingestion/package.json',
]) {
  const pkg = JSON.parse(await readFile(path, 'utf8')) as { dependencies?: Record<string, string> };
  for (const key of Object.keys(pkg.dependencies ?? {}))
    if (!key.startsWith('@madar/')) external.add(key);
}
await Promise.all(
  ['api', 'worker'].map((app) =>
    build({
      entryPoints: [`apps/${app}/src/index.ts`],
      outfile: `apps/${app}/dist/index.js`,
      bundle: true,
      platform: 'node',
      format: 'esm',
      target: 'node24',
      sourcemap: true,
      external: [...external],
      logLevel: 'info',
    }),
  ),
);
