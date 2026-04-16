import fs from 'fs';
import readline from 'readline';

const META = 'search-app/data/metadata.jsonl.bak';
const OUT = 'schemas/backfill-aws.jsonl';
const CONCURRENCY = 10;
const BASE = 'https://raw.githubusercontent.com/awslabs/open-data-registry/main/datasets/';

async function collectSlugs() {
  const slugs = [];
  const rl = readline.createInterface({ input: fs.createReadStream(META) });
  for await (const line of rl) {
    const d = JSON.parse(line);
    if (d.source_platform === 'aws' && !(d.columns?.length) && d.id?.startsWith('aws-opendata:')) {
      slugs.push(d.id.slice('aws-opendata:'.length));
    }
  }
  return slugs;
}

async function fetchOne(slug) {
  try {
    const res = await fetch(BASE + slug + '.yaml', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { slug, status: res.status };
    const text = await res.text();
    const descMatch = text.match(/Description:\s*['"]?([\s\S]{0,2000}?)(?:\n[A-Z]|$)/);
    const desc = descMatch ? descMatch[1].trim() : '';
    // Look for column-like patterns in description
    const colHints = [];
    const bulletRe = /^\s*[-*]\s+`([^`]+)`/gm;
    let m;
    while ((m = bulletRe.exec(text)) !== null) colHints.push(m[1]);
    return { slug, status: 'ok', description: desc.slice(0, 1500), column_hints: colHints };
  } catch (e) { return { slug, status: 'err', error: String(e).slice(0, 100) }; }
}

async function worker(queue, out) {
  while (queue.length) {
    const s = queue.shift();
    if (!s) continue;
    const r = await fetchOne(s);
    out.write(JSON.stringify(r) + '\n');
  }
}

(async () => {
  const slugs = await collectSlugs();
  console.log('AWS slugs to process:', slugs.length);
  const out = fs.createWriteStream(OUT, { flags: 'w' });
  const queue = [...slugs];
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue, out)));
  out.end();
  console.log('Done.');
})();
