import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { getSource, type Pool, recordCollection, recordFailure } from '@madar/db';
import { collectFeed, FeedCollectionError } from '@madar/ingestion';

export async function processSource(
  pool: Pool,
  sourceId: string,
  options: { networkEnabled: boolean; production: boolean; fixtureXml?: string },
) {
  const source = await getSource(pool, sourceId);
  if (!source) throw new Error('SOURCE_NOT_FOUND');
  const startedAt = new Date();
  try {
    if (options.production && source.kind === 'fixture')
      throw new Error('FIXTURE_DISABLED_IN_PRODUCTION');
    const fixtureXml =
      source.kind === 'fixture'
        ? (options.fixtureXml ?? (await readFile(resolve('fixtures/demo-feed.xml'), 'utf8')))
        : undefined;
    const result = await collectFeed(source, {
      networkEnabled: options.networkEnabled,
      fixtureXml,
    });
    return await recordCollection(pool, sourceId, result, startedAt);
  } catch (error) {
    const candidate =
      error instanceof FeedCollectionError
        ? error.code.toUpperCase()
        : error instanceof Error
          ? error.message
          : '';
    const code = /^[A-Z_]{3,80}$/.test(candidate) ? candidate : 'COLLECTION_FAILED';
    await recordFailure(pool, sourceId, startedAt, code);
    // Queue output/logs must not contain raw URLs or network error details.
    throw new Error(code);
  }
}
