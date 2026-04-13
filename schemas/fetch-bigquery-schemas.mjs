// Generates BigQuery public dataset schema records from a curated dataset list.
// BigQuery REST API requires auth, so we compile from documentation + known datasets.
// For each dataset, we generate a schema record with known table/column info where available.
//
// Usage: node fetch-bigquery-schemas.mjs

import fs from 'fs';

// Compiled from: Google Cloud docs, OWOX blog, samthebrand.com, Web3 docs,
// cloud-public-datasets.md research file, and web searches.
// Each entry: [dataset_id, name, category, description, known_tables]
const datasets = [
  // === WEATHER & CLIMATE ===
  ['noaa_gsod', 'NOAA Global Summary of the Day', 'weather', 'Global weather observations from 9000+ stations, 1929-present', ['gsod*']],
  ['noaa_isd', 'NOAA Integrated Surface Database', 'weather', 'Hourly weather observations worldwide', ['isd*']],
  ['ghcn_d', 'GHCN Daily', 'weather', 'Global Historical Climatology Network daily observations', ['ghcnd_*']],
  ['ghcn_m', 'GHCN Monthly', 'weather', 'Global Historical Climatology Network monthly summaries', ['ghcnm_*']],
  ['noaa_hurricanes', 'NOAA Hurricanes', 'weather', 'Historical hurricane/tropical storm tracking data', ['hurricanes']],
  ['noaa_lightning', 'NOAA Lightning', 'weather', 'Lightning strike data', ['lightning_*']],
  ['noaa_goes_16', 'NOAA GOES-16', 'weather', 'Geostationary weather satellite data', []],
  ['noaa_preliminary_local_climatological_data', 'NOAA Preliminary Local Climatological Data', 'weather', 'Local climatological data', []],

  // === DEMOGRAPHICS & CENSUS ===
  ['census_bureau_acs', 'American Community Survey', 'demographics', 'Demographic, economic, and housing data from US Census ACS', ['blockgroup_*', 'county_*', 'state_*']],
  ['census_bureau_usa', 'US Census Bureau', 'demographics', 'Decennial census population data', ['population_*']],
  ['census_bureau_international', 'Census Bureau International', 'demographics', 'International demographic data from US Census Bureau', ['age_specific_fertility_rates', 'birth_death_growth_rates', 'midyear_population*']],
  ['usa_names', 'USA Names', 'demographics', 'Baby names by state from Social Security Administration 1910-present', ['usa_1910_current']],
  ['census_opportunity_atlas', 'Opportunity Atlas', 'demographics', 'Outcomes data for children by Census tract', ['tract_outcomes']],
  ['census_utility', 'Census Utility', 'demographics', 'Census geographic crosswalk and utility tables', ['fips_codes_all', 'fips_codes_states']],
  ['geo_us_boundaries', 'US Geographic Boundaries', 'geospatial', 'State, county, ZIP code, congressional district boundaries', ['us_zip_codes', 'us_states', 'us_counties']],
  ['geo_us_census_places', 'US Census Places', 'geospatial', 'Census-designated places boundaries', []],
  ['geo_census_blockgroups', 'Census Block Groups', 'geospatial', 'Census block group boundaries', []],
  ['geo_census_tracts', 'Census Tracts', 'geospatial', 'Census tract boundaries', []],
  ['geo_census_roads', 'Census Roads', 'geospatial', 'Road network from Census TIGER/Line', []],

  // === ENVIRONMENT ===
  ['epa_historical_air_quality', 'EPA Air Quality', 'environment', 'Historical air quality measurements across the US', ['air_quality_annual_summary', 'co_daily_summary', 'pm25_*']],
  ['openaq', 'OpenAQ', 'environment', 'Global air quality measurements from ground-level sensors', ['global_air_quality']],
  ['cloud_storage_geo_index', 'Cloud Storage Geo Index', 'environment', 'Geospatial index of publicly available data in Cloud Storage', []],

  // === TRANSPORTATION ===
  ['new_york_taxi_trips', 'NYC Taxi Trips', 'transportation', 'Yellow and green taxi trip records for NYC', ['tlc_yellow_trips_*', 'tlc_green_trips_*']],
  ['chicago_taxi_trips', 'Chicago Taxi Trips', 'transportation', 'Chicago taxi trip data', ['taxi_trips']],
  ['new_york_citibike', 'NYC Citi Bike', 'transportation', 'Bike share trip data: start/end stations, duration', ['citibike_trips', 'citibike_stations']],
  ['san_francisco_bikeshare', 'SF Bikeshare', 'transportation', 'San Francisco bike share trip data', ['bikeshare_trips', 'bikeshare_station_info']],
  ['austin_bikeshare', 'Austin Bikeshare', 'transportation', 'Austin B-cycle trip data', ['bikeshare_trips', 'bikeshare_stations']],
  ['london_bicycles', 'London Bicycles', 'transportation', 'London bike share trip data', ['cycle_hire', 'cycle_stations']],
  ['nhtsa_traffic_fatalities', 'NHTSA Traffic Fatalities', 'transportation', 'Fatal motor vehicle crashes in the US (FARS)', ['accident_*', 'vehicle_*', 'person_*']],

  // === PUBLIC SAFETY ===
  ['chicago_crime', 'Chicago Crime', 'public_safety', 'Reported crime incidents in Chicago 2001-present', ['crime']],
  ['san_francisco_sfpd_incidents', 'SF Police Incidents', 'public_safety', 'San Francisco police department incident reports', ['sfpd_incidents']],
  ['austin_crime', 'Austin Crime', 'public_safety', 'Austin police department crime reports', ['crime']],
  ['fbi_nics', 'FBI NICS Firearm Background Checks', 'public_safety', 'NICS firearm background check data by state/month', ['nics_firearm_background_checks']],

  // === ECONOMICS & FINANCE ===
  ['bls', 'Bureau of Labor Statistics', 'economics', 'Employment, wages, CPI, unemployment data', ['cpi_u', 'employment_hours_earnings', 'wm']],
  ['world_bank_intl_debt', 'World Bank International Debt', 'economics', 'International debt statistics from World Bank', ['international_debt']],
  ['world_bank_intl_education', 'World Bank International Education', 'economics', 'International education statistics from World Bank', ['international_education']],
  ['world_bank_wdi', 'World Development Indicators', 'economics', 'World Bank development indicators for all countries', ['wdi_tables']],
  ['world_bank_health_population', 'World Bank Health Population', 'economics', 'Health and population statistics from World Bank', ['health_nutrition_population']],
  ['iowa_liquor_sales', 'Iowa Liquor Sales', 'economics', 'Every wholesale purchase of liquor in Iowa since 2012', ['sales']],
  ['sec_quarterly_financials', 'SEC Quarterly Financials', 'finance', 'Quarterly financial statements from SEC filings', ['financials']],
  ['fdic_banks', 'FDIC Banks', 'finance', 'FDIC-insured banking institution data', ['institutions', 'locations']],

  // === HEALTHCARE ===
  ['cms_medicare', 'CMS Medicare', 'health', 'Medicare provider utilization and payment data', ['inpatient_charges_*', 'home_health_agencies_*']],
  ['cms_synthetic_patient_data_omop', 'CMS Synthetic Patient Data', 'health', 'Synthetic claims data in OMOP format', ['care_site', 'condition_occurrence', 'drug_exposure', 'person', 'visit_occurrence']],
  ['fda_food', 'FDA Food', 'health', 'FDA food enforcement and recall data', ['food_enforcement', 'food_events']],
  ['fda_drug', 'FDA Drug', 'health', 'FDA drug enforcement, events, and label data', ['drug_enforcement', 'drug_label']],
  ['nlm_rxnorm', 'NLM RxNorm', 'health', 'National Library of Medicine drug vocabulary', ['rxnconso', 'rxnrel']],
  ['idc_current', 'Imaging Data Commons', 'health', 'NCI cancer imaging data', ['dicom_all']],
  ['human_genome_variants', 'Human Genome Variants', 'health', 'Genomic variant data', ['platinum_genomes_deepvariant']],

  // === TECHNOLOGY & WEB ===
  ['github_repos', 'GitHub Repos', 'technology', 'Contents, commits, languages, licenses for public GitHub repos', ['commits', 'contents', 'files', 'languages', 'licenses', 'sample_commits', 'sample_contents', 'sample_files']],
  ['stackoverflow', 'Stack Overflow', 'technology', 'Complete dump of Stack Overflow Q&A: posts, users, votes, comments', ['posts_questions', 'posts_answers', 'users', 'votes', 'comments', 'tags', 'badges']],
  ['hacker_news', 'Hacker News', 'technology', 'Posts, comments, and votes from Hacker News', ['full', 'comments', 'stories']],
  ['wikipedia', 'Wikipedia', 'technology', 'Wikipedia pageview statistics and revision history', ['pageviews_*']],
  ['google_trends', 'Google Trends', 'technology', 'Google search trend data by region and time', ['international_top_terms', 'international_top_rising_terms', 'top_terms', 'top_rising_terms']],
  ['google_analytics_sample', 'Google Analytics Sample', 'technology', 'Sample Google Analytics 360 data for e-commerce site', ['ga_sessions_*']],
  ['ga4_obfuscated_sample_ecommerce', 'GA4 Sample E-commerce', 'technology', 'Obfuscated Google Analytics 4 e-commerce data', ['events_*']],
  ['deps_dev_v1', 'Deps.dev', 'technology', 'Open source package dependency data', ['advisories', 'dependencies', 'packages', 'versions']],

  // === MEDIA & REFERENCE ===
  ['bbc_news', 'BBC News', 'media', 'BBC news article full text', ['fulltext']],
  ['samples', 'BigQuery Samples', 'reference', 'Sample tables: Shakespeare, natality, weather, GitHub, Wikipedia', ['gsod', 'github_nested', 'github_timeline', 'natality', 'shakespeare', 'trigrams', 'wikipedia']],
  ['ml_datasets', 'ML Datasets', 'reference', 'Classic ML datasets: iris, penguins, credit cards, census income', ['iris', 'penguins', 'credit_card_default', 'census_adult_income', 'ulb_fraud_detection']],
  ['thelook_ecommerce', 'TheLook E-commerce', 'reference', 'Synthetic e-commerce dataset for analytics practice', ['orders', 'order_items', 'products', 'users', 'events', 'inventory_items', 'distribution_centers']],

  // === GEOSPATIAL ===
  ['geo_openstreetmap', 'OpenStreetMap', 'geospatial', 'OpenStreetMap planet data loaded into BigQuery', ['planet_features', 'planet_nodes', 'planet_ways', 'planet_relations']],
  ['geo_international_ports', 'International Ports', 'geospatial', 'World port locations and attributes', ['world_port_index']],
  ['overture_maps', 'Overture Maps', 'geospatial', 'Overture Maps open map data: places, buildings, transport', ['place', 'building', 'segment', 'connector', 'division', 'address']],
  ['natural_earth', 'Natural Earth', 'geospatial', 'Global vector data: countries, boundaries, rivers, lakes', ['feature_collection']],

  // === ENERGY ===
  ['sunroof_solar', 'Project Sunroof', 'energy', 'Google solar potential estimates for buildings', ['solar_potential_by_censustract', 'solar_potential_by_postal_code']],
  ['utility_us', 'US Utility Data', 'energy', 'US electric utility service territories and rates', []],

  // === SPORTS ===
  ['baseball', 'Baseball', 'sports', 'Historical Major League Baseball statistics', ['games_wide', 'games_post_wide', 'schedules']],
  ['ncaa_basketball', 'NCAA Basketball', 'sports', 'NCAA tournament data for men and women', ['mbb_games_sr', 'mbb_players_games_sr', 'wbb_games_sr']],

  // === INTELLECTUAL PROPERTY ===
  ['patents', 'Google Patents', 'intellectual_property', 'Patent publications and research from Google Patents', ['publications']],
  ['patents_view', 'PatentsView', 'intellectual_property', 'USPTO patent data: assignees, inventors, claims', ['patent', 'assignee', 'inventor', 'claim']],

  // === BLOCKCHAIN (top ones — full list in Web3 doc) ===
  ['crypto_bitcoin', 'Bitcoin Blockchain', 'blockchain', 'Bitcoin transactions and blocks', ['transactions', 'blocks', 'inputs', 'outputs']],
  ['crypto_ethereum', 'Ethereum Blockchain', 'blockchain', 'Ethereum transactions, blocks, smart contracts — daily updates', ['transactions', 'blocks', 'contracts', 'logs', 'token_transfers', 'traces']],
  ['crypto_polygon_mainnet', 'Polygon Blockchain', 'blockchain', 'Polygon network transactions and blocks', ['transactions', 'blocks', 'logs']],
  ['crypto_litecoin', 'Litecoin Blockchain', 'blockchain', 'Litecoin blockchain data', ['transactions', 'blocks']],
  ['crypto_dogecoin', 'Dogecoin Blockchain', 'blockchain', 'Dogecoin blockchain data', ['transactions', 'blocks']],
  ['crypto_bitcoin_cash', 'Bitcoin Cash Blockchain', 'blockchain', 'Bitcoin Cash blockchain data', ['transactions', 'blocks']],
  ['crypto_dash', 'Dash Blockchain', 'blockchain', 'Dash blockchain data', ['transactions', 'blocks']],
  ['crypto_zcash', 'Zcash Blockchain', 'blockchain', 'Zcash blockchain data', ['transactions', 'blocks']],
  ['crypto_ethereum_classic', 'Ethereum Classic Blockchain', 'blockchain', 'Ethereum Classic blockchain data', ['transactions', 'blocks']],
  ['crypto_solana_mainnet_us', 'Solana Blockchain', 'blockchain', 'Solana mainnet blockchain data', ['transactions', 'blocks']],
  ['crypto_near_mainnet', 'NEAR Protocol', 'blockchain', 'NEAR Protocol transactions', ['transactions', 'blocks']],
  ['crypto_aptos_mainnet_us', 'Aptos Blockchain', 'blockchain', 'Aptos mainnet blockchain data', ['transactions', 'blocks']],
  ['crypto_sui_mainnet_us', 'Sui Blockchain', 'blockchain', 'Sui mainnet blockchain data', ['transactions', 'blocks']],
  ['crypto_tezos_dataset', 'Tezos Blockchain', 'blockchain', 'Tezos distributed ledger data', ['transactions', 'blocks']],

  // === OTHER / MISCELLANEOUS ===
  ['open_targets_platform', 'Open Targets Platform', 'health', 'Drug target identification and validation data', ['molecule', 'target', 'disease', 'evidence']],
  ['open_targets_genetics', 'Open Targets Genetics', 'health', 'Genetics evidence for drug target identification', ['variants', 'studies', 'locus2gene']],
  ['google_cloud_release_notes', 'Google Cloud Release Notes', 'technology', 'GCP product release notes and changes', ['release_notes']],
  ['google_political_ads', 'Google Political Ads', 'elections', 'Google political advertising transparency data', ['advertiser_stats', 'creative_stats', 'geo_spend']],
  ['covid19_open_data', 'COVID-19 Open Data', 'health', 'Aggregated COVID-19 epidemiological data', ['covid19_open_data']],
  ['covid19_jhu_csse', 'COVID-19 JHU', 'health', 'Johns Hopkins COVID-19 case data', ['summary', 'confirmed_cases', 'deaths', 'recovered_cases']],
  ['covid19_nyt', 'COVID-19 NYT', 'health', 'New York Times COVID-19 data', ['us_states', 'us_counties']],
  ['covid19_google_mobility', 'COVID-19 Google Mobility', 'health', 'Google community mobility reports during COVID-19', ['mobility_report']],
  ['gdelt_full', 'GDELT Full', 'media', 'Global Database of Events, Language, and Tone — world events', ['events', 'eventmentions']],
  ['america_health_rankings', 'America Health Rankings', 'health', 'State health rankings and measures', ['ahr']],
  ['labeled_patents', 'Labeled Patents', 'intellectual_property', 'Patents with CPC classification labels', []],
  ['new_york_311', 'NYC 311', 'public_safety', 'NYC 311 service requests', ['service_requests']],
  ['new_york_trees', 'NYC Trees', 'environment', 'NYC tree census data', ['tree_census_*']],
  ['san_francisco_311', 'SF 311', 'public_safety', 'San Francisco 311 service requests', ['service_requests']],
  ['san_francisco_film_locations', 'SF Film Locations', 'media', 'Movie filming locations in San Francisco', ['film_locations']],
  ['chicago_health', 'Chicago Health', 'health', 'Chicago public health statistics', []],
  ['usa_contagious_disease', 'US Contagious Disease', 'health', 'Historical US contagious disease cases by state', ['project_tycho_reports']],
  ['breathe', 'Breathe London', 'environment', 'London air quality monitoring data', ['london_pm25']],
  ['london_crime', 'London Crime', 'public_safety', 'London crime data by borough', ['crime_by_lsoa']],
];

const domainMap = {
  weather: 'environment',
  demographics: 'demographics',
  geospatial: 'demographics',
  environment: 'environment',
  transportation: 'transportation',
  public_safety: 'public_safety',
  economics: 'finance',
  finance: 'finance',
  health: 'health',
  technology: 'technology',
  media: 'technology',
  reference: 'technology',
  energy: 'energy',
  sports: 'demographics',
  intellectual_property: 'legal',
  blockchain: 'finance',
  elections: 'elections',
};

function buildRecord([datasetId, name, category, description, tables]) {
  const columns = tables.map(t => ({
    name: t,
    field_name: t,
    type: 'text',
    description: `Table in ${datasetId}`,
  }));

  return {
    id: `bigquery-public-data.${datasetId}`,
    name,
    provider: 'Google (BigQuery Public Datasets Program)',
    source_portal: 'bigquery-public-data',
    source_platform: 'bigquery',
    url: `https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=${datasetId}&page=dataset`,
    api_endpoint: `bigquery-public-data.${datasetId}`,
    documentation_url: `https://console.cloud.google.com/marketplace/product/city-of-new-york/nypd-motor-vehicle-collisions?filter=solution-type:dataset&q=${encodeURIComponent(name)}`,
    access_method: 'sql',
    format: ['sql', 'csv', 'json'],
    geographic_scope: guessGeo(datasetId, name),
    geographic_detail: guessGeoDetail(datasetId, name),
    domain: domainMap[category] || 'unknown',
    category,
    update_frequency: 'unknown',
    row_count: null,
    column_count: null,
    columns,
    tags: [category, 'bigquery', 'public-data'],
    description,
    last_updated: null,
    created_at: null,
    collected_at: new Date().toISOString(),
  };
}

function guessGeo(id, name) {
  if (name.match(/NYC|New York|Chicago|Austin|San Francisco|London/i)) return 'us_city';
  if (name.match(/US |USA |American|Iowa|Census Bureau/i)) return 'us_national';
  if (name.match(/World|International|Global|GDELT/i)) return 'global';
  if (name.match(/London|Breathe/i)) return 'global';
  return 'varies';
}

function guessGeoDetail(id, name) {
  if (name.match(/NYC|New York/i)) return 'New York City';
  if (name.match(/Chicago/i)) return 'Chicago, IL';
  if (name.match(/Austin/i)) return 'Austin, TX';
  if (name.match(/San Francisco|SF/i)) return 'San Francisco, CA';
  if (name.match(/London/i)) return 'London, UK';
  if (name.match(/Iowa/i)) return 'Iowa';
  return null;
}

const records = datasets.map(buildRecord);
const outputPath = 'D:/Projects/wa-data-catalog/schemas/bigquery.jsonl';
const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
fs.writeFileSync(outputPath, lines);

console.log(`Wrote ${records.length} BigQuery public dataset schema records to bigquery.jsonl`);

// Category breakdown
const cats = {};
records.forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1; });
Object.entries(cats).sort((a,b) => b[1]-a[1]).forEach(([c,n]) => console.log(`  ${c}: ${n}`));
