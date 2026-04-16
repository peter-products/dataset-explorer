import fs from 'fs';
import readline from 'readline';
import { setTimeout as sleep } from 'timers/promises';

const META = 'search-app/data/metadata.jsonl';
const OUT = 'schemas/backfill-canada.jsonl';
const CHECKPOINT = 'schemas/backfill-canada-checkpoint.json';
const CONCURRENCY = 10;
const RETRY = 2;
const API = 'https://open.canada.ca/data/api/action/package_show?id=';

async function collectIds() {
  const ids = [];
  const rl = readline.createInterface({ input: fs.createReadStream(META) });
  for await (const line of rl) {
    const d = JSON.parse(line);
    if (d.source_platform === 'ckan' && d.id?.startsWith('canada:') && !(d.columns?.length)) {
      ids.push(d.id.slice('canada:'.length));
    }
  }
  return ids;
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

async function fetchOne(uuid) {
  for (let attempt = 0; attempt <= RETRY; attempt++) {
    try {
      const res = await fetch(API + uuid, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        if (res.status === 404) return { uuid, status: 404 };
        throw new Error('HTTP ' + res.status);
      }
      const j = await res.json();
      if (!j.success) return { uuid, status: 'api_fail' };
      const pkg = j.result;
      const resources = (pkg.resources || []).map(r => ({
        name: r.name || r.name_translated?.en || '',
        format: r.format || '',
        url: r.url || '',
        fields: r.fields || r.schema?.fields || null
      }));
      const columns = [];
      for (const r of resources) {
        if (Array.isArray(r.fields)) {
          for (const f of r.fields) {
            const n = typeof f === 'string' ? f : (f.id || f.name);
            if (n && !columns.find(c => c.name === n)) columns.push({ name: n, type: f.type || '' });
          }
        }
      }
      return { uuid, resources, columns, status: 'ok' };
    } catch (e) {
      if (attempt === RETRY) return { uuid, status: 'err', error: String(e).slice(0, 100) };
      await sleep(500 * (attempt + 1));
    }
  }
}

async function worker(queue, out) {
  while (queue.length) {
    const uuid = queue.shift();
    if (!uuid) continue;
    const r = await fetchOne(uuid);
    out.write(JSON.stringify(r) + '\n');
  }
}

(async () => {
  const allIds = await collectIds();
  const done = loadDone();
  const todo = allIds.filter(id => !done.has(id));
  console.log(`Total canada ids missing: ${allIds.length}, already done: ${done.size}, remaining: ${todo.length}`);
  fs.writeFileSync(CHECKPOINT, JSON.stringify({ total: allIds.length, done: done.size, remaining: todo.length, started: new Date().toISOString() }));

  const out = fs.createWriteStream(OUT, { flags: 'a' });
  const queue = [...todo];
  const progress = setInterval(() => {
    fs.writeFileSync(CHECKPOINT, JSON.stringify({ total: allIds.length, remaining: queue.length, processed: allIds.length - queue.length, updated: new Date().toISOString() }));
  }, 10000);

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue, out)));

  clearInterval(progress);
  out.end();
  fs.writeFileSync(CHECKPOINT, JSON.stringify({ total: allIds.length, done: allIds.length, finished: new Date().toISOString() }));
  console.log('Done.');
})();
