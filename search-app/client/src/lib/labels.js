// Shared label map for enum-style metadata values.
// Used by FilterSidebar, ResultCard, DatasetPage so display stays consistent.

export const DOMAIN_LABELS = {
  health: 'Health & Medicine',
  education: 'Education',
  transportation: 'Transportation',
  environment: 'Environment',
  finance: 'Finance & Economics',
  public_safety: 'Public Safety',
  elections: 'Elections',
  labor: 'Labor & Employment',
  demographics: 'Demographics',
  natural_resources: 'Natural Resources',
  technology: 'Technology',
  legal: 'Legal & Regulatory',
  energy: 'Energy',
  agriculture: 'Agriculture',
  housing: 'Housing & Land Use',
};

export const FORMAT_LABELS = {
  api: 'API / Queryable',
  flat_file: 'Flat File (CSV, XLSX)',
  structured: 'Structured (JSON, XML)',
  geospatial: 'Geospatial (GeoJSON, SHP)',
  document: 'Document (PDF, HTML)',
  other: 'Other',
};

export const GEO_LABELS = {
  global: 'Global',
  varies: 'Varies',
  us_national: 'United States (National)',
  us_state: 'US (State-level)',
  us_city: 'US (City-level)',
  us_county: 'US (County-level)',
  // Legacy WA-specific values still appear on individual records; collapse them
  // onto US-level labels so nothing shows "Washington" in the UI.
  wa_state: 'US (State-level)',
  wa_city: 'US (City-level)',
  wa_county: 'US (County-level)',
  international: 'International',
  unknown: 'Unknown',
};

export const FREQUENCY_LABELS = {
  annual: 'Annual',
  quarterly: 'Quarterly',
  monthly: 'Monthly',
  weekly: 'Weekly',
  daily: 'Daily',
  one_time: 'One-time',
  varies: 'Varies',
  unknown: 'Unknown',
};

export const PLATFORM_LABELS = {
  ckan: 'CKAN',
  socrata: 'Socrata',
  arcgis: 'ArcGIS',
  bigquery: 'BigQuery',
  snowflake: 'Snowflake',
  azure: 'Azure',
  databricks: 'Databricks',
  huggingface: 'Hugging Face',
  kaggle: 'Kaggle',
  aws: 'AWS Open Data',
  gtfs: 'GTFS Transit',
  custom: 'Custom',
  download: 'Direct Download',
  api: 'Generic API',
  community: 'Community Submission',
};

export const ACCESS_METHOD_LABELS = {
  api: 'API',
  download: 'Download',
  sql: 'SQL',
};

export const SOURCE_TYPE_LABELS = {
  curated: 'Curated',
  community: 'Community',
};

export const ACCESS_LABELS = {
  open: 'Open',
  gated: 'Gated',
};

export const PRICE_LABELS = {
  'free-tier': 'Free tier',
  paid: 'Paid',
  enterprise: 'Enterprise',
};

// Per-facet label lookup. Falls back to underscore-replace for unknown values.
const LABEL_MAPS = {
  domain: DOMAIN_LABELS,
  formatType: FORMAT_LABELS,
  geographic_scope: GEO_LABELS,
  update_frequency: FREQUENCY_LABELS,
  source_platform: PLATFORM_LABELS,
  access_method: ACCESS_METHOD_LABELS,
  source_type: SOURCE_TYPE_LABELS,
  access: ACCESS_LABELS,
  price_range: PRICE_LABELS,
};

export function labelFor(facet, value) {
  if (value == null) return '';
  const map = LABEL_MAPS[facet];
  if (map && map[value]) return map[value];
  return typeof value === 'string' ? value.replace(/_/g, ' ') : String(value);
}
