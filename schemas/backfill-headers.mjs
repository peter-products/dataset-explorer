import fs from 'fs';
import readline from 'readline';
import { setTimeout as sleep } from 'timers/promises';

const IN = 'schemas/backfill-canada.jsonl';
const OUT = 'schemas/backfill-columns.jsonl';
const CHECKPOINT = 'schemas/backfill-columns-checkpoint.json';
const CONCURRENCY = 10;
const RETRY = 1;
const SMALL = 2048;
const BIG = 8192;

function parseCsvHeader(text) {
  const nl = text.indexOf('\n');
  if (nl < 0) return null;
  let line = text.slice(0, nl).replace(/\r$/, '');
  if (line.charCodeAt(0) === 0xFEFF) line = line.slice(1);
  // naive split honoring quotes
  const cols = [];
  let cur = '', inq = false;
  for (const ch of line) {
    if (ch === '"') { inq = !inq; continue; }
    if ((ch === ',' || ch === '\t' || ch === ';') && !inq) {
      cols.push(cur.trim()); cur = '';
    } else cur += ch;
  }
  cols.push(cur.trim());
  if (cols.length < 2) return null;
  return cols.map(n => ({ name: n, type: '' }));
}

function parseJsonKeys(text) {
  try {
    // try to find first object
    const m = text.match(/\{[^{}]*\}/);
    if (!m) return null;
    const obj = JSON.parse(m[0]);
    const keys = Object.keys(obj);
    if (!keys.length) return null;
    return keys.map(n => ({ name: n, type: '' }));
  } catch { return null; }
}

async function fetchRange(url, bytes) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Range: `bytes=0-${bytes - 1}`, 'User-Agent': 'SchemaFinder/1.0' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow'
    });
    if (!res.ok && res.status !== 206 && res.status !== 200) return null;
    const buf = await res.arrayBuffer();
    return new TextDecoder('utf-8', { fatal: false }).decode(buf);
  } catch { return null; }
}

async function extractColumns(resource) {
  const url = resource.url;
  if (!url) return null;
  const fmt = (resource.format || '').toUpperCase();
  const isCsv = /CSV|TSV/.test(fmt) || /\.(csv|tsv)(\?|$)/i.test(url);
  const isJson = /JSON/.test(fmt) || /\.json(\?|$)/i.test(url);
  if (!isCsv && !isJson) return null;

  let text = await fetchRange(url, SMALL);
  if (!text) return null;
  if (text.startsWith('PK') || /[\x00-\x08]/.test(text.slice(0, 20))) return null;
  let cols = isCsv ? parseCsvHeader(text) : parseJsonKeys(text);
  if (!cols && isCsv && text.indexOf('\n') < 0) {
    // retry larger
    text = await fetchRange(url, BIG);
    if (text) cols = parseCsvHeader(text);
  }
  return cols;
}

function loadDone() {
  try {
    const set = new Set();
    for (const line of fs.readFileSync(OUT, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      set.add(JSON.parse(line).uuid);
    }
    return set;
  } catch { return new Set(); }
}

async function processOne(rec) {
  // prefer CSV first, then JSON, then any
  const ranked = [...(rec.resources || [])].sort((a, b) => {
    const af = (a.format || '').toUpperCase(), bf = (b.format || '').toUpperCase();
    const score = f => /CSV/.test(f) ? 0 : /TSV/.test(f) ? 1 : /JSON/.test(f) ? 2 : 3;
    return score(af) - score(bf);
  });
  for (const r of ranked.slice(0, 5)) {
    const cols = await extractColumns(r);
    if (cols && cols.length) return { uuid: rec.uuid, columns: cols, source_url: r.url, format: r.format };
  }
  return { uuid: rec.uuid, columns: [], status: 'no_columns' };
}

async function worker(queue, out) {
  while (queue.length) {
    const rec = queue.shift();
    if (!rec) continue;
    for (let attempt = 0; attempt <= RETRY; attempt++) {
      try {
        const r = await processOne(rec);
        out.write(JSON.stringify(r) + '\n');
        break;
      } catch (e) {
        if (attempt === RETRY) out.write(JSON.stringify({ uuid: rec.uuid, status: 'err', error: String(e).slice(0, 100) }) + '\n');
        await sleep(500);
      }
    }
  }
}

(async () => {
  const all = [];
  const rl = readline.createInterface({ input: fs.createReadStream(IN) });
  for await (const line of rl) {
    const d = JSON.parse(line);
    if (d.status === 'ok' && d.resources?.length) all.push(d);
  }

  const done = loadDone();
  const todo = all.filter(r => !done.has(r.uuid));
  console.log(`Total: ${all.length}, done: ${done.size}, remaining: ${todo.length}`);

  const out = fs.createWriteStream(OUT, { flags: 'a' });
  const queue = [...todo];
  const interval = setInterval(() => {
    const processed = all.length - queue.length;
    fs.writeFileSync(CHECKPOINT, JSON.stringify({ total: all.length, processed, remaining: queue.length, updated: new Date().toISOString() }));
  }, 10000);

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue, out)));

  clearInterval(interval);
  out.end();
  fs.writeFileSync(CHECKPOINT, JSON.stringify({ total: all.length, processed: all.length, finished: new Date().toISOString() }));
  console.log('Done.');
})();
