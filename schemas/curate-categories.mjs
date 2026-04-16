import fs from 'fs';
import readline from 'readline';

const META = 'search-app/data/metadata.jsonl';
const OUT = 'search-app/data/curated-browse.json';

const CATEGORIES = ['health', 'education', 'finance', 'environment', 'transportation', 'demographics'];
const PER_CAT = 200;

const TIER1_SOURCES = /^(datagov-|us-federal-|nlm-nih|who-gho|eurostat|worldbank|faostat|un-sdg|sec-edgar|usac)/;
const TIER2_SOURCES = /^(ny-state|nyc|texas|california|canada|utah|seattle|chicago|los-angeles|connecticut|oregon|michigan|iowa|france|italy)/;

function scoreRecord(r) {
  let score = 0;
  const src = r.source || '';
  if (TIER1_SOURCES.test(src)) score += 50;
  else if (TIER2_SOURCES.test(src)) score += 30;
  else score += 10;

  if (r.columns?.length > 5) score += 25;
  else if (r.columns?.length > 0) score += 15;

  const summary = r.summary || '';
  if (summary.length > 80) score += 15;
  else if (summary.length > 30) score += 8;

  if (r.api_endpoint) score += 10;
  if (r.update_frequency && r.update_frequency !== 'unknown') score += 5;
  if (r.geographic_scope && !['unknown', 'varies'].includes(r.geographic_scope)) score += 5;

  const name = String(r.name || '').toLowerCase();
  if (/^[a-z]/.test(name) && name.length > 10 && name.length < 120) score += 5;
  if (/untitled|test|copy|backup|temp/i.test(name)) score -= 30;

  return score;
}

(async () => {
  const byDomain = {};
  for (const c of CATEGORIES) byDomain[c] = [];

  const rl = readline.createInterface({ input: fs.createReadStream(META) });
  let idx = 0;
  for await (const line of rl) {
    if (!line.trim()) { idx++; continue; }
    const d = JSON.parse(line);
    if (byDomain[d.domain]) {
      byDomain[d.domain].push({ idx, score: scoreRecord(d), id: d.id, name: d.name, source: d.source, publisher: d.publisher });
    }
    idx++;
  }

  const curated = {};
  for (const [domain, records] of Object.entries(byDomain)) {
    records.sort((a, b) => b.score - a.score);
    const selected = [];
    const sourceCount = {};
    const MAX_PER_PUB = 20;
    for (const r of records) {
      if (selected.length >= PER_CAT) break;
      const pub = (r.publisher || r.source || 'unknown').slice(0, 60);
      sourceCount[pub] = (sourceCount[pub] || 0) + 1;
      if (sourceCount[pub] > MAX_PER_PUB) continue;
      selected.push(r);
    }
    curated[domain] = selected.map(r => r.idx);
    const sources = Object.keys(sourceCount).filter(s => sourceCount[s] > 0).length;
    console.log(`${domain}: ${selected.length} picked from ${sources} sources`);
  }

  fs.writeFileSync(OUT, JSON.stringify(curated));
  console.log(`Wrote ${OUT}`);
})();
