import type {
  ArticleDetailResponse,
  ArticleListResponse,
  SourceListResponse,
} from '@madar/contracts';

const base = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4100').replace(/\/$/, '');
async function get<T>(path: string): Promise<{ data: T | null; error: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);
  try {
    const response = await fetch(`${base}${path}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (response.status === 404) return { data: null, error: false };
    if (!response.ok) return { data: null, error: true };
    return { data: (await response.json()) as T, error: false };
  } catch {
    return { data: null, error: true };
  } finally {
    clearTimeout(timer);
  }
}
export const articles = () => get<ArticleListResponse>('/v1/articles?limit=20');
export const sources = () => get<SourceListResponse>('/v1/sources');
export const article = (id: string) =>
  get<ArticleDetailResponse>(`/v1/articles/${encodeURIComponent(id)}`);

export function externalHref(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
