// Full enrichment pipeline for all 200K+ records
// Uses publisher-lookup.json + improved domain classification + hierarchy + size + descriptions
import fs from 'fs';

const SCHEMAS_DIR = 'D:/Projects/wa-data-catalog/schemas';
const LOOKUP = JSON.parse(fs.readFileSync(`${SCHEMAS_DIR}/publisher-lookup.json`, 'utf8'));
const OUTPUT = `${SCHEMAS_DIR}/enriched`;

// Create output directory
try { fs.mkdirSync(OUTPUT); } catch (e) {}

// ===== Domain Classification (improved — uses columns + tags + description) =====
function classifyDomain(record) {
  // If the source already has a good domain, keep it (unless "unknown")
  if (record.domain && record.domain !== 'unknown') return record.domain;

  const text = [
    record.name || '',
    record.description || '',
    ...(record.tags || []),
    record.category || '',
    ...(record.columns || []).map(c => c.name + ' ' + (c.description || '')),
  ].join(' ').toLowerCase();

  if (text.match(/health|hospital|disease|vital stat|mortality|birth|death|medical|pharma|drug|vaccine|immuniz|clinical|patient|diagnos|epidem|covid/)) return 'health';
  if (text.match(/school|education|student|enrollment|graduat|teacher|ospi|university|college|literacy|curriculum/)) return 'education';
  if (text.match(/transport|road|traffic|bridge|ferry|transit|rail|highway|vehicle|aviation|airport|bicycle|bike|taxi|bus route|gtfs/)) return 'transportation';
  if (text.match(/environment|water quality|air quality|pollution|ecology|emission|climate|weather|temperature|precipitation|noaa|ghg|waste/)) return 'environment';
  if (text.match(/fish|wildlife|salmon|forest|timber|habitat|species|conservation|land.*cover|vegetation|geological|mineral/)) return 'natural_resources';
  if (text.match(/crime|police|fire|911|incident|safety|arrest|offense|correcti|prison|inmate|justice/)) return 'public_safety';
  if (text.match(/election|voter|ballot|precinct|campaign|lobbyist|politic|candidate|party/)) return 'elections';
  if (text.match(/budget|revenue|expenditure|financ|tax|gdp|gni|trade|export|import|inflation|debt|bank|stock|bond|interest rate|econom|fiscal|monetary/)) return 'finance';
  if (text.match(/census|population|demographic|birth rate|fertility|migration|age group|race|ethnicity|gender|household/)) return 'demographics';
  if (text.match(/employ|unemploy|wage|salary|labor|workforce|occupation|job|hiring/)) return 'labor';
  if (text.match(/energy|power|electric|solar|wind|oil|gas|nuclear|renewable|utility|grid/)) return 'energy';
  if (text.match(/agriculture|farm|crop|livestock|food|cereal|wheat|rice|harvest|irrigation|fertiliz/)) return 'agriculture';
  if (text.match(/parcel|property|assessor|zoning|land use|permit|building|housing|real estate|rent|mortgage/)) return 'housing';
  if (text.match(/patent|trademark|court|legal|regulation|law|statute|ordinance|compliance/)) return 'legal';
  if (text.match(/code|software|github|api|dataset|machine learning|nlp|image|model|benchmark|algorithm/)) return 'technology';

  return 'unknown';
}

// ===== Publisher Normalization =====
function normalizePublisher(provider) {
  if (LOOKUP[provider]) return LOOKUP[provider];
  const id = (provider || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  return { id: id || 'unknown', canonical: provider || 'Unknown', short: (provider || 'Unknown').slice(0, 30), parent: 'unknown', type: 'unknown', geo: 'unknown' };
}

// ===== Hierarchy =====
function assignHierarchy(record, pub) {
  const portal = record.source_portal || '';
  const platform = record.source_platform || '';

  let galaxy, galaxyLabel;
  if (['bigquery', 'aws', 'azure', 'snowflake', 'databricks'].includes(platform)) {
    galaxy = 'cloud_warehouses'; galaxyLabel = 'Cloud Data Warehouses';
  } else if (['huggingface', 'kaggle'].includes(platform) || portal.match(/zenodo|dataverse|openalex/)) {
    galaxy = 'research_ml'; galaxyLabel = 'Research & ML';
  } else if (pub.parent === 'international' || pub.parent?.startsWith('intl') || portal.match(/worldbank|who\.|fao\.|eurostat|ilo\.|unesco|unstats/)) {
    galaxy = 'international_orgs'; galaxyLabel = 'International Organizations';
  } else if (portal.match(/gouv\.fr|canada\.ca|dati\.gov\.it/) || pub.parent?.startsWith('ca-') || pub.parent?.startsWith('fr-') || pub.parent?.startsWith('it-') || pub.parent?.startsWith('co-')) {
    galaxy = 'international_gov'; galaxyLabel = 'International Government';
  } else if (pub.geo === 'wa_state' || pub.geo === 'wa_county' || pub.geo === 'wa_city' || pub.parent?.startsWith('wa-') || portal.match(/wa\.gov|kingcounty|seattle|pierce.*wa|snoco|snohomish|spokane.*wa|thurston|clark.*wa|kitsap|yakima|skagit|whatcom|benton.*wa|chelan|grant.*wa|island.*wa|jefferson.*wa|kittitas|san.*juan.*wa|skamania|walla.*walla|wsdot|wadnr|wdfw/)) {
    galaxy = 'us_government'; galaxyLabel = 'US Government';
  } else if (pub.parent === 'us-federal' || pub.parent === 'us-state' || pub.parent === 'us-local' || portal.match(/data\.gov|\.gov$|sec\.gov|cdc\.gov|fda\.gov/) || platform === 'gtfs') {
    galaxy = 'us_government'; galaxyLabel = 'US Government';
  } else if (platform === 'socrata' || platform === 'ckan') {
    galaxy = 'us_government'; galaxyLabel = 'US Government';
  } else {
    galaxy = 'other'; galaxyLabel = 'Other';
  }

  let solarSystem, solarSystemLabel;
  if (galaxy === 'us_government') {
    if (pub.parent?.startsWith('wa-') || pub.geo?.startsWith('wa_')) {
      solarSystem = 'washington_state'; solarSystemLabel = 'Washington State';
    } else if (pub.parent === 'us-federal') {
      solarSystem = 'us_federal'; solarSystemLabel = 'US Federal';
    } else if (portal.match(/ny\.gov|newyork|health\.data\.ny/) || pub.id?.includes('ny')) {
      solarSystem = 'new_york'; solarSystemLabel = 'New York';
    } else if (portal.match(/chicago|illinois|cookcounty/) || pub.id?.includes('chicago') || pub.id?.includes('illinois') || pub.id?.includes('cook')) {
      solarSystem = 'illinois'; solarSystemLabel = 'Illinois';
    } else if (portal.match(/texas|austin|dallas|fortworth/) || pub.id?.includes('texas') || pub.id?.includes('austin') || pub.id?.includes('dallas')) {
      solarSystem = 'texas'; solarSystemLabel = 'Texas';
    } else if (portal.match(/california|lacity|oakland|berkeley|sanjose|sanfrancisco|bayarea|sccgov|marin/) || pub.id?.includes('california') || pub.id?.includes('los-angeles')) {
      solarSystem = 'california'; solarSystemLabel = 'California';
    } else if (portal.match(/oregon/) || pub.id?.includes('oregon')) {
      solarSystem = 'oregon'; solarSystemLabel = 'Oregon';
    } else if (portal.match(/colorado/) || pub.id?.includes('colorado')) {
      solarSystem = 'colorado'; solarSystemLabel = 'Colorado';
    } else if (portal.match(/maryland/) || pub.id?.includes('maryland')) {
      solarSystem = 'maryland'; solarSystemLabel = 'Maryland';
    } else if (portal.match(/utah/) || pub.id?.includes('utah')) {
      solarSystem = 'utah'; solarSystemLabel = 'Utah';
    } else if (pub.parent === 'us-state') {
      solarSystem = 'us_other_states'; solarSystemLabel = 'Other US States';
    } else if (pub.parent === 'us-local') {
      solarSystem = 'us_local'; solarSystemLabel = 'US Cities & Counties';
    } else {
      solarSystem = 'us_other'; solarSystemLabel = 'US Other';
    }
  } else if (galaxy === 'cloud_warehouses') {
    solarSystem = platform; solarSystemLabel = { bigquery: 'Google BigQuery', aws: 'AWS Open Data', azure: 'Microsoft Azure', snowflake: 'Snowflake', databricks: 'Databricks' }[platform] || platform;
  } else if (galaxy === 'international_orgs') {
    solarSystem = pub.id || 'intl-other'; solarSystemLabel = pub.canonical || 'Other';
  } else if (galaxy === 'international_gov') {
    if (pub.parent?.startsWith('ca-') || portal.includes('canada')) { solarSystem = 'canada'; solarSystemLabel = 'Canada'; }
    else if (pub.parent?.startsWith('fr-') || portal.includes('gouv.fr')) { solarSystem = 'france'; solarSystemLabel = 'France'; }
    else if (pub.parent?.startsWith('it-') || portal.includes('dati.gov')) { solarSystem = 'italy'; solarSystemLabel = 'Italy'; }
    else if (pub.parent?.startsWith('co-') || portal.includes('datos.gov.co')) { solarSystem = 'colombia'; solarSystemLabel = 'Colombia'; }
    else { solarSystem = 'intl_other'; solarSystemLabel = 'Other Countries'; }
  } else if (galaxy === 'research_ml') {
    solarSystem = platform; solarSystemLabel = { huggingface: 'HuggingFace', kaggle: 'Kaggle' }[platform] || platform;
  } else {
    solarSystem = 'other'; solarSystemLabel = 'Other';
  }

  const continentLabels = {
    health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
    environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
    elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics',
    natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
    energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use', unknown: 'Other',
  };

  return {
    galaxy, galaxy_label: galaxyLabel,
    solar_system: solarSystem, solar_system_label: solarSystemLabel,
    planet: pub.id, planet_label: pub.canonical,
    continent: record.domain, continent_label: continentLabels[record.domain] || record.domain,
  };
}

// ===== Size & Freshness =====
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

// ===== Semantic Description =====
function generateDescription(record, hierarchy) {
  const colNames = (record.columns || []).slice(0, 10).map(c => c.name).join(', ');
  const colCount = record.columns?.length || record.column_count || 0;
  const rowDesc = record.row_count ? ` ${record.row_count.toLocaleString()} records.` : '';
  const geoDesc = record.geographic_detail ? ` Covers ${record.geographic_detail}.` : '';
  const freqDesc = record.update_frequency && record.update_frequency !== 'unknown' ? ` Updated ${record.update_frequency}.` : '';
  const name = record.name || 'Unnamed dataset';
  const provider = hierarchy.planet_label || record.provider || 'Unknown';
  const desc = record.description ? record.description.slice(0, 250) : '';

  let summary = desc.length > 50
    ? `${name} from ${provider}. ${desc}${rowDesc}${geoDesc}${freqDesc}`
    : `${name} from ${provider}.${rowDesc}${geoDesc}${freqDesc}${colNames ? ` Fields: ${colNames}${colCount > 10 ? ` (+${colCount - 10} more)` : ''}.` : ''}`;

  return summary.slice(0, 600);
}

// ===== Embedding Text =====
function generateEmbeddingText(record, hierarchy, description) {
  const parts = [description, `Published by: ${hierarchy.planet_label}`, `Category: ${hierarchy.continent_label}`, `Geography: ${record.geographic_detail || record.geographic_scope || 'varies'}`];
  const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
  if (colNames.length) parts.push(`Columns: ${colNames.join(', ')}`);
  const tags = (record.tags || []).slice(0, 10);
  if (tags.length) parts.push(`Tags: ${tags.join(', ')}`);
  return parts.join('\n');
}

// ===== MAIN =====
const startTime = Date.now();
const inputFiles = fs.readdirSync(SCHEMAS_DIR).filter(f => f.endsWith('.jsonl') && !f.startsWith('enrichment-'));
console.log(`Processing ${inputFiles.length} JSONL files...`);

let totalRecords = 0;
let domainFixed = 0;
const domainCounts = {};
const galaxyCounts = {};

for (const file of inputFiles) {
  const inputPath = `${SCHEMAS_DIR}/${file}`;
  const outputPath = `${OUTPUT}/${file}`;
  const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n');
  const enriched = [];

  for (const line of lines) {
    try {
      const record = JSON.parse(line);

      // Phase 2: Publisher normalization
      const pub = normalizePublisher(record.provider);
      record.publisher_normalized = pub.canonical;
      record.publisher_id = pub.id;
      record.publisher_type = pub.type;

      // Domain classification (fix unknowns)
      const origDomain = record.domain;
      record.domain = classifyDomain(record);
      if (origDomain === 'unknown' && record.domain !== 'unknown') domainFixed++;

      // Phase 3: Hierarchy
      record.hierarchy = assignHierarchy(record, pub);

      // Phase 5: Size & Freshness
      record.size_category = computeSize(record.row_count);
      record.freshness = computeFreshness(record.last_updated);
      record.column_count = record.column_count || (record.columns || []).length;

      // Phase 6: Semantic description
      record.semantic_description = generateDescription(record, record.hierarchy);

      // Phase 7: Embedding text
      record.embedding_text = generateEmbeddingText(record, record.hierarchy, record.semantic_description);

      enriched.push(record);

      // Stats
      domainCounts[record.domain] = (domainCounts[record.domain] || 0) + 1;
      galaxyCounts[record.hierarchy.galaxy] = (galaxyCounts[record.hierarchy.galaxy] || 0) + 1;
    } catch (e) {}
  }

  fs.writeFileSync(outputPath, enriched.map(r => JSON.stringify(r)).join('\n') + '\n');
  totalRecords += enriched.length;
}

const elapsed = Date.now() - startTime;
console.log(`\n=== Enrichment Complete ===`);
console.log(`Records: ${totalRecords.toLocaleString()} in ${(elapsed / 1000).toFixed(1)}s (${(elapsed / totalRecords).toFixed(2)}ms/record)`);
console.log(`Domain unknowns fixed: ${domainFixed.toLocaleString()}`);
console.log(`\nBy galaxy:`);
Object.entries(galaxyCounts).sort((a, b) => b[1] - a[1]).forEach(([g, c]) => console.log(`  ${g}: ${c.toLocaleString()}`));
console.log(`\nBy domain:`);
Object.entries(domainCounts).sort((a, b) => b[1] - a[1]).forEach(([d, c]) => console.log(`  ${d}: ${c.toLocaleString()}`));