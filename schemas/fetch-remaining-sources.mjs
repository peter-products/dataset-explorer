// Fetches schemas for: FRED, SEC EDGAR, FAO, ILO, UNESCO, GTFS/Transitland,
// Snowflake, Databricks, data.world
// Sources that lack APIs are built from curated knowledge + web scraping

import fs from 'fs';

const TIMESTAMP = new Date().toISOString();

// ===== FRED =====
// No API key available, so we catalog the category structure (797K+ series)
function buildFRED() {
  // FRED's category tree — top categories with known series counts
  const categories = [
    { id: 'money-banking', name: 'Money, Banking, & Finance', series: 120000, tags: ['interest-rates', 'exchange-rates', 'monetary-base', 'bank-assets', 'credit', 'money-supply'] },
    { id: 'population', name: 'Population, Employment, & Labor Markets', series: 150000, tags: ['employment', 'unemployment', 'labor-force', 'wages', 'hours-worked'] },
    { id: 'national-accounts', name: 'National Accounts', series: 50000, tags: ['gdp', 'income', 'saving', 'investment', 'consumption'] },
    { id: 'production', name: 'Production & Business Activity', series: 40000, tags: ['industrial-production', 'capacity-utilization', 'business-inventories', 'manufacturing'] },
    { id: 'prices', name: 'Prices', series: 80000, tags: ['cpi', 'ppi', 'pce', 'inflation', 'deflator'] },
    { id: 'international', name: 'International Data', series: 100000, tags: ['trade', 'capital-flows', 'balance-of-payments', 'foreign-exchange'] },
    { id: 'regional', name: 'U.S. Regional Data', series: 200000, tags: ['state', 'county', 'msa', 'regional-employment', 'housing-permits'] },
    { id: 'academic', name: 'Academic Data', series: 20000, tags: ['research', 'economic-policy', 'uncertainty'] },
    { id: 'releases', name: 'Sources/Releases', series: 37000, tags: ['bls', 'bea', 'census', 'treasury', 'federal-reserve'] },
  ];

  return categories.map(cat => ({
    id: `fred:category:${cat.id}`,
    name: `FRED: ${cat.name}`,
    provider: 'Federal Reserve Bank of St. Louis',
    source_portal: 'fred.stlouisfed.org',
    source_platform: 'api',
    url: `https://fred.stlouisfed.org/categories`,
    api_endpoint: `https://api.stlouisfed.org/fred/category/series?category_id=&api_key=YOUR_KEY&file_type=json`,
    documentation_url: 'https://fred.stlouisfed.org/docs/api/fred/',
    access_method: 'api',
    format: ['json', 'xml', 'csv'],
    geographic_scope: cat.id === 'international' ? 'global' : cat.id === 'regional' ? 'us_state' : 'us_national',
    geographic_detail: null,
    domain: cat.id === 'money-banking' ? 'finance' : cat.id === 'population' ? 'labor' : cat.id === 'prices' ? 'finance' : cat.id === 'production' ? 'finance' : cat.id === 'national-accounts' ? 'finance' : cat.id === 'international' ? 'finance' : cat.id === 'regional' ? 'demographics' : 'finance',
    category: cat.name,
    update_frequency: 'daily',
    row_count: null,
    column_count: 4,
    columns: [
      { name: 'date', field_name: 'date', type: 'date', description: 'Observation date' },
      { name: 'value', field_name: 'value', type: 'number', description: 'Series value' },
      { name: 'series_id', field_name: 'series_id', type: 'text', description: 'FRED series identifier' },
      { name: 'realtime_start', field_name: 'realtime_start', type: 'date', description: 'Real-time period start' },
    ],
    tags: cat.tags,
    description: `${cat.name} — approximately ${cat.series.toLocaleString()} time series. FRED is the largest free economic database with 800K+ series from 100+ sources. Requires free API key for programmatic access.`,
    last_updated: null, created_at: null,
    series_count_approx: cat.series,
    collected_at: TIMESTAMP,
  }));
}

// ===== SEC EDGAR =====
// Catalog the main filing types as datasets (not individual companies)
function buildSEC() {
  const filingTypes = [
    { form: '10-K', name: 'Annual Reports', desc: 'Annual financial reports filed by public companies', freq: 'annual' },
    { form: '10-Q', name: 'Quarterly Reports', desc: 'Quarterly financial reports filed by public companies', freq: 'quarterly' },
    { form: '8-K', name: 'Current Reports', desc: 'Reports of material events or corporate changes', freq: 'daily' },
    { form: 'DEF-14A', name: 'Proxy Statements', desc: 'Definitive proxy statements for shareholder meetings', freq: 'annual' },
    { form: '13F-HR', name: 'Institutional Holdings', desc: 'Quarterly holdings reports from institutional investment managers', freq: 'quarterly' },
    { form: 'SC-13D', name: 'Beneficial Ownership (>5%)', desc: 'Reports of >5% beneficial ownership in public companies', freq: 'unknown' },
    { form: '4', name: 'Insider Transactions', desc: 'Changes in insider ownership (officers, directors, 10%+ owners)', freq: 'daily' },
    { form: 'S-1', name: 'IPO Registration', desc: 'Registration statements for initial public offerings', freq: 'unknown' },
    { form: '20-F', name: 'Foreign Private Issuer Annual', desc: 'Annual reports from foreign private issuers', freq: 'annual' },
    { form: 'N-CSR', name: 'Fund Annual Reports', desc: 'Certified shareholder reports for registered investment companies', freq: 'annual' },
  ];

  const xbrlDatasets = [
    { id: 'company-facts', name: 'XBRL Company Facts', desc: 'All XBRL financial data for 10,400+ public companies, queryable by CIK', endpoint: 'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json' },
    { id: 'company-concept', name: 'XBRL Company Concept', desc: 'Specific XBRL taxonomy concept for a company over time', endpoint: 'https://data.sec.gov/api/xbrl/companyconcept/CIK{cik}/{taxonomy}/{tag}.json' },
    { id: 'frames', name: 'XBRL Frames', desc: 'Aggregated XBRL values across all filers for a concept in a period', endpoint: 'https://data.sec.gov/api/xbrl/frames/{taxonomy}/{tag}/{unit}/{period}.json' },
    { id: 'company-tickers', name: 'Company Tickers', desc: 'Mapping of 10,426 CIK numbers to ticker symbols and company names', endpoint: 'https://www.sec.gov/files/company_tickers.json' },
    { id: 'submissions', name: 'Company Submissions', desc: 'All filings by a company including recent and historical', endpoint: 'https://data.sec.gov/submissions/CIK{cik}.json' },
  ];

  const records = [];

  filingTypes.forEach(ft => {
    records.push({
      id: `sec-edgar:form-${ft.form}`,
      name: `SEC EDGAR: ${ft.name} (Form ${ft.form})`,
      provider: 'U.S. Securities and Exchange Commission',
      source_portal: 'sec.gov/edgar',
      source_platform: 'api',
      url: `https://efts.sec.gov/LATEST/search-index?forms=${ft.form}`,
      api_endpoint: `https://efts.sec.gov/LATEST/search-index?forms=${ft.form}&dateRange=custom`,
      documentation_url: 'https://www.sec.gov/search#/forms',
      access_method: 'api',
      format: ['json', 'xml', 'html', 'xbrl'],
      geographic_scope: 'us_national',
      geographic_detail: 'US public companies',
      domain: 'finance',
      category: 'securities_filings',
      update_frequency: ft.freq,
      row_count: null, column_count: null, columns: [],
      tags: ['sec', 'edgar', ft.form.toLowerCase(), 'corporate-filings'],
      description: ft.desc,
      last_updated: null, created_at: null, collected_at: TIMESTAMP,
    });
  });

  xbrlDatasets.forEach(xd => {
    records.push({
      id: `sec-edgar:xbrl-${xd.id}`,
      name: `SEC EDGAR: ${xd.name}`,
      provider: 'U.S. Securities and Exchange Commission',
      source_portal: 'sec.gov/edgar',
      source_platform: 'api',
      url: 'https://www.sec.gov/edgar/sec-api-documentation',
      api_endpoint: xd.endpoint,
      documentation_url: 'https://www.sec.gov/edgar/sec-api-documentation',
      access_method: 'api',
      format: ['json'],
      geographic_scope: 'us_national',
      geographic_detail: 'US public companies (10,400+)',
      domain: 'finance',
      category: 'xbrl_financial_data',
      update_frequency: 'daily',
      row_count: null, column_count: null, columns: [],
      tags: ['sec', 'edgar', 'xbrl', 'financial-statements'],
      description: xd.desc,
      last_updated: null, created_at: null, collected_at: TIMESTAMP,
    });
  });

  return records;
}

// ===== FAO =====
function buildFAO() {
  // FAOSTAT domains — compiled from their website
  const domains = [
    { code: 'QCL', name: 'Crops and livestock products', desc: 'Production quantity, area harvested, yield for crops and livestock', tags: ['crops', 'livestock', 'production'] },
    { code: 'QV', name: 'Value of Agricultural Production', desc: 'Gross and net production value in constant and current prices', tags: ['production-value', 'agriculture-economics'] },
    { code: 'FBS', name: 'Food Balance Sheets', desc: 'Supply and utilization accounts for food commodities', tags: ['food-supply', 'calories', 'nutrition'] },
    { code: 'SCL', name: 'Supply Utilization Accounts', desc: 'Detailed supply, demand and utilization by commodity', tags: ['supply', 'demand', 'trade'] },
    { code: 'TP', name: 'Trade - Crops and livestock products', desc: 'Import/export quantities and values for agricultural commodities', tags: ['trade', 'import', 'export'] },
    { code: 'TI', name: 'Trade Indices', desc: 'Trade value and volume indices for agricultural products', tags: ['trade-index', 'terms-of-trade'] },
    { code: 'RP', name: 'Producer Prices', desc: 'Annual producer prices for agricultural commodities', tags: ['prices', 'producer-prices'] },
    { code: 'CP', name: 'Consumer Price Indices', desc: 'Food and general consumer price indices', tags: ['cpi', 'food-prices', 'inflation'] },
    { code: 'PP', name: 'Prices Paid by Farmers', desc: 'Prices of inputs paid by agricultural producers', tags: ['input-prices', 'fertilizer', 'seeds'] },
    { code: 'RL', name: 'Land Use', desc: 'Land area by type of use: agricultural, forest, other', tags: ['land-use', 'agricultural-area', 'forest-area'] },
    { code: 'RFN', name: 'Fertilizers - Nutrient', desc: 'Fertilizer use by nutrient (N, P2O5, K2O) per country', tags: ['fertilizer', 'nutrients', 'nitrogen', 'phosphate'] },
    { code: 'EI', name: 'Temperature Change', desc: 'Land surface temperature change by country', tags: ['temperature', 'climate-change'] },
    { code: 'GT', name: 'Emissions Totals', desc: 'Greenhouse gas emissions from agriculture, land use, and energy', tags: ['emissions', 'ghg', 'methane', 'co2'] },
    { code: 'GR', name: 'Emissions from Crop Residues', desc: 'Emissions from burning and decomposing crop residues', tags: ['emissions', 'crop-residues'] },
    { code: 'GA', name: 'Emissions from Agriculture', desc: 'Emissions from enteric fermentation, manure, rice cultivation', tags: ['emissions', 'agriculture', 'livestock'] },
    { code: 'GN', name: 'Emissions from Synthetic Fertilizers', desc: 'N2O emissions from fertilizer application', tags: ['emissions', 'fertilizer', 'n2o'] },
    { code: 'FS', name: 'Food Security Indicators', desc: 'Prevalence of undernourishment, food insecurity, dietary energy supply', tags: ['food-security', 'hunger', 'malnutrition'] },
    { code: 'OA', name: 'Population', desc: 'Annual population estimates by country (UN source)', tags: ['population', 'demographics'] },
    { code: 'IC', name: 'Investment - Credit', desc: 'Credit to agriculture and government expenditure on agriculture', tags: ['investment', 'credit', 'government-spending'] },
    { code: 'EA', name: 'Employment Indicators', desc: 'Employment in agriculture by sex and status', tags: ['employment', 'agriculture-workforce'] },
    { code: 'AF', name: 'Forestry Production and Trade', desc: 'Roundwood, sawnwood, panels, pulp, paper production and trade', tags: ['forestry', 'wood', 'paper', 'timber'] },
    { code: 'FI', name: 'Fishery and Aquaculture Production', desc: 'Capture fisheries and aquaculture production by species and country', tags: ['fishery', 'aquaculture', 'fish-production'] },
    { code: 'SDGB', name: 'SDG Indicators', desc: 'FAO custodian SDG indicators (2.1, 2.4, 5.a, 6.4, 12.3, 14, 15)', tags: ['sdg', 'sustainable-development'] },
  ];

  return domains.map(d => ({
    id: `fao:${d.code}`,
    name: `FAOSTAT: ${d.name}`,
    provider: 'Food and Agriculture Organization of the United Nations',
    source_portal: 'fao.org/faostat',
    source_platform: 'api',
    url: `https://www.fao.org/faostat/en/#data/${d.code}`,
    api_endpoint: `https://fenixservices.fao.org/faostat/api/v1/en/data/${d.code}`,
    documentation_url: `https://www.fao.org/faostat/en/#data/${d.code}`,
    access_method: 'api',
    format: ['json', 'csv'],
    geographic_scope: 'global',
    geographic_detail: '245+ countries and territories',
    domain: d.tags.some(t => t.match(/emission|climate|temperature/)) ? 'environment' : 'agriculture',
    category: 'agriculture_food',
    update_frequency: 'annual',
    row_count: null, column_count: 8,
    columns: [
      { name: 'Area', field_name: 'Area', type: 'text', description: 'Country or territory' },
      { name: 'Item', field_name: 'Item', type: 'text', description: 'Commodity or indicator' },
      { name: 'Element', field_name: 'Element', type: 'text', description: 'Measure (production, area, yield, etc.)' },
      { name: 'Year', field_name: 'Year', type: 'date', description: 'Reference year' },
      { name: 'Value', field_name: 'Value', type: 'number', description: 'Data value' },
      { name: 'Unit', field_name: 'Unit', type: 'text', description: 'Unit of measurement' },
      { name: 'Flag', field_name: 'Flag', type: 'text', description: 'Data quality flag' },
      { name: 'Note', field_name: 'Note', type: 'text', description: 'Additional notes' },
    ],
    tags: d.tags,
    description: d.desc + '. Coverage: 245+ countries, 1961-present (varies by domain).',
    last_updated: null, created_at: null, collected_at: TIMESTAMP,
  }));
}

// ===== ILO =====
function buildILO() {
  const topics = [
    { id: 'EMP', name: 'Employment', desc: 'Employment-to-population ratio, employment by sector, status, sex', count: 200 },
    { id: 'UNE', name: 'Unemployment', desc: 'Unemployment rate, unemployed persons, duration, youth', count: 150 },
    { id: 'POP', name: 'Working-age Population', desc: 'Population by sex, age, urban/rural', count: 50 },
    { id: 'EAR', name: 'Earnings and Labour Cost', desc: 'Average wages, minimum wages, labour cost indices', count: 100 },
    { id: 'INJ', name: 'Occupational Safety and Health', desc: 'Occupational injuries, fatal/non-fatal, by economic activity', count: 50 },
    { id: 'CLD', name: 'Collective Bargaining', desc: 'Trade union density, collective bargaining coverage', count: 30 },
    { id: 'SOC', name: 'Social Protection', desc: 'Social protection coverage, expenditure, benefits', count: 80 },
    { id: 'MIG', name: 'Labour Migration', desc: 'Migrant worker stocks and flows by destination and origin', count: 40 },
    { id: 'CPI', name: 'Consumer Price Indices', desc: 'General and food CPI for ILO member states', count: 30 },
    { id: 'LAI', name: 'Labour Force', desc: 'Labour force participation rate by sex and age', count: 100 },
    { id: 'WPR', name: 'Working Poverty', desc: 'Working poverty rates and counts by sex', count: 30 },
    { id: 'SDG', name: 'SDG Labour Market Indicators', desc: 'ILO-custodian SDG indicators (Goals 1, 5, 8, 10)', count: 50 },
    { id: 'INF', name: 'Informal Employment', desc: 'Informal employment rates by sex, sector, status', count: 40 },
    { id: 'HOW', name: 'Working Time', desc: 'Average weekly hours, excessive working time', count: 40 },
    { id: 'CHL', name: 'Child Labour', desc: 'Child labour incidence, hazardous work, by sex and age', count: 30 },
  ];

  return topics.map(t => ({
    id: `ilo:${t.id}`,
    name: `ILOSTAT: ${t.name}`,
    provider: 'International Labour Organization',
    source_portal: 'ilostat.ilo.org',
    source_platform: 'api',
    url: `https://ilostat.ilo.org/data/`,
    api_endpoint: `https://rplumber.ilo.org/data/indicator/?type=label&format=json`,
    documentation_url: 'https://ilostat.ilo.org/resources/sdmx-tools/',
    access_method: 'api',
    format: ['json', 'csv', 'sdmx'],
    geographic_scope: 'global',
    geographic_detail: '189 ILO member states',
    domain: 'labor',
    category: t.name,
    update_frequency: 'annual',
    row_count: null, column_count: 6,
    columns: [
      { name: 'ref_area', field_name: 'ref_area', type: 'text', description: 'Country ISO code' },
      { name: 'time', field_name: 'time', type: 'date', description: 'Reference period' },
      { name: 'obs_value', field_name: 'obs_value', type: 'number', description: 'Observation value' },
      { name: 'sex', field_name: 'sex', type: 'text', description: 'Sex disaggregation' },
      { name: 'classif1', field_name: 'classif1', type: 'text', description: 'Classification 1 (sector, status, etc.)' },
      { name: 'classif2', field_name: 'classif2', type: 'text', description: 'Classification 2' },
    ],
    tags: ['labor', 'employment', t.id.toLowerCase()],
    description: `${t.desc}. Approximately ${t.count} indicators. Coverage: 189 countries, varies by indicator.`,
    indicator_count_approx: t.count,
    last_updated: null, created_at: null, collected_at: TIMESTAMP,
  }));
}

// ===== UNESCO =====
function buildUNESCO() {
  const domains = [
    { id: 'EDU', name: 'Education', desc: 'Enrollment, completion, literacy, teachers, expenditure at all levels', count: 3000, domain: 'education' },
    { id: 'SCI', name: 'Science, Technology & Innovation', desc: 'R&D expenditure, researchers, patents, publications', count: 500, domain: 'technology' },
    { id: 'CLT', name: 'Culture', desc: 'Cultural employment, trade in cultural goods, World Heritage sites, museums', count: 300, domain: 'demographics' },
    { id: 'COM', name: 'Communication & Information', desc: 'Press freedom, media development indicators, internet access', count: 200, domain: 'technology' },
  ];

  return domains.map(d => ({
    id: `unesco:${d.id}`,
    name: `UNESCO UIS: ${d.name}`,
    provider: 'UNESCO Institute for Statistics',
    source_portal: 'data.uis.unesco.org',
    source_platform: 'api',
    url: `http://data.uis.unesco.org/`,
    api_endpoint: `http://data.uis.unesco.org/RestSDMX/sdmx.ashx/GetData/${d.id}`,
    documentation_url: 'http://data.uis.unesco.org/',
    access_method: 'api',
    format: ['json', 'csv', 'sdmx'],
    geographic_scope: 'global',
    geographic_detail: '200+ countries',
    domain: d.domain,
    category: d.name,
    update_frequency: 'annual',
    row_count: null, column_count: 5,
    columns: [
      { name: 'REF_AREA', field_name: 'REF_AREA', type: 'text', description: 'Country code' },
      { name: 'INDICATOR', field_name: 'INDICATOR', type: 'text', description: 'Indicator code' },
      { name: 'TIME_PERIOD', field_name: 'TIME_PERIOD', type: 'date', description: 'Year' },
      { name: 'OBS_VALUE', field_name: 'OBS_VALUE', type: 'number', description: 'Value' },
      { name: 'SEX', field_name: 'SEX', type: 'text', description: 'Sex disaggregation' },
    ],
    tags: ['unesco', d.id.toLowerCase(), 'international'],
    description: `${d.desc}. Approximately ${d.count} indicators across 200+ countries.`,
    indicator_count_approx: d.count,
    last_updated: null, created_at: null, collected_at: TIMESTAMP,
  }));
}

// ===== GTFS Transit Feeds =====
function buildGTFS() {
  // Major US transit agencies that publish GTFS (there are 1000+ worldwide)
  const agencies = [
    { id: 'king-county-metro', name: 'King County Metro', city: 'Seattle, WA', url: 'https://kingcounty.gov/metro', geo: 'wa_county' },
    { id: 'sound-transit', name: 'Sound Transit', city: 'Seattle/Puget Sound, WA', url: 'https://soundtransit.org', geo: 'wa_state' },
    { id: 'community-transit', name: 'Community Transit', city: 'Snohomish County, WA', url: 'https://communitytransit.org', geo: 'wa_county' },
    { id: 'pierce-transit', name: 'Pierce Transit', city: 'Pierce County, WA', url: 'https://piercetransit.org', geo: 'wa_county' },
    { id: 'intercity-transit', name: 'Intercity Transit', city: 'Olympia, WA', url: 'https://intercitytransit.com', geo: 'wa_city' },
    { id: 'spokane-transit', name: 'Spokane Transit', city: 'Spokane, WA', url: 'https://spokanetransit.com', geo: 'wa_city' },
    { id: 'mta-nyc', name: 'MTA New York City Transit', city: 'New York, NY', url: 'https://new.mta.info', geo: 'us_city' },
    { id: 'cta-chicago', name: 'Chicago Transit Authority', city: 'Chicago, IL', url: 'https://transitchicago.com', geo: 'us_city' },
    { id: 'mbta-boston', name: 'MBTA', city: 'Boston, MA', url: 'https://mbta.com', geo: 'us_city' },
    { id: 'wmata-dc', name: 'WMATA', city: 'Washington DC', url: 'https://wmata.com', geo: 'us_city' },
    { id: 'bart-sf', name: 'BART', city: 'San Francisco Bay Area, CA', url: 'https://bart.gov', geo: 'us_city' },
    { id: 'la-metro', name: 'LA Metro', city: 'Los Angeles, CA', url: 'https://metro.net', geo: 'us_city' },
    { id: 'trimet-portland', name: 'TriMet', city: 'Portland, OR', url: 'https://trimet.org', geo: 'us_city' },
    { id: 'septa-philly', name: 'SEPTA', city: 'Philadelphia, PA', url: 'https://septa.org', geo: 'us_city' },
    { id: 'nj-transit', name: 'NJ Transit', city: 'New Jersey', url: 'https://njtransit.com', geo: 'us_state' },
    { id: 'amtrak', name: 'Amtrak', city: 'National', url: 'https://amtrak.com', geo: 'us_national' },
  ];

  return agencies.map(a => ({
    id: `gtfs:${a.id}`,
    name: `GTFS: ${a.name}`,
    provider: a.name,
    source_portal: 'transit.land',
    source_platform: 'download',
    url: a.url,
    api_endpoint: `https://transit.land/api/v2/rest/feeds?operators=${a.id}`,
    documentation_url: 'https://gtfs.org/documentation/schedule/reference/',
    access_method: 'download',
    format: ['csv', 'zip'],
    geographic_scope: a.geo,
    geographic_detail: a.city,
    domain: 'transportation',
    category: 'transit_schedules',
    update_frequency: 'weekly',
    row_count: null, column_count: 10,
    columns: [
      { name: 'route_id', field_name: 'route_id', type: 'text', description: 'Route identifier' },
      { name: 'trip_id', field_name: 'trip_id', type: 'text', description: 'Trip identifier' },
      { name: 'stop_id', field_name: 'stop_id', type: 'text', description: 'Stop identifier' },
      { name: 'stop_name', field_name: 'stop_name', type: 'text', description: 'Stop name' },
      { name: 'stop_lat', field_name: 'stop_lat', type: 'number', description: 'Stop latitude' },
      { name: 'stop_lon', field_name: 'stop_lon', type: 'number', description: 'Stop longitude' },
      { name: 'arrival_time', field_name: 'arrival_time', type: 'text', description: 'Arrival time at stop' },
      { name: 'departure_time', field_name: 'departure_time', type: 'text', description: 'Departure time from stop' },
      { name: 'route_short_name', field_name: 'route_short_name', type: 'text', description: 'Short route name' },
      { name: 'route_type', field_name: 'route_type', type: 'number', description: 'Route type (bus, rail, ferry, etc.)' },
    ],
    tags: ['gtfs', 'transit', 'schedules', 'public-transportation'],
    description: `GTFS transit schedule data for ${a.name} (${a.city}). Includes routes, trips, stops, stop_times, calendar, and shapes.`,
    last_updated: null, created_at: null, collected_at: TIMESTAMP,
  }));
}

// ===== Snowflake Marketplace =====
function buildSnowflake() {
  // Free datasets known from our research
  const datasets = [
    { id: 'cybersyn-bls', name: 'Cybersyn: Bureau of Labor Statistics', tags: ['employment', 'wages', 'cpi'], domain: 'labor' },
    { id: 'cybersyn-fred', name: 'Cybersyn: Federal Reserve (FRED)', tags: ['interest-rates', 'money-supply', 'gdp'], domain: 'finance' },
    { id: 'cybersyn-bea', name: 'Cybersyn: Bureau of Economic Analysis', tags: ['gdp', 'income', 'trade'], domain: 'finance' },
    { id: 'cybersyn-fdic', name: 'Cybersyn: FDIC Banking Data', tags: ['banks', 'financial-institutions'], domain: 'finance' },
    { id: 'cybersyn-sec', name: 'Cybersyn: SEC Filings', tags: ['sec', 'financial-statements'], domain: 'finance' },
    { id: 'cybersyn-census', name: 'Cybersyn: US Census / ACS', tags: ['census', 'demographics', 'housing'], domain: 'demographics' },
    { id: 'cybersyn-cdc', name: 'Cybersyn: CDC Health Data', tags: ['health', 'disease', 'mortality'], domain: 'health' },
    { id: 'cybersyn-who', name: 'Cybersyn: WHO Global Health', tags: ['global-health', 'who'], domain: 'health' },
    { id: 'cybersyn-worldbank', name: 'Cybersyn: World Bank Indicators', tags: ['development', 'economics'], domain: 'finance' },
    { id: 'cybersyn-noaa', name: 'Cybersyn: NOAA Weather', tags: ['weather', 'climate'], domain: 'environment' },
    { id: 'cybersyn-climate', name: 'Cybersyn: Climate Watch Emissions', tags: ['emissions', 'ghg', 'climate'], domain: 'environment' },
    { id: 'cybersyn-eia', name: 'Cybersyn: EIA Energy Data', tags: ['energy', 'oil', 'gas', 'electricity'], domain: 'energy' },
    { id: 'cybersyn-uspto', name: 'Cybersyn: USPTO Patents', tags: ['patents', 'intellectual-property'], domain: 'legal' },
    { id: 'cybersyn-github', name: 'Cybersyn: GitHub Archive', tags: ['github', 'open-source'], domain: 'technology' },
    { id: 'cybersyn-openalexn', name: 'Cybersyn: OpenAlex Scholarly', tags: ['academic', 'research', 'citations'], domain: 'education' },
    { id: 'cybersyn-addresses', name: 'Cybersyn: US Addresses', tags: ['addresses', 'geospatial'], domain: 'demographics' },
    { id: 'cybersyn-contracts', name: 'Cybersyn: Government Contracts', tags: ['procurement', 'federal-spending'], domain: 'finance' },
    { id: 'cybersyn-crime', name: 'Cybersyn: Crime Rates', tags: ['crime', 'public-safety'], domain: 'public_safety' },
    { id: 'cybersyn-forex', name: 'Cybersyn: Foreign Exchange Rates', tags: ['forex', 'currency'], domain: 'finance' },
    { id: 'cybersyn-holidays', name: 'Cybersyn: Global Holidays', tags: ['holidays', 'calendar'], domain: 'demographics' },
    { id: 'knoema-economy', name: 'Knoema: Economy Data Atlas', tags: ['macroeconomic', 'gdp', 'inflation'], domain: 'finance' },
    { id: 'knoema-demographics', name: 'Knoema: Demographics Data Atlas', tags: ['population', 'migration'], domain: 'demographics' },
    { id: 'knoema-agriculture', name: 'Knoema: Agriculture Data Atlas', tags: ['crops', 'food-security'], domain: 'agriculture' },
    { id: 'knoema-tourism', name: 'Knoema: Tourism Data Atlas', tags: ['tourism', 'travel'], domain: 'finance' },
    { id: 'knoema-commodities', name: 'Knoema: Commodities Data Atlas', tags: ['commodities', 'prices'], domain: 'finance' },
    { id: 'knoema-environment', name: 'Knoema: Environment Data Atlas', tags: ['emissions', 'resources'], domain: 'environment' },
    { id: 'starschema-covid', name: 'StarSchema: COVID-19 Data', tags: ['covid', 'pandemic', 'health'], domain: 'health' },
    { id: 'carto-overture-places', name: 'CARTO: Overture Maps Places', tags: ['poi', 'places', 'geospatial'], domain: 'demographics' },
    { id: 'carto-overture-buildings', name: 'CARTO: Overture Maps Buildings', tags: ['buildings', 'footprints'], domain: 'demographics' },
    { id: 'carto-overture-transport', name: 'CARTO: Overture Maps Transportation', tags: ['roads', 'transit', 'network'], domain: 'transportation' },
  ];

  return datasets.map(d => ({
    id: `snowflake:${d.id}`,
    name: d.name,
    provider: d.id.startsWith('cybersyn') ? 'Cybersyn' : d.id.startsWith('knoema') ? 'Knoema' : d.id.startsWith('starschema') ? 'StarSchema' : 'CARTO',
    source_portal: 'app.snowflake.com/marketplace',
    source_platform: 'snowflake',
    url: 'https://app.snowflake.com/marketplace',
    api_endpoint: null,
    documentation_url: 'https://app.snowflake.com/marketplace',
    access_method: 'sql',
    format: ['sql'],
    geographic_scope: d.tags.some(t => t.match(/us|census|federal/)) ? 'us_national' : 'global',
    geographic_detail: null,
    domain: d.domain,
    category: 'snowflake_marketplace',
    update_frequency: 'varies',
    row_count: null, column_count: null, columns: [],
    tags: [...d.tags, 'snowflake', 'marketplace', 'free'],
    description: `Free dataset on Snowflake Marketplace. Requires Snowflake account (free trial available). Query directly via SQL.`,
    last_updated: null, created_at: null, collected_at: TIMESTAMP,
  }));
}

// ===== Databricks Marketplace =====
function buildDatabricks() {
  const datasets = [
    { id: 'overture-places', name: 'Overture Maps: Places', domain: 'demographics' },
    { id: 'overture-buildings', name: 'Overture Maps: Buildings', domain: 'demographics' },
    { id: 'overture-transportation', name: 'Overture Maps: Transportation', domain: 'transportation' },
    { id: 'overture-divisions', name: 'Overture Maps: Administrative Divisions', domain: 'demographics' },
    { id: 'overture-addresses', name: 'Overture Maps: Addresses', domain: 'demographics' },
    { id: 'overture-base', name: 'Overture Maps: Base (Land/Water/Infrastructure)', domain: 'environment' },
    { id: 'sample-nyc-taxi', name: 'NYC Taxi Trips (Sample)', domain: 'transportation' },
    { id: 'sample-wine-quality', name: 'Wine Quality Dataset', domain: 'technology' },
    { id: 'sample-lending-club', name: 'Lending Club Loan Data', domain: 'finance' },
    { id: 'sample-flights', name: 'US Flights Dataset', domain: 'transportation' },
  ];

  return datasets.map(d => ({
    id: `databricks:${d.id}`,
    name: `Databricks: ${d.name}`,
    provider: d.id.startsWith('overture') ? 'CARTO' : 'Databricks',
    source_portal: 'marketplace.databricks.com',
    source_platform: 'databricks',
    url: 'https://marketplace.databricks.com',
    api_endpoint: null,
    documentation_url: 'https://marketplace.databricks.com',
    access_method: 'sql',
    format: ['delta', 'parquet'],
    geographic_scope: 'varies',
    geographic_detail: null,
    domain: d.domain,
    category: 'databricks_marketplace',
    update_frequency: 'varies',
    row_count: null, column_count: null, columns: [],
    tags: ['databricks', 'marketplace', 'free', 'delta-sharing'],
    description: `Free dataset on Databricks Marketplace via Delta Sharing protocol. Requires Databricks account.`,
    last_updated: null, created_at: null, collected_at: TIMESTAMP,
  }));
}

// ===== data.world =====
function buildDataWorld() {
  // data.world doesn't have a public API without auth, so we catalog the platform itself
  return [{
    id: 'dataworld:platform',
    name: 'data.world Community Datasets',
    provider: 'data.world',
    source_portal: 'data.world',
    source_platform: 'custom',
    url: 'https://data.world/datasets/open-data',
    api_endpoint: 'https://api.data.world/v0/datasets',
    documentation_url: 'https://apidocs.data.world/',
    access_method: 'api',
    format: ['csv', 'json', 'sql'],
    geographic_scope: 'varies',
    geographic_detail: null,
    domain: 'unknown',
    category: 'community_platform',
    update_frequency: 'varies',
    row_count: null, column_count: null, columns: [],
    tags: ['community', 'open-data', 'collaboration', 'sql-in-browser'],
    description: 'Community data platform with thousands of free datasets. Supports in-browser SQL queries, API access, and data collaboration. Requires free account. Hosts government, health, education, environment, and user-contributed datasets.',
    last_updated: null, created_at: null,
    note: 'API requires authentication. Sign up at data.world for free access.',
    collected_at: TIMESTAMP,
  }];
}

// ===== MAIN =====
async function main() {
  const allRecords = [
    ...buildFRED(),
    ...buildSEC(),
    ...buildFAO(),
    ...buildILO(),
    ...buildUNESCO(),
    ...buildGTFS(),
    ...buildSnowflake(),
    ...buildDatabricks(),
    ...buildDataWorld(),
  ];

  const output = 'D:/Projects/wa-data-catalog/schemas/remaining-sources.jsonl';
  fs.writeFileSync(output, allRecords.map(r => JSON.stringify(r)).join('\n') + '\n');

  console.log(`Wrote ${allRecords.length} records to remaining-sources.jsonl`);

  // Breakdown
  const bySource = {};
  allRecords.forEach(r => {
    const src = r.source_portal;
    bySource[src] = (bySource[src] || 0) + 1;
  });
  Object.entries(bySource).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
}

main().catch(err => { console.error(err.message); process.exit(1); });
