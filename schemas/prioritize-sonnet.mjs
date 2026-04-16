// Prioritize datasets for Sonnet enrichment — national/broad audience focus
// Outputs: sonnet-priority-10k.jsonl (top 10K) and sonnet-candidates-all.jsonl (ranked full list)

import fs from 'fs';
import path from 'path';

const FINAL = 'D:/Projects/wa-data-catalog/schemas/final';
const OUT_PRIORITY = 'D:/Projects/wa-data-catalog/schemas/sonnet-priority-10k.jsonl';
const OUT_ALL = 'D:/Projects/wa-data-catalog/schemas/sonnet-candidates-all.jsonl';

// Tier weights — higher = more likely to surface in national search
const TIER = {
  // Tier 1: federal / authoritative national (weight 100)
  1: [/^datagov-/, /^us-federal-/, /^nlm-nih/, /^who-gho/, /^eurostat/, /^worldbank/,
      /^faostat/, /^ilo-unesco/, /^un-sdg/, /^sec-edgar/, /^nj-health/, /^ny-health/,
      /^usac/, /^ca-controller/, /^la-controller/, /^maryland-internal/],
  // Tier 2: state + national curated (weight 70)
  2: [/^california/, /^new-jersey/, /^new-brunswick/, /^nova-scotia/, /^ny-state/, /^texas/,
      /^pennsylvania/, /^utah/, /^oregon/, /^michigan/, /^iowa/, /^connecticut/, /^delaware/,
      /^illinois-edp/, /^missouri/, /^vermont/, /^va\.jsonl/, /^wa-gov/, /^wa-geo/,
      /^wa-dnr/, /^wa-wdfw/, /^france/, /^italy/, /^canada/, /^colombia/,
      /^aws-opendata/, /^azure/, /^bigquery/, /^kaggle-top/, /^huggingface-top1000/],
  // Tier 3: major metros (weight 50)
  3: [/^nyc/, /^los-angeles/, /^chicago/, /^seattle/, /^austin/, /^miami/, /^honolulu/,
      /^new-orleans/, /^san-diego/, /^oakland/, /^orlando/, /^kansas-city/, /^richmond/,
      /^pittsburgh/, /^cincinnati/, /^calgary/, /^edmonton/, /^winnipeg/, /^vancouver/,
      /^boston/, /^philadelphia/, /^detroit/, /^denver/, /^minneapolis/, /^portland/],
  // Tier 4: secondary cities + GTFS + remaining (weight 30)
  4: [/^gtfs-transitland/, /^bay-area-metro/, /^king-county\.jsonl/, /^santa-clara/, /^san-mateo/,
      /^montgomery-county-md/, /^howard-county-md/, /^prince-georges/, /^fulton-county-ga/,
      /^marin-county/, /^ramsey-county-mn/, /^macoupin/, /^san-diego-county/, /^providence/,
      /^somerville/, /^berkeley/, /^cambridge/, /^plano/, /^fort-worth/, /^norfolk/],
};

function fileTier(filename) {
  for (const [tier, regexes] of Object.entries(TIER)) {
    if (regexes.some(re => re.test(filename))) return parseInt(tier);
  }
  // arcgis county = very local
  if (/-arcgis\.jsonl$/.test(filename)) return 6;
  return 5; // default — smaller/regional
}

const TIER_WEIGHT = { 1: 100, 2: 70, 3: 50, 4: 30, 5: 15, 6: 5 };

function scoreRecord(r, tierWeight) {
  let score = tierWeight;
  if (r.columns?.length > 0) score += 10;
  if (r.columns?.length > 10) score += 10;
  if (r.description && r.description.length > 50) score += 5;
  if (r.tags?.length > 5) score += 3;
  if (r.api_endpoint) score += 5;
  if (r.geographic_scope && ['national', 'global', 'multi-national'].includes(r.geographic_scope.toLowerCase())) score += 15;
  return score;
}

const all = [];
const files = fs.readdirSync(FINAL).filter(f => f.endsWith('.jsonl'));

for (const f of files) {
  const tier = fileTier(f);
  const tw = TIER_WEIGHT[tier];
  const lines = fs.readFileSync(path.join(FINAL, f), 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let r; try { r = JSON.parse(lines[i]); } catch { continue; }
    if (r.enrichment_model === 'sonnet') continue; // already done
    const score = scoreRecord(r, tw);
    all.push({
      id: r.id,
      file: f,
      line_idx: i,
      name: (r.name || '').slice(0, 100),
      publisher: (r.publisher_normalized || r.publisher || '').slice(0, 60),
      tier,
      score,
      has_cols: (r.columns?.length || 0) > 0,
      has_desc: !!(r.description && r.description.length > 20)
    });
  }
}

// Sort by score desc, then tier asc
all.sort((a, b) => b.score - a.score || a.tier - b.tier);

// Write top 10K
const top = all.slice(0, 10000);
fs.writeFileSync(OUT_PRIORITY, top.map(r => JSON.stringify(r)).join('\n') + '\n');
fs.writeFileSync(OUT_ALL, all.map(r => JSON.stringify(r)).join('\n') + '\n');

// Summary by tier in top 10K
const summary = {};
for (const r of top) summary[r.tier] = (summary[r.tier] || 0) + 1;
console.log('Total un-sonnet:', all.length);
console.log('Top 10K tier breakdown:', summary);
console.log(`Wrote ${OUT_PRIORITY} and ${OUT_ALL}`);

// Top files in priority list
const byFile = {};
for (const r of top) byFile[r.file] = (byFile[r.file] || 0) + 1;
console.log('Top source files in priority 10K:');
Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([f, n]) => console.log(`  ${f}: ${n}`));
