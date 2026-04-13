// Fetches Eurostat table of contents — all EU statistics datasets
// The TOC is a TSV file listing every dataset with metadata
import fs from 'fs';

const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/eurostat.jsonl';
const TOC_URL = 'https://ec.europa.eu/eurostat/api/dissemination/catalogue/toc/txt?lang=en';

function guessDomain(path, title) {
  const text = (path + ' ' + title).toLowerCase();
  if (text.match(/population|demograph|migrat|asylum|census/)) return 'demographics';
  if (text.match(/health|mortality|death|hospital|pharma|disability/)) return 'health';
  if (text.match(/education|train|school|student|graduate/)) return 'education';
  if (text.match(/transport|road|rail|air|maritime|freight|passenger/)) return 'transportation';
  if (text.match(/environment|emission|waste|water|air quality|climate|energy/)) return 'environment';
  if (text.match(/energy|electric|gas|oil|renewable|nuclear/)) return 'energy';
  if (text.match(/employ|unemploy|labour|labor|wage|earning|work/)) return 'labor';
  if (text.match(/gdp|trade|export|import|balance|inflation|price|debt|deficit|fiscal/)) return 'finance';
  if (text.match(/agriculture|crop|livestock|farm|fishery|forest/)) return 'agriculture';
  if (text.match(/crime|justice|prison|police|safety/)) return 'public_safety';
  if (text.match(/technology|digital|internet|broadband|ict|innovation|patent|science|research/)) return 'technology';
  if (text.match(/tourism|hotel|accommodation/)) return 'finance';
  if (text.match(/housing|construction|building|dwelling/)) return 'housing';
  return 'unknown';
}

async function main() {
  console.log('Fetching Eurostat table of contents...');
  const res = await fetch(TOC_URL);
  const text = await res.text();
  const lines = text.split('\n').filter(l => l.trim());

  console.log(`Total lines: ${lines.length}`);

  // Parse TSV: "title" "code" "type" "last update" "last structure change" "data start" "data end" "values"
  const records = [];
  let currentPath = [];

  for (let i = 1; i < lines.length; i++) { // skip header
    const parts = lines[i].split('\t').map(p => p.replace(/^"|"$/g, '').trim());
    if (parts.length < 3) continue;

    const [rawTitle, code, type, lastUpdate, , dataStart, dataEnd, values] = parts;

    // Track folder hierarchy for path
    const indent = rawTitle.match(/^(\s*)/)[1].length / 4;
    const title = rawTitle.trim();

    if (type === 'folder') {
      currentPath[indent] = title;
      currentPath = currentPath.slice(0, indent + 1);
      continue;
    }

    if (type !== 'table' && type !== 'dataset') continue;

    const pathStr = currentPath.join(' > ');

    records.push({
      id: `eurostat:${code}`,
      name: title,
      provider: 'Eurostat (European Commission)',
      source_portal: 'ec.europa.eu/eurostat',
      source_platform: 'api',
      url: `https://ec.europa.eu/eurostat/databrowser/view/${code}/default/table`,
      api_endpoint: `https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/${code}/?format=JSON`,
      documentation_url: `https://ec.europa.eu/eurostat/cache/metadata/${code}_esmsip2.htm`,
      access_method: 'api',
      format: ['json', 'csv', 'tsv', 'sdmx'],
      geographic_scope: 'global',
      geographic_detail: 'European Union + candidate countries',
      domain: guessDomain(pathStr, title),
      category: currentPath[0] || null,
      update_frequency: guessFreq(code),
      row_count: parseInt(values) || null,
      column_count: null,
      columns: [],
      tags: currentPath.filter(Boolean),
      description: `${title}. Path: ${pathStr}. Data period: ${dataStart || '?'} to ${dataEnd || '?'}.`,
      last_updated: lastUpdate || null,
      created_at: null,
      collected_at: new Date().toISOString(),
    });
  }

  fs.writeFileSync(OUTPUT, records.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(`Wrote ${records.length} Eurostat dataset records`);

  // Category breakdown
  const cats = {};
  records.forEach(r => { cats[r.domain] = (cats[r.domain] || 0) + 1; });
  Object.entries(cats).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => console.log(`  ${c}: ${n}`));
}

function guessFreq(code) {
  if (code.includes('_q') || code.endsWith('q')) return 'quarterly';
  if (code.includes('_m') || code.endsWith('m')) return 'monthly';
  if (code.includes('_a') || code.endsWith('a')) return 'annual';
  return 'unknown';
}

main().catch(err => { console.error(err.message); process.exit(1); });
