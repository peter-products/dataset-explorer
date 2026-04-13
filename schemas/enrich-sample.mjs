// Enrichment pipeline — processes sample records through all 7 phases
// Phases 1-5 are deterministic, Phase 6 (semantic descriptions) uses templates,
// Phase 7 generates embedding text
import fs from 'fs';

const INPUT = 'D:/Projects/wa-data-catalog/schemas/enrichment-sample-input.jsonl';
const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/enrichment-sample-output.jsonl';

// ===== PHASE 2: Publisher Normalization =====
const publisherLookup = {
  // WA State agencies
  'Washington State Department of Health': { id: 'wa-doh', canonical: 'WA Dept of Health', parent: 'wa-state', type: 'state_agency' },
  'WA Dept of Health': { id: 'wa-doh', canonical: 'WA Dept of Health', parent: 'wa-state', type: 'state_agency' },
  'Washington Department of Fish and Wildlife': { id: 'wa-wdfw', canonical: 'WA Dept of Fish & Wildlife', parent: 'wa-state', type: 'state_agency' },
  'WDFW': { id: 'wa-wdfw', canonical: 'WA Dept of Fish & Wildlife', parent: 'wa-state', type: 'state_agency' },
  'OSPI Student Information': { id: 'wa-ospi', canonical: 'WA Office of Superintendent (OSPI)', parent: 'wa-state', type: 'state_agency' },
  'Washington Public Disclosure Commission': { id: 'wa-pdc', canonical: 'WA Public Disclosure Commission', parent: 'wa-state', type: 'state_agency' },
  'Public Disclosure Commission': { id: 'wa-pdc', canonical: 'WA Public Disclosure Commission', parent: 'wa-state', type: 'state_agency' },
  'Washington State Department of Licensing': { id: 'wa-dol', canonical: 'WA Dept of Licensing', parent: 'wa-state', type: 'state_agency' },
  'Labor & Industries': { id: 'wa-lni', canonical: 'WA Labor & Industries', parent: 'wa-state', type: 'state_agency' },
  'Department of Ecology': { id: 'wa-ecology', canonical: 'WA Dept of Ecology', parent: 'wa-state', type: 'state_agency' },
  // Federal
  'U.S. Securities and Exchange Commission': { id: 'us-sec', canonical: 'SEC', parent: 'us-federal', type: 'federal_agency' },
  'Centers for Disease Control and Prevention': { id: 'us-cdc', canonical: 'CDC', parent: 'us-federal', type: 'federal_agency' },
  'U.S. Food and Drug Administration': { id: 'us-fda', canonical: 'FDA', parent: 'us-federal', type: 'federal_agency' },
  'Environmental Protection Agency': { id: 'us-epa', canonical: 'EPA', parent: 'us-federal', type: 'federal_agency' },
  'National Archives / Office of the Federal Register': { id: 'us-fedreg', canonical: 'Federal Register', parent: 'us-federal', type: 'federal_agency' },
  'U.S. National Library of Medicine': { id: 'us-nlm', canonical: 'NLM/NIH', parent: 'us-federal', type: 'federal_agency' },
  // International
  'World Bank': { id: 'intl-worldbank', canonical: 'World Bank', parent: 'international', type: 'international_org' },
  'World Health Organization': { id: 'intl-who', canonical: 'WHO', parent: 'international', type: 'international_org' },
  'Eurostat (European Commission)': { id: 'intl-eurostat', canonical: 'Eurostat', parent: 'international', type: 'international_org' },
  'Food and Agriculture Organization of the United Nations': { id: 'intl-fao', canonical: 'FAO', parent: 'international', type: 'international_org' },
  'International Labour Organization': { id: 'intl-ilo', canonical: 'ILO', parent: 'international', type: 'international_org' },
  'United Nations Statistics Division': { id: 'intl-unsd', canonical: 'UN Statistics', parent: 'international', type: 'international_org' },
  // Cloud
  'Google (BigQuery Public Datasets Program)': { id: 'cloud-bigquery', canonical: 'Google BigQuery', parent: 'cloud', type: 'cloud_provider' },
};

function normalizePublisher(provider) {
  if (publisherLookup[provider]) return publisherLookup[provider];
  // Fuzzy match
  const lower = (provider || '').toLowerCase();
  for (const [key, val] of Object.entries(publisherLookup)) {
    if (lower.includes(key.toLowerCase().slice(0, 15))) return val;
  }
  // Generate an ID from the name
  const id = (provider || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  return { id, canonical: provider || 'Unknown', parent: 'unknown', type: 'unknown' };
}

// ===== PHASE 3: Hierarchy Assignment =====
function assignHierarchy(record, pub) {
  const portal = record.source_portal || '';
  const platform = record.source_platform || '';

  // Galaxy
  let galaxy, galaxyLabel;
  if (platform === 'bigquery' || platform === 'aws' || platform === 'azure' || platform === 'snowflake' || platform === 'databricks') {
    galaxy = 'cloud_warehouses'; galaxyLabel = 'Cloud Data Warehouses';
  } else if (platform === 'huggingface' || platform === 'kaggle' || portal.includes('zenodo') || portal.includes('dataverse')) {
    galaxy = 'research_ml'; galaxyLabel = 'Research & ML Platforms';
  } else if (pub.type === 'international_org' || portal.includes('worldbank') || portal.includes('who') || portal.includes('fao') || portal.includes('eurostat') || portal.includes('ilo') || portal.includes('unesco')) {
    galaxy = 'international_orgs'; galaxyLabel = 'International Organizations';
  } else if (record.geographic_scope === 'wa_state' || record.geographic_scope === 'wa_county' || record.geographic_scope === 'wa_city' || portal.includes('wa.gov') || portal.includes('kingcounty') || portal.includes('seattle') || portal.includes('pierce')) {
    galaxy = 'us_government'; galaxyLabel = 'US Government';
  } else if (pub.parent === 'us-federal' || portal.includes('data.gov') || portal.includes('cdc.gov') || portal.includes('sec.gov')) {
    galaxy = 'us_government'; galaxyLabel = 'US Government';
  } else if (portal.includes('.gov') || portal.includes('.us')) {
    galaxy = 'us_government'; galaxyLabel = 'US Government';
  } else if (portal.includes('gouv.fr') || portal.includes('canada.ca') || portal.includes('dati.gov')) {
    galaxy = 'international_gov'; galaxyLabel = 'International Government';
  } else if (platform === 'gtfs') {
    galaxy = 'us_government'; galaxyLabel = 'US Government';
  } else {
    galaxy = 'other'; galaxyLabel = 'Other';
  }

  // Solar system
  let solarSystem, solarSystemLabel;
  if (galaxy === 'us_government') {
    if (record.geographic_scope === 'wa_state' || record.geographic_scope === 'wa_county' || record.geographic_scope === 'wa_city') {
      solarSystem = 'washington_state'; solarSystemLabel = 'Washington State';
    } else if (pub.parent === 'us-federal' || portal.includes('data.gov') || portal.includes('.gov')) {
      solarSystem = 'us_federal'; solarSystemLabel = 'US Federal';
    } else if (portal.includes('ny.gov') || portal.includes('newyork')) {
      solarSystem = 'new_york'; solarSystemLabel = 'New York';
    } else if (portal.includes('chicago') || portal.includes('illinois') || portal.includes('cookcounty')) {
      solarSystem = 'illinois'; solarSystemLabel = 'Illinois';
    } else if (portal.includes('texas') || portal.includes('austin') || portal.includes('dallas') || portal.includes('fortworth')) {
      solarSystem = 'texas'; solarSystemLabel = 'Texas';
    } else if (portal.includes('california') || portal.includes('lacity') || portal.includes('oakland') || portal.includes('berkeley') || portal.includes('sanjose') || portal.includes('sanfrancisco')) {
      solarSystem = 'california'; solarSystemLabel = 'California';
    } else if (portal.includes('oregon')) {
      solarSystem = 'oregon'; solarSystemLabel = 'Oregon';
    } else if (portal.includes('colorado')) {
      solarSystem = 'colorado'; solarSystemLabel = 'Colorado';
    } else {
      solarSystem = 'us_other'; solarSystemLabel = 'US Other';
    }
  } else if (galaxy === 'cloud_warehouses') {
    solarSystem = platform; solarSystemLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  } else if (galaxy === 'international_orgs') {
    solarSystem = pub.id || 'intl-other'; solarSystemLabel = pub.canonical || 'Other';
  } else if (galaxy === 'international_gov') {
    if (portal.includes('canada')) { solarSystem = 'canada'; solarSystemLabel = 'Canada'; }
    else if (portal.includes('gouv.fr')) { solarSystem = 'france'; solarSystemLabel = 'France'; }
    else if (portal.includes('dati.gov')) { solarSystem = 'italy'; solarSystemLabel = 'Italy'; }
    else { solarSystem = 'intl-other'; solarSystemLabel = 'Other Countries'; }
  } else if (galaxy === 'research_ml') {
    solarSystem = platform; solarSystemLabel = platform.charAt(0).toUpperCase() + platform.slice(1);
  } else {
    solarSystem = 'other'; solarSystemLabel = 'Other';
  }

  // Planet = publisher
  const planet = pub.id;
  const planetLabel = pub.canonical;

  // Continent = domain category
  const continent = record.domain || 'unknown';
  const continentLabels = {
    health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
    environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
    elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics & Population',
    natural_resources: 'Natural Resources', technology: 'Technology & Computing', legal: 'Legal & Regulatory',
    energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use', unknown: 'Other',
  };

  return {
    galaxy, galaxy_label: galaxyLabel,
    solar_system: solarSystem, solar_system_label: solarSystemLabel,
    planet, planet_label: planetLabel,
    continent, continent_label: continentLabels[continent] || continent,
  };
}

// ===== PHASE 5: Size and Freshness =====
function computeSize(rowCount) {
  if (!rowCount) return 'unknown';
  if (rowCount < 100) return 'tiny';
  if (rowCount < 10000) return 'small';
  if (rowCount < 1000000) return 'medium';
  if (rowCount < 100000000) return 'large';
  return 'massive';
}

function computeFreshness(lastUpdated) {
  if (!lastUpdated) return 'unknown';
  const updated = new Date(lastUpdated);
  if (isNaN(updated.getTime())) return 'unknown';
  const daysSince = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince < 1) return 'live';
  if (daysSince < 30) return 'recent';
  if (daysSince < 365) return 'stale';
  return 'archive';
}

// ===== PHASE 6: Semantic Description =====
function generateDescription(record, hierarchy) {
  const colNames = (record.columns || []).slice(0, 10).map(c => c.name).join(', ');
  const colCount = record.columns?.length || record.column_count || 0;
  const rowDesc = record.row_count ? ` Contains ${record.row_count.toLocaleString()} records.` : '';
  const geoDesc = record.geographic_detail ? ` Covers ${record.geographic_detail}.` : '';
  const freqDesc = record.update_frequency && record.update_frequency !== 'unknown' ? ` Updated ${record.update_frequency}.` : '';

  const name = record.name || 'Unnamed dataset';
  const provider = hierarchy.planet_label || record.provider || 'Unknown';
  const desc = record.description ? record.description.slice(0, 200) : '';

  let summary;
  if (desc && desc.length > 50) {
    summary = `${name} from ${provider}. ${desc}${rowDesc}${geoDesc}${freqDesc}`;
  } else {
    summary = `${name} from ${provider}.${rowDesc}${geoDesc}${freqDesc}`;
    if (colNames) summary += ` Fields include: ${colNames}${colCount > 10 ? ` (and ${colCount - 10} more)` : ''}.`;
  }

  return summary.slice(0, 600);
}

// ===== PHASE 7: Embedding Text =====
function generateEmbeddingText(record, hierarchy, description) {
  const parts = [
    description,
    `Published by: ${hierarchy.planet_label}`,
    `Category: ${hierarchy.continent_label}`,
    `Geography: ${record.geographic_detail || record.geographic_scope || 'varies'}`,
  ];

  const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
  if (colNames.length) parts.push(`Columns: ${colNames.join(', ')}`);

  const tags = (record.tags || []).slice(0, 10);
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);

  return parts.join('\n');
}

// ===== MAIN =====
const startTime = Date.now();

const lines = fs.readFileSync(INPUT, 'utf8').trim().split('\n');
console.log(`Processing ${lines.length} sample records...`);

const enriched = [];
const timings = { normalize: 0, hierarchy: 0, size: 0, description: 0, embedding: 0 };

for (const line of lines) {
  const record = JSON.parse(line);

  // Phase 2: Publisher normalization
  let t = Date.now();
  const pub = normalizePublisher(record.provider);
  record.publisher_normalized = pub.canonical;
  record.publisher_id = pub.id;
  record.publisher_type = pub.type;
  timings.normalize += Date.now() - t;

  // Phase 3: Hierarchy
  t = Date.now();
  record.hierarchy = assignHierarchy(record, pub);
  timings.hierarchy += Date.now() - t;

  // Phase 5: Size & Freshness
  t = Date.now();
  record.size_category = computeSize(record.row_count);
  record.freshness = computeFreshness(record.last_updated);
  record.column_count = record.column_count || (record.columns || []).length;
  timings.size += Date.now() - t;

  // Phase 6: Semantic description
  t = Date.now();
  record.semantic_description = generateDescription(record, record.hierarchy);
  timings.description += Date.now() - t;

  // Phase 7: Embedding text
  t = Date.now();
  record.embedding_text = generateEmbeddingText(record, record.hierarchy, record.semantic_description);
  timings.embedding += Date.now() - t;

  enriched.push(record);
}

const totalMs = Date.now() - startTime;

fs.writeFileSync(OUTPUT, enriched.map(r => JSON.stringify(r)).join('\n') + '\n');

console.log(`\nDone. Enriched ${enriched.length} records in ${totalMs}ms`);
console.log(`\nPer-record timing (ms):`);
console.log(`  Publisher normalize: ${(timings.normalize / lines.length).toFixed(2)}`);
console.log(`  Hierarchy assign:   ${(timings.hierarchy / lines.length).toFixed(2)}`);
console.log(`  Size/freshness:     ${(timings.size / lines.length).toFixed(2)}`);
console.log(`  Semantic desc:      ${(timings.description / lines.length).toFixed(2)}`);
console.log(`  Embedding text:     ${(timings.embedding / lines.length).toFixed(2)}`);
console.log(`  TOTAL per record:   ${(totalMs / lines.length).toFixed(2)}`);
console.log(`\nExtrapolated for 200K records: ${((totalMs / lines.length) * 200000 / 1000).toFixed(1)} seconds`);

// Show a sample
console.log('\n=== SAMPLE ENRICHED RECORD ===');
const sample = enriched[0];
console.log('Name:', sample.name);
console.log('Publisher:', sample.publisher_normalized, '(' + sample.publisher_id + ')');
console.log('Hierarchy:', JSON.stringify(sample.hierarchy, null, 2));
console.log('Size:', sample.size_category, '| Freshness:', sample.freshness);
console.log('Description:', sample.semantic_description);
console.log('---');
const sample2 = enriched[30]; // WorldBank sample
console.log('Name:', sample2.name);
console.log('Publisher:', sample2.publisher_normalized, '(' + sample2.publisher_id + ')');
console.log('Hierarchy:', JSON.stringify(sample2.hierarchy, null, 2));
console.log('Description:', sample2.semantic_description.slice(0, 200));
console.log('---');
const sample3 = enriched[80]; // BigQuery sample
console.log('Name:', sample3.name);
console.log('Publisher:', sample3.publisher_normalized, '(' + sample3.publisher_id + ')');
console.log('Hierarchy:', JSON.stringify(sample3.hierarchy, null, 2));
console.log('Size:', sample3.size_category, '| Row count:', sample3.row_count?.toLocaleString());
