import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts', 'tests/**/*.test.ts'],
    testTimeout: 15_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
