// Fetches dataset schemas from an ArcGIS Hub / ArcGIS Open Data portal
// Usage: node fetch-arcgis-schemas.mjs <hub-url> <output-file>
// Example: node fetch-arcgis-schemas.mjs https://gis-kingcounty.opendata.arcgis.com king-county-arcgis.jsonl

import fs from 'fs';

const hubUrl = process.argv[2];
const outputFile = process.argv[3];

if (!hubUrl || !outputFile) {
  console.error('Usage: node fetch-arcgis-schemas.mjs <hub-url> <output-file>');
  process.exit(1);
}

// ArcGIS Hub uses the /api/v3/datasets endpoint (Hub API v3)
// Alternatively, /api/feed/dcat-us/1.1.json gives a DCAT catalog
const HUB_API = `${hubUrl.replace(/\/$/, '')}/api/v3/datasets`;
const DCAT_API = `${hubUrl.replace(/\/$/, '')}/api/feed/dcat-us/1.1.json`;

const typeMap = {
  'esriFieldTypeString': 'text',
  'esriFieldTypeInteger': 'number',
  'esriFieldTypeSmallInteger': 'number',
  'esriFieldTypeDouble': 'number',
  'esriFieldTypeSingle': 'number',
  'esriFieldTypeDate': 'date',
  'esriFieldTypeOID': 'number',
  'esriFieldTypeGlobalID': 'text',
  'esriFieldTypeGUID': 'text',
  'esriFieldTypeBlob': 'blob',
  'esriFieldTypeGeometry': 'geometry',
  'esriFieldTypeXML': 'text',
};

async function fetchDCAT() {
  console.log(`Fetching DCAT catalog from ${DCAT_API}...`);
  const res = await fetch(DCAT_API);
  if (!res.ok) throw new Error(`DCAT API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function fetchLayerMetadata(serviceUrl) {
  // Try to get field definitions from an ArcGIS REST service
  try {
    const url = `${serviceUrl}?f=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

function buildRecord(dcatDataset, hubDomain) {
  const dist = dcatDataset.distribution || [];
  const formats = dist.map(d => {
    const f = (d.mediaType || d.format || '').toLowerCase();
    if (f.includes('csv')) return 'csv';
    if (f.includes('json') || f.includes('geojson')) return 'geojson';
    if (f.includes('kml')) return 'kml';
    if (f.includes('shapefile') || f.includes('zip')) return 'shapefile';
    if (f.includes('xml')) return 'xml';
    return f;
  }).filter(Boolean);

  const apiDist = dist.find(d =>
    (d.accessURL || '').includes('FeatureServer') ||
    (d.accessURL || '').includes('MapServer')
  );

  const keywords = dcatDataset.keyword || [];
  const category = dcatDataset.theme ? dcatDataset.theme[0] : null;

  return {
    id: dcatDataset.identifier || null,
    name: dcatDataset.title || 'Untitled',
    provider: dcatDataset.publisher ? dcatDataset.publisher.name : hubDomain,
    source_portal: hubDomain,
    source_platform: 'arcgis',
    url: dcatDataset.landingPage || dcatDataset.accessLevel || null,
    api_endpoint: apiDist ? apiDist.accessURL : null,
    documentation_url: dcatDataset.landingPage || null,
    access_method: apiDist ? 'api' : 'download',
    format: [...new Set(formats)],
    geographic_scope: guessGeoScope(hubDomain),
    geographic_detail: guessGeoDetail(hubDomain),
    domain: guessDomain(keywords, category, dcatDataset.title),
    category: category,
    update_frequency: mapFrequency(dcatDataset.accrualPeriodicity),
    row_count: null,
    column_count: null,
    columns: [], // Will be populated if we can reach the service endpoint
    tags: keywords,
    description: (dcatDataset.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
    last_updated: dcatDataset.modified || null,
    created_at: dcatDataset.issued || null,
    collected_at: new Date().toISOString(),
  };
}

function guessGeoScope(domain) {
  if (domain.includes('wa.gov') || domain.includes('kingcounty') || domain.includes('seattle') || domain.includes('snoco') || domain.includes('piercecounty') || domain.includes('spokane')) return 'wa_state';
  return 'unknown';
}

function guessGeoDetail(domain) {
  if (domain.includes('kingcounty')) return 'King County, WA';
  if (domain.includes('seattle')) return 'Seattle, WA';
  if (domain.includes('snoco') || domain.includes('snohomish')) return 'Snohomish County, WA';
  if (domain.includes('piercecounty')) return 'Pierce County, WA';
  if (domain.includes('spokane')) return 'Spokane County, WA';
  if (domain.includes('geo.wa.gov') || domain.includes('wa-geoservices')) return 'Washington State';
  if (domain.includes('wsdot')) return 'Washington State (Transportation)';
  if (domain.includes('wadnr')) return 'Washington State (Natural Resources)';
  if (domain.includes('wdfw')) return 'Washington State (Fish & Wildlife)';
  return null;
}

function guessDomain(keywords, category, title) {
  const text = [...keywords, category || '', title || ''].join(' ').toLowerCase();
  if (text.match(/parcel|property|assessor|tax lot|zoning/)) return 'housing';
  if (text.match(/transport|road|traffic|bridge|ferry|transit/)) return 'transportation';
  if (text.match(/health|hospital|disease|vital/)) return 'health';
  if (text.match(/school|education|student|enrollment/)) return 'education';
  if (text.match(/police|crime|fire|911|incident|safety/)) return 'public_safety';
  if (text.match(/election|voter|ballot|precinct/)) return 'elections';
  if (text.match(/environment|water quality|air quality|pollution|ecology/)) return 'environment';
  if (text.match(/forest|fish|wildlife|habitat|salmon|stream/)) return 'natural_resources';
  if (text.match(/boundary|district|census|demographic|population/)) return 'demographics';
  if (text.match(/budget|revenue|expenditure|finance|tax/)) return 'finance';
  if (text.match(/employ|wage|labor|workforce/)) return 'labor';
  if (text.match(/permit|land use|planning|development/)) return 'housing';
  if (text.match(/energy|power|utility|electric/)) return 'energy';
  if (text.match(/agriculture|farm|crop/)) return 'agriculture';
  return 'unknown';
}

function mapFrequency(period) {
  if (!period) return 'unknown';
  if (period.includes('R/P1D') || period.includes('daily')) return 'daily';
  if (period.includes('R/P1W') || period.includes('weekly')) return 'weekly';
  if (period.includes('R/P1M') || period.includes('monthly')) return 'monthly';
  if (period.includes('R/P3M') || period.includes('quarterly')) return 'quarterly';
  if (period.includes('R/P1Y') || period.includes('annual')) return 'annual';
  return 'unknown';
}

async function enrichWithFields(record) {
  if (!record.api_endpoint) return record;
  const meta = await fetchLayerMetadata(record.api_endpoint);
  if (!meta || !meta.fields) return record;

  record.columns = meta.fields.map(f => ({
    name: f.alias || f.name,
    field_name: f.name,
    type: typeMap[f.type] || 'text',
    description: f.alias !== f.name ? f.alias : null,
  }));
  record.column_count = record.columns.length;
  if (meta.count != null) record.row_count = meta.count;

  return record;
}

async function main() {
  const dcat = await fetchDCAT();
  const datasets = dcat.dataset || [];
  console.log(`Found ${datasets.length} datasets in DCAT catalog`);

  const hubDomain = new URL(hubUrl).hostname;
  const outputPath = `D:/Projects/wa-data-catalog/schemas/${outputFile}`;

  let enriched = 0;
  const BATCH_SIZE = 5; // parallel field fetches

  for (let i = 0; i < datasets.length; i += BATCH_SIZE) {
    const batch = datasets.slice(i, i + BATCH_SIZE);
    const records = batch.map(d => buildRecord(d, hubDomain));
    const enrichedRecords = await Promise.all(records.map(r => enrichWithFields(r)));

    const lines = enrichedRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.appendFileSync(outputPath, lines);
    enriched += enrichedRecords.filter(r => r.columns.length > 0).length;

    if ((i + BATCH_SIZE) % 50 === 0 || i + BATCH_SIZE >= datasets.length) {
      console.log(`  Processed ${Math.min(i + BATCH_SIZE, datasets.length)}/${datasets.length} (${enriched} with field metadata)`);
    }
  }

  console.log(`Done. Wrote ${datasets.length} records to ${outputFile} (${enriched} enriched with column metadata)`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
