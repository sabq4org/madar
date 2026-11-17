export type SourceKind = 'rss' | 'fixture';
export type RightsStatus = 'pending' | 'approved' | 'blocked';
export type ContentPolicy = 'metadata_only' | 'excerpt';

export interface SourceForCollection {
  id: string;
  name: string;
  kind: SourceKind;
  feedUrl: string;
  allowedHosts: string[];
  enabled: boolean;
  rightsStatus: RightsStatus;
  contentPolicy: ContentPolicy;
  etag: string | null;
  lastModified: string | null;
}

export interface NormalizedArticle {
  externalId: string | null;
  canonicalUrl: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  contentHash: string;
}

export interface CollectionResult {
  articles: NormalizedArticle[];
  etag: string | null;
  lastModified: string | null;
  notModified: boolean;
}

export interface SourceDto {
  id: string;
  name: string;
  homepageUrl: string;
  kind: SourceKind;
  enabled: boolean;
  rightsStatus: RightsStatus;
}

export interface ArticleDto {
  id: string;
  sourceId: string;
  sourceName: string;
  canonicalUrl: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  revisionCount: number;
  isDemo: boolean;
}

export interface ArticleListResponse {
  data: ArticleDto[];
  nextCursor: string | null;
}
export interface SourceListResponse {
  data: SourceDto[];
}
export interface ArticleDetailResponse {
  data: ArticleDto;
  revisions: { id: string; title: string; excerpt: string | null; observedAt: string }[];
}

export const QUEUES = { collect: 'collect-source', dead: 'collect-source-dead' } as const;
export interface CollectJob {
  sourceId: string;
}
