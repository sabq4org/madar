import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const api = process.env.SMOKE_API_URL ?? 'http://127.0.0.1:4100';
const web = process.env.SMOKE_WEB_URL ?? 'http://127.0.0.1:3100';
let article;
for (let attempt = 0; attempt < 45; attempt++) {
  try {
    const ready = await fetch(`${api}/health/ready`, { signal: AbortSignal.timeout(2000) });
    if (ready.ok) {
      const response = await fetch(`${api}/v1/articles`, { signal: AbortSignal.timeout(2000) });
      const body = await response.json();
      article = body.data?.find((a) => a.isDemo);
      if (article) break;
    }
  } catch {}
  await setTimeout(1000);
}
assert.ok(article, 'Expected the worker to ingest a clearly marked demo article within45 seconds');
const html = await (await fetch(web, { signal: AbortSignal.timeout(5000) })).text();
assert.ok(html.includes(article.title), 'Web must render data from the runningAPI');
assert.ok(html.includes('تجريبي'), 'Web must mark demo content');
const detail = await fetch(`${web}/articles/${article.id}`, { signal: AbortSignal.timeout(5000) });
assert.equal(detail.status, 200);
const apiDetail = await (await fetch(`${api}/v1/articles/${article.id}`)).json();
assert.ok(apiDetail.revisions.length >= 1);
assert.equal((await fetch(`${web}/ibm-plex-sans-arabic.ttf`)).status, 200);
assert.equal((await fetch(`${web}/prototype.html`)).status, 200);
console.log('Smoke passed: queue → database → API → web, revisions, local font and prototype.');
