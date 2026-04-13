// Fetches World Bank indicator metadata
// 29K+ indicators across 71 data sources
import fs from 'fs';

const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/worldbank.jsonl';

async function fetchIndicators(page, perPage) {
  const url = `https://api.worldbank.org/v2/indicators?format=json&per_page=${perPage}&page=${page}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  const data = await res.json();
  return { total: data[0].total, pages: data[0].pages, indicators: data[1] || [] };
}

async function fetchSources() {
  const res = await fetch('https://api.worldbank.org/v2/sources?format=json&per_page=100');
  const data = await res.json();
  return (data[1] || []).reduce((m, s) => { m[s.id] = s.name; return m; }, {});
}

function guessDomain(topic, name) {
  const text = (topic + ' ' + name).toLowerCase();
  if (text.match(/health|mortality|life expect|disease|nutrition|sanitation|hiv|malaria/)) return 'health';
  if (text.match(/education|school|literacy|enrollment|teacher/)) return 'education';
  if (text.match(/environment|emission|co2|forest|water|climate|pollution|energy/)) return 'environment';
  if (text.match(/economy|gdp|gni|trade|export|import|inflation|debt|fiscal/)) return 'finance';
  if (text.match(/population|birth|death|fertility|migration|urban|rural/)) return 'demographics';
  if (text.match(/labor|employ|unemploy|workforce|wage/)) return 'labor';
  if (text.match(/agriculture|crop|land|food|cereal/)) return 'agriculture';
  if (text.match(/infrastructure|transport|road|rail|port|internet|phone/)) return 'transportation';
  if (text.match(/govern|rule of law|corruption|regulation|politic/)) return 'elections';
  if (text.match(/poverty|inequality|gini|income/)) return 'finance';
  if (text.match(/gender|women|female/)) return 'demographics';
  return 'unknown';
}

async function main() {
  const sources = await fetchSources();
  console.log(`Fetched ${Object.keys(sources).length} World Bank sources`);

  fs.writeFileSync(OUTPUT, '');
  let totalWritten = 0;

  const { total, pages } = await fetchIndicators(1, 1);
  console.log(`Total indicators: ${total} across ${pages} pages`);

  const PER_PAGE = 500;
  const totalPages = Math.ceil(total / PER_PAGE);

  for (let page = 1; page <= totalPages; page++) {
    const { indicators } = await fetchIndicators(page, PER_PAGE);

    const records = indicators.map(ind => ({
      id: `worldbank:${ind.id}`,
      name: ind.name,
      provider: 'World Bank',
      source_portal: 'data.worldbank.org',
      source_platform: 'api',
      url: `https://data.worldbank.org/indicator/${ind.id}`,
      api_endpoint: `https://api.worldbank.org/v2/country/all/indicator/${ind.id}?format=json`,
      documentation_url: `https://data.worldbank.org/indicator/${ind.id}`,
      access_method: 'api',
      format: ['json', 'csv', 'xml'],
      geographic_scope: 'global',
      geographic_detail: null,
      domain: guessDomain(ind.source?.value || '', ind.name),
      category: ind.source?.value || null,
      update_frequency: 'annual',
      row_count: null,
      column_count: 4,
      columns: [
        { name: 'country', field_name: 'country', type: 'text', description: 'Country name and ISO code' },
        { name: 'date', field_name: 'date', type: 'date', description: 'Year' },
        { name: 'value', field_name: 'value', type: 'number', description: 'Indicator value' },
        { name: 'indicator', field_name: 'indicator', type: 'text', description: 'Indicator ID and name' },
      ],
      tags: (ind.topics || []).map(t => t.value).filter(Boolean),
      description: (ind.sourceNote || '').slice(0, 500),
      last_updated: null,
      created_at: null,
      collected_at: new Date().toISOString(),
    }));

    fs.appendFileSync(OUTPUT, records.map(r => JSON.stringify(r)).join('\n') + '\n');
    totalWritten += records.length;
    console.log(`  Page ${page}/${totalPages}: ${records.length} indicators (${totalWritten} total)`);
  }

  console.log(`Done. Wrote ${totalWritten} World Bank indicator records`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
