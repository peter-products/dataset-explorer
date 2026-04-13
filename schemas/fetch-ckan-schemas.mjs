// Fetches dataset schemas from a CKAN portal (data.gov, etc.)
// Usage: node fetch-ckan-schemas.mjs <base-url> <output-file> <query> [rows] [start]
// Example: node fetch-ckan-schemas.mjs https://catalog.data.gov us-federal-datagov.jsonl "washington state" 100 0

import fs from 'fs';

const baseUrl = process.argv[2] || 'https://catalog.data.gov';
const outputFile = process.argv[3] || 'ckan-output.jsonl';
const query = process.argv[4] || '*:*';
const rows = parseInt(process.argv[5] || '100');
const start = parseInt(process.argv[6] || '0');

const API = `${baseUrl}/api/3/action/package_search`;

const formatMap = {
  'csv': 'csv', 'CSV': 'csv',
  'json': 'json', 'JSON': 'json', 'geojson': 'geojson', 'GeoJSON': 'geojson',
  'xml': 'xml', 'XML': 'xml',
  'shp': 'shapefile', 'Shapefile': 'shapefile',
  'kml': 'kml', 'KML': 'kml',
  'xlsx': 'xlsx', 'xls': 'xlsx',
  'pdf': 'pdf', 'PDF': 'pdf',
  'api': 'api', 'API': 'api',
  'html': 'html', 'HTML': 'html',
  'wms': 'wms', 'WMS': 'wms',
  'wfs': 'wfs', 'WFS': 'wfs',
};

function guessDomain(tags, title, notes, org) {
  const text = [...tags, title || '', notes || '', org || ''].join(' ').toLowerCase();
  if (text.match(/health|hospital|disease|vital|medicare|medicaid|cdc|fda|nih/)) return 'health';
  if (text.match(/education|school|student|university|college/)) return 'education';
  if (text.match(/transport|road|traffic|highway|bridge|aviation|transit|rail/)) return 'transportation';
  if (text.match(/environment|air quality|water quality|pollution|epa|climate|weather/)) return 'environment';
  if (text.match(/forest|fish|wildlife|habitat|species|conservation|land/)) return 'natural_resources';
  if (text.match(/crime|police|safety|prison|correction|fbi|justice/)) return 'public_safety';
  if (text.match(/election|voter|campaign|politic/)) return 'elections';
  if (text.match(/tax|budget|revenue|expenditure|financ|econom|employ|labor|wage/)) return 'finance';
  if (text.match(/census|population|demographic|housing/)) return 'demographics';
  if (text.match(/energy|power|electric|solar|wind|oil|gas|nuclear/)) return 'energy';
  if (text.match(/agriculture|farm|crop|food|usda/)) return 'agriculture';
  if (text.match(/geospatial|gis|boundary|parcel|map|geographic/)) return 'demographics';
  return 'unknown';
}

function guessGeo(extras, org, title) {
  const text = [org || '', title || '', JSON.stringify(extras || {})].join(' ').toLowerCase();
  if (text.match(/washington state|wa\.gov|data\.wa\.gov/)) return { scope: 'wa_state', detail: 'Washington State' };
  if (text.match(/king county/)) return { scope: 'wa_county', detail: 'King County, WA' };
  if (text.match(/seattle/)) return { scope: 'wa_city', detail: 'Seattle, WA' };
  if (text.match(/national|united states|federal|us census|usa/)) return { scope: 'us_national', detail: null };
  if (text.match(/global|world|international/)) return { scope: 'global', detail: null };
  return { scope: 'varies', detail: null };
}

function buildRecord(pkg) {
  const resources = pkg.resources || [];
  const formats = [...new Set(resources.map(r => formatMap[(r.format || '').trim()] || null).filter(Boolean))];
  const tags = (pkg.tags || []).map(t => t.name || t.display_name || '');
  const org = pkg.organization ? pkg.organization.title : '';
  const geo = guessGeo(pkg.extras, org, pkg.title);

  // Try to find an API endpoint
  const apiResource = resources.find(r =>
    (r.format || '').toLowerCase() === 'api' ||
    (r.url || '').includes('/api/') ||
    (r.url || '').includes('FeatureServer') ||
    (r.url || '').includes('MapServer')
  );

  return {
    id: `datagov:${pkg.id}`,
    name: pkg.title || pkg.name,
    provider: org,
    source_portal: 'catalog.data.gov',
    source_platform: 'ckan',
    url: `https://catalog.data.gov/dataset/${pkg.name || pkg.id}`,
    api_endpoint: apiResource ? apiResource.url : null,
    documentation_url: pkg.url || `https://catalog.data.gov/dataset/${pkg.name || pkg.id}`,
    access_method: apiResource ? 'api' : (formats.includes('csv') || formats.includes('json') ? 'download' : 'download'),
    format: formats.length > 0 ? formats : ['unknown'],
    geographic_scope: geo.scope,
    geographic_detail: geo.detail,
    domain: guessDomain(tags, pkg.title, pkg.notes, org),
    category: (pkg.groups && pkg.groups[0]) ? pkg.groups[0].title : null,
    update_frequency: guessFrequency(pkg.extras),
    row_count: null,
    column_count: null,
    columns: [],
    tags,
    description: (pkg.notes || '').replace(/<[^>]*>/g, '').slice(0, 500),
    last_updated: pkg.metadata_modified || null,
    created_at: pkg.metadata_created || null,
    license: pkg.license_title || null,
    collected_at: new Date().toISOString(),
  };
}

function guessFrequency(extras) {
  if (!extras) return 'unknown';
  const freq = extras.find(e => e.key === 'accrualPeriodicity');
  if (!freq) return 'unknown';
  const v = String(freq.value).toLowerCase();
  if (v.includes('r/p1d') || v.includes('daily')) return 'daily';
  if (v.includes('r/p1w') || v.includes('weekly')) return 'weekly';
  if (v.includes('r/p1m') || v.includes('monthly')) return 'monthly';
  if (v.includes('r/p3m') || v.includes('quarterly')) return 'quarterly';
  if (v.includes('r/p1y') || v.includes('annual')) return 'annual';
  return 'unknown';
}

async function fetchBatch(q, rows, start) {
  const url = `${API}?q=${encodeURIComponent(q)}&rows=${rows}&start=${start}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`CKAN API error: ${res.status}`);
  const data = await res.json();
  return data.result;
}

async function main() {
  console.log(`Fetching from ${baseUrl} | query: "${query}" | rows: ${rows} | start: ${start}`);

  const result = await fetchBatch(query, rows, start);
  console.log(`Total matching: ${result.count} | Fetched: ${result.results.length}`);

  const records = result.results.map(buildRecord);
  const outputPath = `D:/Projects/wa-data-catalog/schemas/${outputFile}`;
  const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(outputPath, lines);

  console.log(`Wrote ${records.length} records to ${outputFile}`);
  if (start + rows < result.count) {
    console.log(`Next: node fetch-ckan-schemas.mjs "${baseUrl}" ${outputFile} "${query}" ${rows} ${start + rows}`);
  } else {
    console.log('DONE');
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
