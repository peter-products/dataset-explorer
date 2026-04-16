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
      byDomain[d.domain].push({ idx, score: scoreRecord(d), id: d.id, name: d.name });
    }
    idx++;
  }

  const curated = {};
  for (const [domain, records] of Object.entries(byDomain)) {
    records.sort((a, b) => b.score - a.score);
    const top = records.slice(0, PER_CAT);
    curated[domain] = top.map(r => r.idx);
    console.log(`${domain}: ${records.length} total, top score ${top[0]?.score}, min score ${top[top.length-1]?.score}`);
  }

  fs.writeFileSync(OUT, JSON.stringify(curated));
  console.log(`Wrote ${OUT}`);
})();
