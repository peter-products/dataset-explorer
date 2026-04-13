// Fetches WHO Global Health Observatory indicator metadata
// 3000+ health indicators
import fs from 'fs';

const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/who-gho.jsonl';
const API = 'https://ghoapi.azureedge.net/api';

async function fetchIndicators() {
  const res = await fetch(`${API}/Indicator`, { signal: AbortSignal.timeout(30000) });
  const data = await res.json();
  return data.value || [];
}

function guessDomain(code, name) {
  const text = (code + ' ' + name).toLowerCase();
  if (text.match(/mortality|death|life expect|neonat/)) return 'health';
  if (text.match(/hiv|aids|tb|malaria|hepat|measles|polio/)) return 'health';
  if (text.match(/nutrition|stunting|wasting|overweight|obesity|breastfeed/)) return 'health';
  if (text.match(/water|sanitation|hygiene|wash/)) return 'environment';
  if (text.match(/air quality|pollution/)) return 'environment';
  if (text.match(/tobacco|alcohol|substance/)) return 'health';
  if (text.match(/workforce|health worker|physician|nurse|dentist/)) return 'labor';
  if (text.match(/expenditure|spending|finance|budget/)) return 'finance';
  if (text.match(/immuniz|vaccin/)) return 'health';
  return 'health'; // WHO is all health data
}

async function main() {
  console.log('Fetching WHO GHO indicators...');
  const indicators = await fetchIndicators();
  console.log(`Found ${indicators.length} indicators`);

  const records = indicators.map(ind => ({
    id: `who-gho:${ind.IndicatorCode}`,
    name: ind.IndicatorName,
    provider: 'World Health Organization',
    source_portal: 'gho.who.int',
    source_platform: 'api',
    url: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${encodeURIComponent(ind.IndicatorCode)}`,
    api_endpoint: `https://ghoapi.azureedge.net/api/${ind.IndicatorCode}`,
    documentation_url: `https://www.who.int/data/gho/data/indicators/indicator-details/GHO/${encodeURIComponent(ind.IndicatorCode)}`,
    access_method: 'api',
    format: ['json', 'csv'],
    geographic_scope: 'global',
    geographic_detail: null,
    domain: guessDomain(ind.IndicatorCode, ind.IndicatorName),
    category: 'global_health',
    update_frequency: 'annual',
    row_count: null,
    column_count: 6,
    columns: [
      { name: 'SpatialDim', field_name: 'SpatialDim', type: 'text', description: 'Country ISO code' },
      { name: 'TimeDim', field_name: 'TimeDim', type: 'date', description: 'Year' },
      { name: 'NumericValue', field_name: 'NumericValue', type: 'number', description: 'Indicator value' },
      { name: 'Dim1', field_name: 'Dim1', type: 'text', description: 'Disaggregation dimension 1 (e.g. sex)' },
      { name: 'Dim2', field_name: 'Dim2', type: 'text', description: 'Disaggregation dimension 2' },
      { name: 'Dim3', field_name: 'Dim3', type: 'text', description: 'Disaggregation dimension 3' },
    ],
    tags: [ind.Language || 'EN'],
    description: (ind.IndicatorName || '').slice(0, 500),
    last_updated: null,
    created_at: null,
    collected_at: new Date().toISOString(),
  }));

  fs.writeFileSync(OUTPUT, records.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(`Wrote ${records.length} WHO GHO indicator records`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
