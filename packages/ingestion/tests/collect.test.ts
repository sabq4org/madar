import { readFile } from 'node:fs/promises';
import type { SourceForCollection } from '@madar/contracts';
import { describe, expect, it, vi } from 'vitest';
import { collectFeed, FeedCollectionError, parseFeed } from '../src/index.js';

const xml = await readFile(new URL('../fixtures/sample-rss.xml', import.meta.url), 'utf8');
const source: SourceForCollection = {
  id: 's1',
  name: 'Sample',
  kind: 'fixture',
  feedUrl: 'https://example.test/feed.xml',
  allowedHosts: ['example.test'],
  enabled: true,
  rightsStatus: 'approved',
  contentPolicy: 'excerpt',
  etag: 'old-tag',
  lastModified: 'yesterday',
};
const fixture = (overrides: Partial<SourceForCollection> = {}): SourceForCollection => ({
  ...source,
  ...overrides,
});

describe('parseFeed', () => {
  it('normalizes RSS and Atom, strips HTML, rejects unsafe article links, and truncates excerpts', () => {
    const articles = parseFeed(xml, 'excerpt');
    expect(articles).toHaveLength(1);
    expect(articles[0]).toMatchObject({
      externalId: 'article-1',
      canonicalUrl: 'https://news.example.test/story/1?utm_source=rss',
      title: 'العنوان الأول',
      excerpt: 'خبر مهم & عاجل',
      publishedAt: '2026-11-17T08:00:00.000Z',
    });
    expect(articles[0].contentHash).toMatch(/^[a-f0-9]{64}$/);
    const declaration =
      '<?xml version="1.0"?><rss><channel><item><title>Declared</title><link>https://example.test/a</link></item></channel></rss>';
    expect(parseFeed(declaration, 'excerpt')).toHaveLength(1);
    const atom =
      '<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>tag:example,1</id><title>Atom item</title><link rel="alternate" href="https://example.test/a"/><summary>hello</summary></entry></feed>';
    expect(parseFeed(atom, 'excerpt')[0]).toMatchObject({
      externalId: 'tag:example,1',
      canonicalUrl: 'https://example.test/a',
      excerpt: 'hello',
    });
    const prefixedAtom =
      '<atom:feed xmlns:atom="http://www.w3.org/2005/Atom"><atom:entry><atom:id>tag:example,2</atom:id><atom:title>Prefixed</atom:title><atom:link href="https://example.test/b"/><atom:summary>body</atom:summary></atom:entry></atom:feed>';
    expect(parseFeed(prefixedAtom, 'excerpt')[0]).toMatchObject({
      title: 'Prefixed',
      canonicalUrl: 'https://example.test/b',
      excerpt: 'body',
    });
  });

  it('keeps hash stable across fetch metadata and published-time changes, and changes it for content edits', () => {
    const first = parseFeed(
      '<rss><channel><item><guid>x</guid><title>Title</title><link>https://example.test/a</link><pubDate>Mon, 17 Nov 2026 08:00:00 GMT</pubDate></item></channel></rss>',
      'metadata_only',
    )[0];
    const differentDate = parseFeed(
      '<rss><channel><item><guid>x</guid><title>Title</title><link>https://example.test/a</link><pubDate>Tue, 18 Nov 2026 08:00:00 GMT</pubDate></item></channel></rss>',
      'metadata_only',
    )[0];
    const changed = parseFeed(
      '<rss><channel><item><guid>x</guid><title>Edited</title><link>https://example.test/a</link></item></channel></rss>',
      'metadata_only',
    )[0];
    const differentGuid = parseFeed(
      '<rss><channel><item><guid>other</guid><title>Title</title><link>https://example.test/a</link></item></channel></rss>',
      'metadata_only',
    )[0];
    expect(first.contentHash).toBe(differentDate.contentHash);
    expect(first.contentHash).toBe(differentGuid.contentHash);
    expect(first.contentHash).not.toBe(changed.contentHash);
  });

  it('distinguishes malformed feeds and blocks DTD/entity declarations', () => {
    expect(() => parseFeed('<rss><channel>', 'excerpt')).toThrowError(FeedCollectionError);
    expect(() =>
      parseFeed('<!DOCTYPE rss [<!ENTITY x "boom">]><rss><channel/></rss>', 'excerpt'),
    ).toThrowError(/DTD/);
    expect(parseFeed('<rss><channel/></rss>', 'excerpt')).toEqual([]);
  });

  it('enforces metadata-only policy and the 600-character excerpt cap', () => {
    const long = `<rss><channel><item><title>x</title><link>https://example.test/x</link><description>${'a'.repeat(700)}</description></item></channel></rss>`;
    expect(parseFeed(long, 'metadata_only')[0].excerpt).toBeNull();
    expect(parseFeed(long, 'excerpt')[0].excerpt).toHaveLength(600);
    expect(
      parseFeed(
        '<rss><channel><item><title>private</title><link>https://127.0.0.1/a</link></item></channel></rss>',
        'excerpt',
      ),
    ).toEqual([]);
  });
});

describe('collectFeed', () => {
  it('gates disabled, unapproved, fixture/network mismatch, and default-off network before fetching', async () => {
    const request = vi.fn();
    await expect(
      collectFeed(fixture({ enabled: false }), { networkEnabled: true, fixtureXml: xml }),
    ).rejects.toMatchObject({ code: 'source_disabled' });
    await expect(
      collectFeed(fixture({ rightsStatus: 'pending' }), { networkEnabled: true, fixtureXml: xml }),
    ).rejects.toMatchObject({ code: 'rights_not_approved' });
    await expect(collectFeed(fixture(), { networkEnabled: true })).rejects.toMatchObject({
      code: 'fixture_missing',
    });
    await expect(
      collectFeed(fixture({ kind: 'rss' }), { networkEnabled: true, fixtureXml: xml }),
    ).rejects.toMatchObject({ code: 'fixture_forbidden' });
    await expect(
      collectFeed(fixture(), { networkEnabled: true, fixtureXml: xml }),
    ).resolves.toMatchObject({ articles: [{ excerpt: 'خبر مهم & عاجل' }], notModified: false });
    await expect(
      collectFeed(fixture({ kind: 'rss' }), { networkEnabled: false, request }),
    ).rejects.toMatchObject({ code: 'network_disabled' });
    expect(request).not.toHaveBeenCalled();
  });

  it('validates host, scheme, credentials, port, public DNS, and rejects redirects', async () => {
    for (const feedUrl of [
      'http://example.test/feed',
      'https://user:pass@example.test/feed',
      'https://example.test:444/feed',
      'https://attacker.test/feed',
    ]) {
      await expect(
        collectFeed(fixture({ kind: 'rss', feedUrl }), { networkEnabled: true }),
      ).rejects.toBeInstanceOf(FeedCollectionError);
    }
    await expect(
      collectFeed(fixture({ kind: 'rss' }), {
        networkEnabled: true,
        lookup: (async () => [{ address: '127.0.0.1', family: 4 }]) as never,
      }),
    ).rejects.toMatchObject({ code: 'unsafe_dns' });
    await expect(
      collectFeed(fixture({ kind: 'rss' }), {
        networkEnabled: true,
        lookup: (async () => [{ address: '::ffff:10.0.0.1', family: 6 }]) as never,
      }),
    ).rejects.toMatchObject({ code: 'unsafe_dns' });
    for (const [status, expectedCode] of [
      [302, 'redirect_rejected'],
      [404, 'http_error'],
    ] as const) {
      const responseDestroy = vi.fn();
      const responseResume = vi.fn();
      const request = ((...args: unknown[]) => {
        const callback = args[1] as (response: {
          statusCode: number;
          headers: Record<string, unknown>;
          resume(): void;
          destroy(): void;
        }) => void;
        const fake = {
          on() {
            return fake;
          },
          end() {
            callback({
              statusCode: status,
              headers: { location: 'https://elsewhere.test' },
              resume: responseResume,
              destroy: responseDestroy,
            });
          },
        };
        return fake;
      }) as never;
      await expect(
        collectFeed(fixture({ kind: 'rss' }), {
          networkEnabled: true,
          lookup: (async () => [{ address: '8.8.8.8', family: 4 }]) as never,
          request,
        }),
      ).rejects.toMatchObject({ code: expectedCode });
      expect(responseDestroy).toHaveBeenCalledOnce();
      expect(responseResume).not.toHaveBeenCalled();
    }
  });

  it('pins the resolved address, sends conditional headers, accepts 304, and handles response caps', async () => {
    let argsSeen: unknown;
    const request = ((...args: unknown[]) => {
      argsSeen = args[0];
      const callback = args[1] as (response: {
        statusCode: number;
        headers: Record<string, string>;
        resume(): void;
      }) => void;
      const fake = {
        on() {
          return fake;
        },
        end() {
          callback({ statusCode: 304, headers: { etag: 'new-tag' }, resume() {} });
        },
      };
      return fake;
    }) as never;
    const result = await collectFeed(fixture({ kind: 'rss' }), {
      networkEnabled: true,
      lookup: (async () => [{ address: '8.8.8.8', family: 4 }]) as never,
      request,
    });
    expect(result).toEqual({
      articles: [],
      etag: 'new-tag',
      lastModified: 'yesterday',
      notModified: true,
    });
    expect(argsSeen).toMatchObject({
      hostname: '8.8.8.8',
      servername: 'example.test',
      headers: { 'If-None-Match': 'old-tag', 'If-Modified-Since': 'yesterday' },
    });

    const handlers = new Map<string, (...args: unknown[]) => void>();
    const oversizedRequest = ((...args: unknown[]) => {
      const callback = args[1] as (response: {
        statusCode: number;
        headers: Record<string, unknown>;
        on(event: string, handler: (...params: unknown[]) => void): void;
        destroy(): void;
      }) => void;
      const fake = {
        on() {
          return fake;
        },
        end() {
          callback({
            statusCode: 200,
            headers: {},
            on(event, handler) {
              handlers.set(event, handler);
            },
            destroy() {
              handlers.get('error')?.(new Error('destroyed'));
            },
          });
          handlers.get('data')?.(Buffer.alloc(21));
        },
      };
      return fake;
    }) as never;
    await expect(
      collectFeed(fixture({ kind: 'rss' }), {
        networkEnabled: true,
        maxBytes: 20,
        lookup: (async () => [{ address: '8.8.8.8', family: 4 }]) as never,
        request: oversizedRequest,
      }),
    ).rejects.toMatchObject({ code: 'too_large' });
  });

  it('enforces a total request deadline and clears it when request creation throws', async () => {
    vi.useFakeTimers();
    try {
      const handlers = new Map<string, (error: Error) => void>();
      const pendingRequest = ((..._args: unknown[]) => {
        const fake = {
          on(event: string, handler: (error: Error) => void) {
            handlers.set(event, handler);
            return fake;
          },
          end() {},
          destroy(error: Error) {
            handlers.get('error')?.(error);
          },
        };
        return fake;
      }) as never;
      const pending = collectFeed(fixture({ kind: 'rss' }), {
        networkEnabled: true,
        timeoutMs: 20,
        lookup: (async () => [{ address: '8.8.8.8', family: 4 }]) as never,
        request: pendingRequest,
      });
      const timedOut = expect(pending).rejects.toMatchObject({ code: 'timeout' });
      await vi.advanceTimersByTimeAsync(21);
      await timedOut;
      expect(vi.getTimerCount()).toBe(0);

      const throwsOnCreation = (() => {
        throw new Error('request setup failed');
      }) as never;
      await expect(
        collectFeed(fixture({ kind: 'rss' }), {
          networkEnabled: true,
          timeoutMs: 20,
          lookup: (async () => [{ address: '8.8.8.8', family: 4 }]) as never,
          request: throwsOnCreation,
        }),
      ).rejects.toMatchObject({ code: 'request_failed' });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
