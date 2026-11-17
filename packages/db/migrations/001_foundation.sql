CREATE TABLE sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  kind text NOT NULL CHECK (kind IN ('rss','fixture')),
  homepage_url text NOT NULL,
  feed_url text NOT NULL UNIQUE,
  allowed_hosts text[] NOT NULL CHECK (cardinality(allowed_hosts) BETWEEN 1 AND 10),
  enabled boolean NOT NULL DEFAULT false,
  rights_status text NOT NULL DEFAULT 'pending' CHECK (rights_status IN ('pending','approved','blocked')),
  rights_basis text,
  content_policy text NOT NULL DEFAULT 'metadata_only' CHECK (content_policy IN ('metadata_only','excerpt')),
  poll_interval_seconds integer NOT NULL DEFAULT 300 CHECK (poll_interval_seconds BETWEEN 60 AND 86400),
  etag text,
  last_modified text,
  next_fetch_at timestamptz NOT NULL DEFAULT now(),
  last_success_at timestamptz,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (rights_status <> 'approved' OR char_length(rights_basis) >= 20)
);
CREATE INDEX sources_due ON sources(next_fetch_at) WHERE enabled AND rights_status = 'approved';

CREATE TABLE fetch_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources(id),
  status text NOT NULL CHECK (status IN ('success','not_modified','failed')),
  started_at timestamptz NOT NULL,
  finished_at timestamptz NOT NULL DEFAULT now(),
  discovered integer NOT NULL DEFAULT 0,
  inserted integer NOT NULL DEFAULT 0,
  updated integer NOT NULL DEFAULT 0,
  error_code text
);
CREATE INDEX fetch_runs_source_time ON fetch_runs(source_id, finished_at DESC);

CREATE TABLE articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES sources(id),
  external_id text,
  canonical_url text NOT NULL,
  title text NOT NULL,
  excerpt text,
  published_at timestamptz,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  content_hash text NOT NULL CHECK (content_hash ~ '^[a-f0-9]{64}$'),
  revision_count integer NOT NULL DEFAULT 1 CHECK (revision_count > 0),
  UNIQUE(source_id, canonical_url)
);
CREATE INDEX articles_feed ON articles(first_seen_at DESC, id DESC);
CREATE TABLE article_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id),
  revision_number integer NOT NULL CHECK (revision_number > 0),
  title text NOT NULL,
  excerpt text,
  content_hash text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(article_id, revision_number)
);

-- Reserved for editorially linked events in phase 2; not auto-populated in phase 1.
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  status text NOT NULL DEFAULT 'developing' CHECK (status IN ('developing','resolved','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE story_articles (
  story_id uuid NOT NULL REFERENCES stories(id),
  article_id uuid NOT NULL REFERENCES articles(id),
  linked_by text NOT NULL,
  linked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, article_id)
);
