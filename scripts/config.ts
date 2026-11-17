import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  HOST: z.string().default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  WEB_PORT: z.coerce.number().int().min(1).max(65535).default(3100),
  ADMIN_API_KEY: z.string().min(32).optional(),
  ENABLE_NETWORK_INGESTION: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
  WORKER_POLL_SECONDS: z.coerce.number().int().min(5).max(3600).default(30),
});
export function config() {
  const result = envSchema.safeParse(process.env);
  if (!result.success)
    throw new Error(
      `Invalid environment fields: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}`,
    );
  if (result.data.ADMIN_API_KEY?.startsWith('replace-'))
    throw new Error('Replace ADMIN_API_KEY before starting the API');
  return result.data;
}
