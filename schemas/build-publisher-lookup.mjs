// Builds a comprehensive publisher lookup table from all raw provider strings
// Groups aliases, assigns canonical names, IDs, types, and parent organizations
import fs from 'fs';

const rawList = JSON.parse(fs.readFileSync('D:/Projects/wa-data-catalog/schemas/publisher-raw-list.json', 'utf8'));
console.log(`Processing ${rawList.length} unique provider strings...`);

// ===== RULES-BASED PUBLISHER MATCHING =====
// Each rule: { match: regex or function, id, canonical, short, parent, type }
const rules = [
  // === US FEDERAL AGENCIES ===
  { match: /census bureau|u\.s\. census/i, id: 'us-census', canonical: 'U.S. Census Bureau', short: 'Census', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /noaa|national oceanic|weather service/i, id: 'us-noaa', canonical: 'NOAA', short: 'NOAA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /environmental protection agency|^epa$|^u\.s\. epa/i, id: 'us-epa', canonical: 'EPA', short: 'EPA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /securities and exchange|^sec$/i, id: 'us-sec', canonical: 'SEC', short: 'SEC', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /centers for disease control|^cdc$|division of.*cdc/i, id: 'us-cdc', canonical: 'CDC', short: 'CDC', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /food and drug admin|^fda$|openfda/i, id: 'us-fda', canonical: 'FDA', short: 'FDA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /national aeronautics|^nasa$/i, id: 'us-nasa', canonical: 'NASA', short: 'NASA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of the interior|^doi$/i, id: 'us-doi', canonical: 'Dept of the Interior', short: 'DOI', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of agriculture|^usda$(?!.*state)/i, id: 'us-usda', canonical: 'USDA', short: 'USDA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of transportation(?!.*state|.*washington|.*new york)/i, id: 'us-dot', canonical: 'US Dept of Transportation', short: 'DOT', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of health.*human services|^hhs$/i, id: 'us-hhs', canonical: 'HHS', short: 'HHS', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of education(?!.*doe\)|.*new york|.*city)/i, id: 'us-ed', canonical: 'US Dept of Education', short: 'ED', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of energy(?!.*star)/i, id: 'us-doe', canonical: 'Dept of Energy', short: 'DOE', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of homeland security|^dhs$/i, id: 'us-dhs', canonical: 'DHS', short: 'DHS', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of veterans affairs|^va$|datahub\.va\.gov/i, id: 'us-va', canonical: 'Dept of Veterans Affairs', short: 'VA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /social security admin/i, id: 'us-ssa', canonical: 'Social Security Administration', short: 'SSA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /housing and urban|^hud$/i, id: 'us-hud', canonical: 'HUD', short: 'HUD', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /federal communications|^fcc$/i, id: 'us-fcc', canonical: 'FCC', short: 'FCC', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /national institute.*standards|^nist$/i, id: 'us-nist', canonical: 'NIST', short: 'NIST', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /board of governors.*federal reserve/i, id: 'us-fed', canonical: 'Federal Reserve', short: 'Fed', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /bureau of labor statistics/i, id: 'us-bls', canonical: 'Bureau of Labor Statistics', short: 'BLS', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /bureau of economic analysis/i, id: 'us-bea', canonical: 'Bureau of Economic Analysis', short: 'BEA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /geological survey|^usgs$/i, id: 'us-usgs', canonical: 'USGS', short: 'USGS', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /fish and wildlife service/i, id: 'us-fws', canonical: 'US Fish & Wildlife Service', short: 'FWS', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /national park service/i, id: 'us-nps', canonical: 'National Park Service', short: 'NPS', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /federal emergency|^fema$/i, id: 'us-fema', canonical: 'FEMA', short: 'FEMA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /national library of medicine|^nlm$/i, id: 'us-nlm', canonical: 'NLM/NIH', short: 'NLM', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /district of columbia/i, id: 'us-dc', canonical: 'District of Columbia', short: 'DC', parent: 'us-local', type: 'local_gov', geo: 'us_city' },
  { match: /energy\s?star/i, id: 'us-energystar', canonical: 'Energy Star (EPA/DOE)', short: 'EnergyStar', parent: 'us-federal', type: 'federal_program', geo: 'us_national' },

  // === WA STATE ===
  { match: /state of washington(?!.*d\.c)/i, id: 'wa-state', canonical: 'State of Washington', short: 'WA State', parent: 'wa-state', type: 'state_gov', geo: 'wa_state' },
  { match: /washington.*department of health(?!.*human)/i, id: 'wa-doh', canonical: 'WA Dept of Health', short: 'DOH', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /washington.*fish.*wildlife|^wdfw$/i, id: 'wa-wdfw', canonical: 'WA Fish & Wildlife', short: 'WDFW', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /washington.*department of transport|^wsdot$/i, id: 'wa-wsdot', canonical: 'WSDOT', short: 'WSDOT', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /washington.*natural resources|^wadnr$|^dnr$/i, id: 'wa-dnr', canonical: 'WA Dept of Natural Resources', short: 'DNR', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /washington.*department of ecology|^ecology$/i, id: 'wa-ecology', canonical: 'WA Dept of Ecology', short: 'Ecology', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /washington.*department of licensing/i, id: 'wa-dol', canonical: 'WA Dept of Licensing', short: 'DOL', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /ospi|superintendent.*public instruction/i, id: 'wa-ospi', canonical: 'WA OSPI', short: 'OSPI', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /public disclosure commission/i, id: 'wa-pdc', canonical: 'WA Public Disclosure Commission', short: 'PDC', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /labor.*industries(?!.*federal)/i, id: 'wa-lni', canonical: 'WA Labor & Industries', short: 'L&I', parent: 'wa-state', type: 'state_agency', geo: 'wa_state' },
  { match: /data\.wa\.gov/i, id: 'wa-state-portal', canonical: 'WA State (data.wa.gov)', short: 'WA Portal', parent: 'wa-state', type: 'state_gov', geo: 'wa_state' },
  { match: /king county/i, id: 'wa-king-county', canonical: 'King County, WA', short: 'King Co', parent: 'wa-local', type: 'county_gov', geo: 'wa_county' },
  { match: /pierce county/i, id: 'wa-pierce-county', canonical: 'Pierce County, WA', short: 'Pierce Co', parent: 'wa-local', type: 'county_gov', geo: 'wa_county' },
  { match: /city of seattle|seattle.*arcgis|performance\.seattle/i, id: 'wa-seattle', canonical: 'City of Seattle', short: 'Seattle', parent: 'wa-local', type: 'city_gov', geo: 'wa_city' },
  { match: /city of renton/i, id: 'wa-renton', canonical: 'City of Renton, WA', short: 'Renton', parent: 'wa-local', type: 'city_gov', geo: 'wa_city' },

  // === US CITIES ===
  { match: /city of new york|nyc|new york city/i, id: 'us-nyc', canonical: 'City of New York', short: 'NYC', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of chicago/i, id: 'us-chicago', canonical: 'City of Chicago', short: 'Chicago', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of austin|austin.*texas/i, id: 'us-austin', canonical: 'City of Austin, TX', short: 'Austin', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of edmonton/i, id: 'ca-edmonton', canonical: 'City of Edmonton', short: 'Edmonton', parent: 'ca-local', type: 'city_gov', geo: 'global' },
  { match: /city of calgary|the city of calgary/i, id: 'ca-calgary', canonical: 'City of Calgary', short: 'Calgary', parent: 'ca-local', type: 'city_gov', geo: 'global' },

  // === INTERNATIONAL ORGANIZATIONS ===
  { match: /world bank/i, id: 'intl-worldbank', canonical: 'World Bank', short: 'WB', parent: 'international', type: 'international_org', geo: 'global' },
  { match: /world health org|^who$/i, id: 'intl-who', canonical: 'WHO', short: 'WHO', parent: 'international', type: 'international_org', geo: 'global' },
  { match: /eurostat/i, id: 'intl-eurostat', canonical: 'Eurostat', short: 'Eurostat', parent: 'international', type: 'international_org', geo: 'global' },
  { match: /food and agriculture org|^fao$/i, id: 'intl-fao', canonical: 'FAO', short: 'FAO', parent: 'international', type: 'international_org', geo: 'global' },
  { match: /international labour|^ilo$/i, id: 'intl-ilo', canonical: 'ILO', short: 'ILO', parent: 'international', type: 'international_org', geo: 'global' },
  { match: /united nations|^un /i, id: 'intl-un', canonical: 'United Nations', short: 'UN', parent: 'international', type: 'international_org', geo: 'global' },
  { match: /unesco/i, id: 'intl-unesco', canonical: 'UNESCO', short: 'UNESCO', parent: 'international', type: 'international_org', geo: 'global' },

  // === CANADIAN GOVERNMENT ===
  { match: /statistics canada/i, id: 'ca-statscan', canonical: 'Statistics Canada', short: 'StatsCan', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /government of yukon/i, id: 'ca-yukon', canonical: 'Government of Yukon', short: 'Yukon', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /government of alberta/i, id: 'ca-alberta', canonical: 'Government of Alberta', short: 'Alberta', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /government of british columbia/i, id: 'ca-bc', canonical: 'Government of British Columbia', short: 'BC', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /government.*qu[eé]bec|municipalit.*qu[eé]bec/i, id: 'ca-quebec', canonical: 'Government of Québec', short: 'Québec', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /government of ontario/i, id: 'ca-ontario', canonical: 'Government of Ontario', short: 'Ontario', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /government of nova scotia/i, id: 'ca-nova-scotia', canonical: 'Government of Nova Scotia', short: 'Nova Scotia', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /government of saskatchewan/i, id: 'ca-saskatchewan', canonical: 'Government of Saskatchewan', short: 'Saskatchewan', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /global affairs canada/i, id: 'ca-gac', canonical: 'Global Affairs Canada', short: 'GAC', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /fisheries and oceans canada/i, id: 'ca-dfo', canonical: 'Fisheries and Oceans Canada', short: 'DFO', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /environment.*climate.*canada/i, id: 'ca-eccc', canonical: 'Environment and Climate Change Canada', short: 'ECCC', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /transport.*safety.*board.*canada/i, id: 'ca-tsb', canonical: 'Transportation Safety Board of Canada', short: 'TSB', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /agriculture.*agri-food canada/i, id: 'ca-aafc', canonical: 'Agriculture and Agri-Food Canada', short: 'AAFC', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /data\.novascotia/i, id: 'ca-nova-scotia-portal', canonical: 'Nova Scotia Open Data', short: 'NS Portal', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },

  // === ITALIAN ===
  { match: /regione puglia/i, id: 'it-puglia', canonical: 'Regione Puglia', short: 'Puglia', parent: 'it-regional', type: 'regional_gov', geo: 'global' },
  { match: /geodati.*rndt/i, id: 'it-rndt', canonical: 'GeoDati RNDT (Italy)', short: 'RNDT', parent: 'it-national', type: 'national_gov', geo: 'global' },

  // === FRENCH ===
  { match: /r[eé]gion hauts-de-france/i, id: 'fr-hauts-de-france', canonical: 'Région Hauts-de-France', short: 'Hauts-de-France', parent: 'fr-regional', type: 'regional_gov', geo: 'global' },
  { match: /r[eé]gion auvergne/i, id: 'fr-aura', canonical: 'Région Auvergne-Rhône-Alpes', short: 'AURA', parent: 'fr-regional', type: 'regional_gov', geo: 'global' },

  // === CLOUD/TECH ===
  { match: /google.*bigquery/i, id: 'cloud-bigquery', canonical: 'Google BigQuery', short: 'BigQuery', parent: 'cloud', type: 'cloud_provider', geo: 'varies' },
  { match: /microsoft.*azure/i, id: 'cloud-azure', canonical: 'Microsoft Azure', short: 'Azure', parent: 'cloud', type: 'cloud_provider', geo: 'varies' },
  { match: /cybersyn/i, id: 'cloud-cybersyn', canonical: 'Cybersyn (Snowflake)', short: 'Cybersyn', parent: 'cloud', type: 'data_provider', geo: 'varies' },

  // === MORE US FEDERAL ===
  { match: /department of justice|^doj$/i, id: 'us-doj', canonical: 'Dept of Justice', short: 'DOJ', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of defense|^dod$/i, id: 'us-dod', canonical: 'Dept of Defense', short: 'DOD', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of the treasury|department of treasury/i, id: 'us-treasury', canonical: 'US Treasury', short: 'Treasury', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /department of commerce(?!.*state)/i, id: 'us-doc', canonical: 'US Dept of Commerce', short: 'Commerce', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /nuclear regulatory/i, id: 'us-nrc', canonical: 'Nuclear Regulatory Commission', short: 'NRC', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /metropolitan transportation authority/i, id: 'us-mta', canonical: 'MTA (New York)', short: 'MTA', parent: 'us-local', type: 'transit_agency', geo: 'us_city' },
  { match: /general services admin/i, id: 'us-gsa', canonical: 'GSA', short: 'GSA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /small business admin/i, id: 'us-sba', canonical: 'SBA', short: 'SBA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /federal trade commission|^ftc$/i, id: 'us-ftc', canonical: 'FTC', short: 'FTC', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /office of personnel management/i, id: 'us-opm', canonical: 'OPM', short: 'OPM', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /army corps.*engineer/i, id: 'us-usace', canonical: 'Army Corps of Engineers', short: 'USACE', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /boxxapps/i, id: 'vendor-boxxapps', canonical: 'Boxxapps (data vendor)', short: 'Boxxapps', parent: 'vendor', type: 'data_vendor', geo: 'varies' },

  // === MORE US STATES ===
  { match: /state of california/i, id: 'us-california', canonical: 'State of California', short: 'California', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /state of maryland/i, id: 'us-maryland', canonical: 'State of Maryland', short: 'Maryland', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /state of new york|new york state(?!.*city)/i, id: 'us-new-york', canonical: 'State of New York', short: 'New York', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /new york.*department of health/i, id: 'us-ny-doh', canonical: 'NY Dept of Health', short: 'NY DOH', parent: 'us-state', type: 'state_agency', geo: 'us_state' },
  { match: /utah geological/i, id: 'us-utah-geo', canonical: 'Utah Geological Survey', short: 'UT Geo', parent: 'us-state', type: 'state_agency', geo: 'us_state' },

  // === MORE US LOCAL ===
  { match: /department of education.*doe\)/i, id: 'us-nyc-doe', canonical: 'NYC Dept of Education', short: 'NYC DOE', parent: 'us-local', type: 'city_agency', geo: 'us_city' },
  { match: /montgomery county.*md/i, id: 'us-montgomery-county-md', canonical: 'Montgomery County, MD', short: 'MontCo MD', parent: 'us-local', type: 'county_gov', geo: 'us_city' },
  { match: /arlington county/i, id: 'us-arlington-va', canonical: 'Arlington County, VA', short: 'Arlington', parent: 'us-local', type: 'county_gov', geo: 'us_city' },
  { match: /cook county/i, id: 'us-cook-county', canonical: 'Cook County, IL', short: 'Cook Co', parent: 'us-local', type: 'county_gov', geo: 'us_city' },
  { match: /city of bellevue/i, id: 'wa-bellevue', canonical: 'City of Bellevue, WA', short: 'Bellevue', parent: 'wa-local', type: 'city_gov', geo: 'wa_city' },
  { match: /city of federal way/i, id: 'wa-federal-way', canonical: 'City of Federal Way, WA', short: 'Federal Way', parent: 'wa-local', type: 'city_gov', geo: 'wa_city' },
  { match: /city of spokane(?!.*valley)/i, id: 'wa-spokane', canonical: 'City of Spokane, WA', short: 'Spokane', parent: 'wa-local', type: 'city_gov', geo: 'wa_city' },
  { match: /city of tacoma/i, id: 'wa-tacoma', canonical: 'City of Tacoma, WA', short: 'Tacoma', parent: 'wa-local', type: 'city_gov', geo: 'wa_city' },
  { match: /city of dallas|dallasopendata/i, id: 'us-dallas', canonical: 'City of Dallas, TX', short: 'Dallas', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of oakland/i, id: 'us-oakland', canonical: 'City of Oakland, CA', short: 'Oakland', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of new orleans/i, id: 'us-new-orleans', canonical: 'City of New Orleans', short: 'New Orleans', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of kansas city/i, id: 'us-kansas-city', canonical: 'City of Kansas City, MO', short: 'KC', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of baton rouge/i, id: 'us-baton-rouge', canonical: 'City of Baton Rouge, LA', short: 'Baton Rouge', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
  { match: /city of los angeles/i, id: 'us-los-angeles', canonical: 'City of Los Angeles', short: 'LA', parent: 'us-local', type: 'city_gov', geo: 'us_city' },

  // === MORE CANADIAN ===
  { match: /government of manitoba/i, id: 'ca-manitoba', canonical: 'Government of Manitoba', short: 'Manitoba', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /government of new brunswick/i, id: 'ca-new-brunswick', canonical: 'Government of New Brunswick', short: 'New Brunswick', parent: 'ca-provincial', type: 'provincial_gov', geo: 'global' },
  { match: /public services.*procurement canada/i, id: 'ca-pspc', canonical: 'Public Services and Procurement Canada', short: 'PSPC', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /canadian food inspection/i, id: 'ca-cfia', canonical: 'Canadian Food Inspection Agency', short: 'CFIA', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /natural resources canada/i, id: 'ca-nrcan', canonical: 'Natural Resources Canada', short: 'NRCan', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },
  { match: /innovation.*science.*economic.*canada/i, id: 'ca-ised', canonical: 'Innovation, Science and Economic Development Canada', short: 'ISED', parent: 'ca-federal', type: 'federal_agency', geo: 'global' },

  // === COLOMBIAN ===
  { match: /universidad del quind/i, id: 'co-uniquindio', canonical: 'Universidad del Quindío (Colombia)', short: 'UniQuindío', parent: 'co-academic', type: 'academic', geo: 'global' },
  { match: /unidad de planificaci.*upra/i, id: 'co-upra', canonical: 'UPRA (Colombia)', short: 'UPRA', parent: 'co-national', type: 'national_gov', geo: 'global' },

  // === MORE FRENCH ===
  { match: /conservatoire botanique/i, id: 'fr-cbn', canonical: 'Conservatoire Botanique National', short: 'CBN', parent: 'fr-regional', type: 'regional_gov', geo: 'global' },

  // === ACADEMIC ===
  { match: /earth data analysis center.*new mexico/i, id: 'us-unm-edac', canonical: 'UNM Earth Data Analysis Center', short: 'EDAC', parent: 'us-academic', type: 'academic', geo: 'us_state' },

  // === PORTAL SELF-REFERENCES (provider = portal domain) ===
  { match: /^opendata\.utah\.gov$/i, id: 'us-utah-portal', canonical: 'State of Utah', short: 'Utah', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /^opendata\.maryland\.gov$/i, id: 'us-maryland-portal', canonical: 'State of Maryland', short: 'Maryland', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /^performance\.seattle\.gov$/i, id: 'wa-seattle', canonical: 'City of Seattle', short: 'Seattle', parent: 'wa-local', type: 'city_gov', geo: 'wa_city' },
  { match: /^internal\.open\.piercecountywa/i, id: 'wa-pierce-county', canonical: 'Pierce County, WA', short: 'Pierce Co', parent: 'wa-local', type: 'county_gov', geo: 'wa_county' },
  { match: /^data\.bayareametro/i, id: 'us-bay-area-metro', canonical: 'Bay Area Metro (MTC/ABAG)', short: 'Bay Area', parent: 'us-local', type: 'regional_gov', geo: 'us_city' },
  { match: /^data\.edmonton/i, id: 'ca-edmonton', canonical: 'City of Edmonton', short: 'Edmonton', parent: 'ca-local', type: 'city_gov', geo: 'global' },
  { match: /^data\.ramseycountymn/i, id: 'us-ramsey-county', canonical: 'Ramsey County, MN', short: 'Ramsey Co', parent: 'us-local', type: 'county_gov', geo: 'us_city' },
  { match: /^www\.datos\.gov\.co$/i, id: 'co-national', canonical: 'Colombia Open Data', short: 'Colombia', parent: 'co-national', type: 'national_gov', geo: 'global' },
  { match: /^www\.datahub\.va\.gov$/i, id: 'us-va', canonical: 'Dept of Veterans Affairs', short: 'VA', parent: 'us-federal', type: 'federal_agency', geo: 'us_national' },
  { match: /^data\.michigan\.gov$/i, id: 'us-michigan-portal', canonical: 'State of Michigan', short: 'Michigan', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /^data\.oregon\.gov$/i, id: 'us-oregon-portal', canonical: 'State of Oregon', short: 'Oregon', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /^illinois-edp/i, id: 'us-illinois-edp', canonical: 'State of Illinois (EDP)', short: 'Illinois', parent: 'us-state', type: 'state_gov', geo: 'us_state' },
  { match: /^data\.montgomerycountymd/i, id: 'us-montgomery-county-md', canonical: 'Montgomery County, MD', short: 'MontCo MD', parent: 'us-local', type: 'county_gov', geo: 'us_city' },
  { match: /^data\.winnipeg/i, id: 'ca-winnipeg', canonical: 'City of Winnipeg', short: 'Winnipeg', parent: 'ca-local', type: 'city_gov', geo: 'global' },
  { match: /^www\.dallasopendata/i, id: 'us-dallas', canonical: 'City of Dallas, TX', short: 'Dallas', parent: 'us-local', type: 'city_gov', geo: 'us_city' },
];

// Apply rules to all providers
const lookup = {};
let matched = 0;
let unmatched = 0;
let matchedRecords = 0;
let unmatchedRecords = 0;

for (const entry of rawList) {
  const name = entry.name;
  let found = false;

  for (const rule of rules) {
    if (rule.match.test(name)) {
      lookup[name] = {
        id: rule.id,
        canonical: rule.canonical,
        short: rule.short,
        parent: rule.parent,
        type: rule.type,
        geo: rule.geo,
      };
      matched++;
      matchedRecords += entry.count;
      found = true;
      break;
    }
  }

  if (!found) {
    // Auto-generate ID from name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    const type = name.match(/city of|ciudad/i) ? 'city_gov' :
                 name.match(/county|condado/i) ? 'county_gov' :
                 name.match(/state of|government of|gouvernement/i) ? 'state_gov' :
                 name.match(/department of|dept|ministry|minister/i) ? 'government_agency' :
                 name.match(/university|universid|institut/i) ? 'academic' :
                 name.match(/\.gov|\.ca$|\.au$|\.uk$/i) ? 'government' :
                 'unknown';

    lookup[name] = {
      id: id || 'unknown',
      canonical: name,
      short: name.length > 30 ? name.slice(0, 27) + '...' : name,
      parent: 'unknown',
      type,
      geo: 'unknown',
    };
    unmatched++;
    unmatchedRecords += entry.count;
  }
}

// Save lookup table
fs.writeFileSync('D:/Projects/wa-data-catalog/schemas/publisher-lookup.json', JSON.stringify(lookup, null, 2));

// Stats
const totalRecords = rawList.reduce((s, e) => s + e.count, 0);
console.log(`\n=== Publisher Lookup Results ===`);
console.log(`Total unique providers: ${rawList.length}`);
console.log(`Rule-matched: ${matched} providers (${matchedRecords.toLocaleString()} records, ${(matchedRecords/totalRecords*100).toFixed(1)}%)`);
console.log(`Auto-generated: ${unmatched} providers (${unmatchedRecords.toLocaleString()} records, ${(unmatchedRecords/totalRecords*100).toFixed(1)}%)`);
console.log(`Lookup table saved to publisher-lookup.json`);

// Show top unmatched by count
const unmatchedList = rawList.filter(e => {
  for (const rule of rules) { if (rule.match.test(e.name)) return false; }
  return true;
}).sort((a, b) => b.count - a.count);

console.log(`\nTop 30 unmatched providers (by record count):`);
unmatchedList.slice(0, 30).forEach((e, i) => {
  console.log(`  ${i+1}. [${e.count}] ${e.name}`);
});