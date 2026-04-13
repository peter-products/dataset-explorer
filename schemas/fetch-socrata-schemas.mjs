// Fetches dataset schemas from a Socrata portal via Discovery API + Metadata API
// Usage: node fetch-socrata-schemas.mjs <domain> <output-file> [offset] [limit]
// Example: node fetch-socrata-schemas.mjs data.wa.gov wa-gov.jsonl 0 50

import fs from 'fs';

const domain = process.argv[2] || 'data.wa.gov';
const outputFile = process.argv[3] || `${domain.replace(/\./g, '-')}.jsonl`;
const startOffset = parseInt(process.argv[4] || '0');
const batchLimit = parseInt(process.argv[5] || '50');

const DISCOVERY_URL = 'https://api.us.socrata.com/api/catalog/v1';

// Map Socrata types to our normalized types
const typeMap = {
  'Text': 'text',
  'Number': 'number',
  'Calendar date': 'date',
  'Checkbox': 'boolean',
  'Location': 'location',
  'URL': 'url',
  'Point': 'geometry',
  'Line': 'geometry',
  'Polygon': 'geometry',
  'MultiLine': 'geometry',
  'MultiPoint': 'geometry',
  'MultiPolygon': 'geometry',
  'Money': 'number',
  'Percent': 'number',
  'Phone': 'text',
  'Email': 'text',
  'Document': 'blob',
  'Photo': 'blob',
};

// Map common Socrata categories to our domain taxonomy
const domainMap = {
  'Education': 'education',
  'Health': 'health',
  'Transportation': 'transportation',
  'Natural Resources & Environment': 'environment',
  'Natural Resources': 'natural_resources',
  'Environment': 'environment',
  'Public Safety': 'public_safety',
  'Politics': 'elections',
  'Labor': 'labor',
  'Demographics': 'demographics',
  'Economics': 'finance',
  'Procurements & Contracts': 'finance',
  'Procurements and Contracts': 'finance',
  'Culture and Community': 'demographics',
  'Consumer Protection': 'legal',
  'Technology': 'technology',
};

async function fetchBatch(domain, offset, limit) {
  const url = `${DISCOVERY_URL}?domains=${domain}&only=datasets&limit=${limit}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function normalizeType(socrataType) {
  return typeMap[socrataType] || 'text';
}

function normalizeDomain(category) {
  if (!category) return 'unknown';
  return domainMap[category] || 'unknown';
}

function buildRecord(item) {
  const r = item.resource;
  const m = item.metadata || {};
  const c = item.classification || {};

  // Build columns array from parallel arrays
  const columns = [];
  if (r.columns_name) {
    for (let i = 0; i < r.columns_name.length; i++) {
      columns.push({
        name: r.columns_name[i],
        field_name: r.columns_field_name ? r.columns_field_name[i] : null,
        type: normalizeType(r.columns_datatype ? r.columns_datatype[i] : 'Text'),
        description: r.columns_description ? (r.columns_description[i] || null) : null,
      });
    }
  }

  return {
    id: r.id,
    name: r.name,
    provider: r.attribution || m.domain || domain,
    source_portal: m.domain || domain,
    source_platform: 'socrata',
    url: item.permalink || `https://${m.domain || domain}/d/${r.id}`,
    api_endpoint: `https://${m.domain || domain}/resource/${r.id}.json`,
    documentation_url: item.link || `https://${m.domain || domain}/d/${r.id}`,
    access_method: 'api',
    format: ['json', 'csv', 'geojson', 'xml'],
    geographic_scope: guessGeoScope(m.domain || domain),
    geographic_detail: guessGeoDetail(m.domain || domain),
    domain: normalizeDomain(c.domain_category),
    category: c.domain_category || null,
    update_frequency: guessFrequency(r),
    row_count: null,
    columns,
    tags: c.domain_tags || [],
    description: stripHtml(r.description || ''),
    collected_at: new Date().toISOString(),
  };
}

function guessGeoScope(portal) {
  if (portal.includes('wa.gov')) return 'wa_state';
  if (portal.includes('kingcounty')) return 'wa_county';
  if (portal.includes('seattle')) return 'wa_city';
  return 'unknown';
}

function guessGeoDetail(portal) {
  if (portal === 'data.wa.gov') return 'Washington State';
  if (portal === 'data.kingcounty.gov') return 'King County, WA';
  if (portal.includes('seattle')) return 'Seattle, WA';
  return null;
}

function guessFrequency(r) {
  if (!r.data_updated_at || !r.createdAt) return 'unknown';
  const updated = new Date(r.data_updated_at);
  const created = new Date(r.createdAt);
  const now = new Date();
  const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 2) return 'daily';
  if (daysSinceUpdate < 8) return 'weekly';
  if (daysSinceUpdate < 35) return 'monthly';
  if (daysSinceUpdate < 100) return 'quarterly';
  if (daysSinceUpdate < 400) return 'annual';
  return 'unknown';
}

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

async function main() {
  console.log(`Fetching schemas from ${domain} (offset=${startOffset}, limit=${batchLimit})...`);

  const data = await fetchBatch(domain, startOffset, batchLimit);
  const total = data.resultSetSize;
  console.log(`Total datasets on ${domain}: ${total}`);
  console.log(`Fetched ${data.results.length} results this batch`);

  const records = data.results
    .filter(item => item.resource && item.resource.type === 'dataset')
    .map(buildRecord);

  // Append to file
  const outputPath = `D:/Projects/wa-data-catalog/schemas/${outputFile}`;
  const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
  fs.appendFileSync(outputPath, lines);

  console.log(`Wrote ${records.length} schema records to ${outputFile}`);
  console.log(`Next offset: ${startOffset + batchLimit}`);
  if (startOffset + batchLimit < total) {
    console.log(`Run again with offset=${startOffset + batchLimit} to continue`);
  } else {
    console.log('DONE - all datasets fetched');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
