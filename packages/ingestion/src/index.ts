import { createHash } from 'node:crypto';
import { lookup as dnsLookup } from 'node:dns/promises';
import type { IncomingHttpHeaders } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { checkServerIdentity } from 'node:tls';
import type { CollectionResult, NormalizedArticle, SourceForCollection } from '@madar/contracts';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import ipaddr from 'ipaddr.js';

const MAX_BYTES = 1_000_000;
const DEFAULT_TIMEOUT_MS = 8_000;
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  parseTagValue: false,
  processEntities: false,
  htmlEntities: false,
  removeNSPrefix: false,
});

export class FeedCollectionError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = 'FeedCollectionError';
  }
}

export interface CollectOptions {
  networkEnabled: boolean;
  fixtureXml?: string;
  timeoutMs?: number;
  maxBytes?: number;
  /** Test seam; production callers should omit these. */
  lookup?: typeof dnsLookup;
  request?: typeof httpsRequest;
}

export function parseFeed(
  xml: string,
  policy: SourceForCollection['contentPolicy'],
): NormalizedArticle[] {
  if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml))
    throw new FeedCollectionError('DTD and entity declarations are not allowed', 'unsafe_xml');
  if (Buffer.byteLength(xml, 'utf8') > MAX_BYTES)
    throw new FeedCollectionError('Feed exceeds size limit', 'too_large');
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new FeedCollectionError('Malformed XML feed', 'malformed_xml');

  let doc: Record<string, unknown>;
  try {
    doc = parser.parse(xml) as Record<string, unknown>;
  } catch {
    throw new FeedCollectionError('Malformed XML feed', 'malformed_xml');
  }

  const rootName = Object.keys(doc).find((key) => !key.startsWith('?'));
  const root = rootName ? asRecord(doc[rootName]) : null;
  if (!root || !rootName)
    throw new FeedCollectionError('Feed has no recognized root', 'invalid_feed');
  let entries: unknown[];
  if (localName(rootName) === 'rss') {
    const rawChannel = child(root, 'channel');
    const channel = asRecord(rawChannel);
    if (!channel && rawChannel === undefined)
      throw new FeedCollectionError('RSS feed has no channel', 'invalid_feed');
    entries = asArray(channel ? child(channel, 'item') : undefined);
  } else if (localName(rootName) === 'feed') {
    entries = asArray(child(root, 'entry'));
  } else {
    throw new FeedCollectionError('Unsupported feed format', 'invalid_feed');
  }

  return entries.flatMap((raw): NormalizedArticle[] => {
    const item = asRecord(raw);
    if (!item) return [];
    const title = cleanText(child(item, 'title'));
    const canonicalUrl = articleUrl(item);
    if (!title || !canonicalUrl) return [];
    const externalId = cleanText(child(item, 'guid') ?? child(item, 'id')) || null;
    const excerpt =
      policy === 'excerpt'
        ? ([
            child(item, 'description'),
            child(item, 'summary'),
            child(item, 'content:encoded') ?? child(item, 'encoded'),
            child(item, 'content'),
          ]
            .map(cleanText)
            .find(Boolean)
            ?.slice(0, 600) ?? null)
        : null;
    const publishedAt = parseDate(
      child(item, 'pubDate') ??
        child(item, 'published') ??
        child(item, 'updated') ??
        child(item, 'dc:date') ??
        child(item, 'date'),
    );
    const meaningful = JSON.stringify({ canonicalUrl, title, excerpt });
    const contentHash = createHash('sha256').update(meaningful).digest('hex');
    return [{ externalId, canonicalUrl, title, excerpt, publishedAt, contentHash }];
  });
}

export async function collectFeed(
  source: SourceForCollection,
  options: CollectOptions,
): Promise<CollectionResult> {
  if (!source.enabled) throw new FeedCollectionError('Source is disabled', 'source_disabled');
  if (source.rightsStatus !== 'approved')
    throw new FeedCollectionError('Source rights are not approved', 'rights_not_approved');
  if (source.kind === 'fixture') {
    if (options.fixtureXml === undefined)
      throw new FeedCollectionError('Fixture XML is required', 'fixture_missing');
    if (Buffer.byteLength(options.fixtureXml, 'utf8') > (options.maxBytes ?? MAX_BYTES))
      throw new FeedCollectionError('Feed exceeds size limit', 'too_large');
    return {
      articles: parseFeed(options.fixtureXml, source.contentPolicy),
      etag: null,
      lastModified: null,
      notModified: false,
    };
  }
  if (options.fixtureXml !== undefined)
    throw new FeedCollectionError(
      'fixtureXml is only valid for fixture sources',
      'fixture_forbidden',
    );
  if (!options.networkEnabled)
    throw new FeedCollectionError('Network collection is disabled', 'network_disabled');
  if (source.kind !== 'rss')
    throw new FeedCollectionError('Unsupported source kind', 'invalid_source');

  const fetched = await fetchFeed(source, options);
  if (fetched.status === 304)
    return {
      articles: [],
      etag: header(fetched.headers, 'etag') ?? source.etag,
      lastModified: header(fetched.headers, 'last-modified') ?? source.lastModified,
      notModified: true,
    };
  return {
    articles: parseFeed(fetched.body, source.contentPolicy),
    etag: header(fetched.headers, 'etag'),
    lastModified: header(fetched.headers, 'last-modified'),
    notModified: false,
  };
}

interface FetchResult {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
}

async function fetchFeed(
  source: SourceForCollection,
  options: CollectOptions,
): Promise<FetchResult> {
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const url = validateFeedUrl(source.feedUrl, source.allowedHosts);
  const lookup = options.lookup ?? dnsLookup;
  let addresses: Array<{ address: string; family: number }>;
  const host = url.hostname.replace(/^\[|\]$/g, '');
  try {
    if (isIP(host)) addresses = [{ address: host, family: isIP(host) }];
    else {
      const remaining = Math.max(1, deadline - Date.now());
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        addresses = await Promise.race([
          lookup(host, { all: true, verbatim: true }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new FeedCollectionError('Feed request timed out', 'timeout')),
              remaining,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
  } catch (error) {
    if (error instanceof FeedCollectionError) throw error;
    throw new FeedCollectionError('Feed host DNS lookup failed', 'dns_failed');
  }
  const pinned = addresses.at(0);
  if (!pinned || addresses.some(({ address }) => !isPublicAddress(address)))
    throw new FeedCollectionError('Feed host resolves to a non-public address', 'unsafe_dns');

  return new Promise((resolve, reject) => {
    const requestFn = options.request ?? httpsRequest;
    let settled = false;
    let requestHandle: ReturnType<typeof httpsRequest> | undefined;
    const timer = setTimeout(
      () => requestHandle?.destroy(new FeedCollectionError('Feed request timed out', 'timeout')),
      Math.max(1, deadline - Date.now()),
    );
    const finish = () => {
      clearTimeout(timer);
      settled = true;
    };
    const fail = (error: Error) => {
      if (!settled) {
        finish();
        reject(error);
      }
    };
    let req: ReturnType<typeof httpsRequest>;
    try {
      req = requestFn(
        {
          protocol: 'https:',
          hostname: pinned.address,
          family: pinned.family,
          port: 443,
          path: `${url.pathname}${url.search}`,
          method: 'GET',
          servername: host,
          headers: {
            Host: url.host,
            Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9',
            'User-Agent': 'MadarFeedCollector/1.0',
            ...(source.etag ? { 'If-None-Match': source.etag } : {}),
            ...(source.lastModified ? { 'If-Modified-Since': source.lastModified } : {}),
          },
          timeout: Math.max(1, deadline - Date.now()),
          rejectUnauthorized: true,
          checkServerIdentity: (_name, certificate) => checkServerIdentity(host, certificate),
        },
        (res) => {
          const status = res.statusCode ?? 0;
          if (status >= 300 && status < 400 && status !== 304) {
            fail(new FeedCollectionError('Feed redirects are not allowed', 'redirect_rejected'));
            res.destroy();
            return;
          }
          if (status === 304) {
            res.resume();
            finish();
            resolve({ status, headers: res.headers, body: '' });
            return;
          }
          if (status !== 200) {
            fail(new FeedCollectionError(`Feed returned HTTP ${status}`, 'http_error'));
            res.destroy();
            return;
          }
          const chunks: Buffer[] = [];
          let bytes = 0;
          const max = options.maxBytes ?? MAX_BYTES;
          const declared = Number(res.headers['content-length']);
          if (Number.isFinite(declared) && declared > max) {
            fail(new FeedCollectionError('Feed exceeds size limit', 'too_large'));
            res.destroy();
            return;
          }
          res.on('data', (chunk: Buffer | string) => {
            const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
            bytes += buffer.length;
            if (bytes > max) {
              fail(new FeedCollectionError('Feed exceeds size limit', 'too_large'));
              res.destroy();
              return;
            }
            chunks.push(buffer);
          });
          res.on('end', () => {
            if (!settled) {
              finish();
              resolve({
                status,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf8'),
              });
            }
          });
          res.on('error', (e) =>
            fail(new FeedCollectionError(`Feed response failed: ${e.message}`, 'request_failed')),
          );
        },
      );
    } catch (error) {
      fail(
        error instanceof FeedCollectionError
          ? error
          : new FeedCollectionError(
              `Feed request failed: ${error instanceof Error ? error.message : String(error)}`,
              'request_failed',
            ),
      );
      return;
    }
    requestHandle = req;
    req.on('timeout', () =>
      req.destroy(new FeedCollectionError('Feed request timed out', 'timeout')),
    );
    req.on('error', (e) =>
      fail(
        e instanceof FeedCollectionError
          ? e
          : new FeedCollectionError(`Feed request failed: ${e.message}`, 'request_failed'),
      ),
    );
    req.end();
  });
}

function validateFeedUrl(raw: string, allowedHosts: string[]): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FeedCollectionError('Invalid feed URL', 'invalid_url');
  }
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');
  const allow = allowedHosts.map((value) => value.toLowerCase().replace(/\.$/, ''));
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    !allow.includes(host)
  ) {
    throw new FeedCollectionError(
      'Feed URL must use HTTPS on an explicitly allowed host and port 443',
      'unsafe_url',
    );
  }
  if (isIP(host) && !isPublicAddress(host))
    throw new FeedCollectionError('Feed URL has a non-public IP address', 'unsafe_url');
  url.hash = '';
  return url;
}

function isPublicAddress(value: string): boolean {
  try {
    return ipaddr.parse(value).range() === 'unicast';
  } catch {
    return false;
  }
}

function articleUrl(item: Record<string, unknown>): string | null {
  const raw = child(item, 'link');
  let candidate: string | null = null;
  if (typeof raw === 'string') candidate = raw;
  else if (Array.isArray(raw)) {
    const links = raw.map(asRecord).filter((v): v is Record<string, unknown> => !!v);
    const chosen =
      links.find((l) => l['@_rel'] === 'alternate') ??
      links.find((l) => typeof l['@_href'] === 'string');
    candidate = chosen ? String(chosen['@_href'] ?? '') : null;
  } else {
    const record = asRecord(raw);
    if (record) candidate = typeof record['@_href'] === 'string' ? record['@_href'] : null;
  }
  return safeCanonicalUrl(candidate);
}

function safeCanonicalUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      (url.port && url.port !== '443')
    )
      return null;
    const host = url.hostname
      .toLowerCase()
      .replace(/^\[|\]$/g, '')
      .replace(/\.$/, '');
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      (isIP(host) && !isPublicAddress(host))
    )
      return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown): string {
  const text = flattenText(value)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ');
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

function flattenText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(flattenText).join(' ');
  const record = asRecord(value);
  if (!record) return '';
  return Object.entries(record)
    .filter(([key]) => key === '#text' || !key.startsWith('@_'))
    .map(([, child]) => flattenText(child))
    .join(' ');
}

function decodeEntities(input: string): string {
  return input.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower === 'amp') return '&';
    if (lower === 'lt') return '<';
    if (lower === 'gt') return '>';
    if (lower === 'quot') return '"';
    if (lower === 'apos') return "'";
    if (lower === 'nbsp') return ' ';
    const code = lower.startsWith('#x')
      ? parseInt(lower.slice(2), 16)
      : parseInt(lower.slice(1), 10);
    return Number.isInteger(code) && code > 0 && code <= 0x10ffff
      ? String.fromCodePoint(code)
      : all;
  });
}

function parseDate(value: unknown): string | null {
  const raw = cleanText(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function asArray(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function localName(name: string): string {
  return name.split(':').pop()?.toLowerCase() ?? '';
}
function child(record: Record<string, unknown>, key: string): unknown {
  if (Object.hasOwn(record, key)) return record[key];
  const prefixed = Object.keys(record).find(
    (candidate) => localName(candidate) === key.toLowerCase(),
  );
  return prefixed ? record[prefixed] : undefined;
}
function header(headers: IncomingHttpHeaders, name: string): string | null {
  const value = headers[name];
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
