// Azure Open Datasets — curated from Microsoft documentation
// These are well-documented, ~30 datasets with known schemas
// No API needed — schemas are documented at learn.microsoft.com

import fs from 'fs';

const datasets = [
  // Transportation
  { id: 'nyc-taxi-yellow', name: 'NYC Taxi - Yellow', category: 'transportation', desc: 'Yellow taxi trip records: pickup/dropoff, fares, distances, passenger counts', geo: 'New York City', cols: ['vendorID','tpepPickupDateTime','tpepDropoffDateTime','passengerCount','tripDistance','puLocationId','doLocationId','rateCodeId','storeAndFwdFlag','paymentType','fareAmount','extra','mtaTax','improvementSurcharge','tipAmount','tollsAmount','totalAmount'] },
  { id: 'nyc-taxi-green', name: 'NYC Taxi - Green', category: 'transportation', desc: 'Green taxi trip records', geo: 'New York City', cols: ['vendorID','lpepPickupDatetime','lpepDropoffDatetime','passengerCount','tripDistance','puLocationId','doLocationId','rateCodeID','storeAndFwdFlag','paymentType','fareAmount','extra','mtaTax','improvementSurcharge','tipAmount','tollsAmount','totalAmount','tripType'] },
  { id: 'nyc-taxi-fhv', name: 'NYC Taxi - FHV', category: 'transportation', desc: 'For-hire vehicle trip records', geo: 'New York City', cols: ['dispatchBaseNum','pickupDateTime','dropoffDateTime','puLocationId','doLocationId','srFlag'] },
  { id: 'tartanair', name: 'TartanAir AirSim', category: 'transportation', desc: 'Autonomous vehicle simulation data for visual SLAM research', geo: null, cols: ['image_left','image_right','depth_left','depth_right','seg_left','seg_right','flow','pose'] },

  // Labor & Economics
  { id: 'us-labor-force', name: 'US Labor Force Statistics', category: 'labor', desc: 'Labor force participation rates by age, gender, race, ethnicity', geo: 'United States', cols: ['seriesId','year','period','value','footnotes'] },
  { id: 'us-employment-hours-earnings-national', name: 'US Employment Hours & Earnings (National)', category: 'labor', desc: 'CES nonfarm employment estimates — national level', geo: 'United States', cols: ['seriesId','year','period','value','footnotes'] },
  { id: 'us-employment-hours-earnings-state', name: 'US Employment Hours & Earnings (State)', category: 'labor', desc: 'State-level CES employment estimates', geo: 'United States', cols: ['seriesId','year','period','value','footnotes'] },
  { id: 'us-local-area-unemployment', name: 'US Local Area Unemployment', category: 'labor', desc: 'Monthly/annual employment data by region from BLS LAUS', geo: 'United States', cols: ['seriesId','year','period','value','footnotes'] },
  { id: 'us-cpi', name: 'US Consumer Price Index', category: 'labor', desc: 'CPI — average price changes for urban consumers', geo: 'United States', cols: ['seriesId','year','period','value','footnotes'] },
  { id: 'us-ppi-industry', name: 'US Producer Price Index - Industry', category: 'labor', desc: 'PPI by industry', geo: 'United States', cols: ['seriesId','year','period','value','footnotes'] },
  { id: 'us-ppi-commodities', name: 'US Producer Price Index - Commodities', category: 'labor', desc: 'PPI by commodity', geo: 'United States', cols: ['seriesId','year','period','value','footnotes'] },

  // Population & Safety
  { id: 'us-population-county', name: 'US Population by County', category: 'demographics', desc: 'Population by gender/race from 2000/2010 Census', geo: 'United States', cols: ['decennialTime','stateName','countyName','population','race','sex','minAge','maxAge'] },
  { id: 'us-population-zip', name: 'US Population by ZIP Code', category: 'demographics', desc: 'Population by gender/race from 2010 Census', geo: 'United States', cols: ['zipCode','population','gender','race','ageGroup'] },
  { id: 'boston-safety', name: 'Boston Safety Data', category: 'public_safety', desc: '311 service requests — daily updates', geo: 'Boston, MA', cols: ['caseEnquiryId','openDt','closedDt','caseStatus','caseTitle','subject','reason','type','queue','department','location','latitude','longitude'] },
  { id: 'chicago-safety', name: 'Chicago Safety Data', category: 'public_safety', desc: '311 service requests — daily updates', geo: 'Chicago, IL', cols: ['serviceRequestNumber','createdDate','closedDate','status','serviceRequestType','typeOfServiceRequest','streetAddress','latitude','longitude','ward','policeDistrict'] },
  { id: 'nyc-safety', name: 'NYC Safety Data', category: 'public_safety', desc: '311 service requests 2010-present — daily updates', geo: 'New York City', cols: ['uniqueKey','createdDate','closedDate','agency','agencyName','complaintType','descriptor','locationType','incidentZip','incidentAddress','city','status','borough','latitude','longitude'] },
  { id: 'sf-safety', name: 'San Francisco Safety Data', category: 'public_safety', desc: 'Fire department calls and 311 cases, 2015-present', geo: 'San Francisco, CA', cols: ['caseId','openedDate','closedDate','status','category','requestType','requestDetails','address','latitude','longitude','source','mediaUrl','neighborhood','policeDistrict'] },
  { id: 'seattle-safety', name: 'Seattle Safety Data', category: 'public_safety', desc: 'Fire department 911 dispatches, 2010-present', geo: 'Seattle, WA', cols: ['address','type','datetime','latitude','longitude','reportLocation','incidentNumber'] },

  // ML & Reference
  { id: 'diabetes', name: 'Diabetes Dataset', category: 'health', desc: '442 diabetes patients, 10 baseline variables, disease progression measure', geo: null, cols: ['AGE','SEX','BMI','BP','S1','S2','S3','S4','S5','S6','Y'] },
  { id: 'oj-sales', name: 'OJ Sales Simulated Data', category: 'finance', desc: "Dominick's OJ dataset + simulated data for forecasting", geo: 'United States', cols: ['store','brand','week','logmove','feat','price','AGE60','EDUC','ETHNIC','INCOME','HHLARGE','WORKWOM','HVAL150','SSTRDIST','SSTRVOL','CPDIST5','CPWVOL5'] },
  { id: 'mnist', name: 'MNIST Handwritten Digits', category: 'technology', desc: '70,000 handwritten digit images (28x28 pixels)', geo: null, cols: ['image','label'] },
  { id: 'mind-news', name: 'Microsoft News (MIND)', category: 'technology', desc: 'Large-scale news recommendation benchmark dataset', geo: null, cols: ['impressionId','userId','time','history','impressions'] },
  { id: 'public-holidays', name: 'Public Holidays', category: 'demographics', desc: 'Worldwide holidays for 38 countries, 1970-2099', geo: 'global', cols: ['countryOrRegion','holidayName','normalizeHolidayName','isPaidTimeOff','countryRegionCode','date'] },
  { id: 'russian-open-stt', name: 'Russian Open Speech-to-Text', category: 'technology', desc: 'Large-scale Russian language STT dataset', geo: null, cols: ['audioFile','transcription','duration'] },

  // Health
  { id: 'covid19-data-lake', name: 'COVID-19 Data Lake', category: 'health', desc: 'Collection of COVID-related data: cases, testing, hospital capacity, mobility', geo: 'global', cols: ['date','country_region','province_state','confirmed','deaths','recovered','active','fips','lat','long'] },
  { id: 'genomics-data-lake', name: 'Genomics Data Lake', category: 'health', desc: 'Genomic data including ClinVar, gnomAD, Illumina Platinum Genomes', geo: null, cols: [] },
];

const domainMap = {
  transportation: 'transportation',
  labor: 'labor',
  demographics: 'demographics',
  public_safety: 'public_safety',
  health: 'health',
  technology: 'technology',
  finance: 'finance',
};

const records = datasets.map(d => ({
  id: `azure:${d.id}`,
  name: d.name,
  provider: 'Microsoft (Azure Open Datasets)',
  source_portal: 'azure.microsoft.com',
  source_platform: 'azure',
  url: `https://learn.microsoft.com/en-us/azure/open-datasets/dataset-${d.id}`,
  api_endpoint: null,
  documentation_url: `https://learn.microsoft.com/en-us/azure/open-datasets/dataset-${d.id}`,
  access_method: 'download',
  format: ['parquet', 'csv'],
  geographic_scope: d.geo === 'global' ? 'global' : d.geo === 'United States' ? 'us_national' : d.geo ? 'us_city' : 'varies',
  geographic_detail: d.geo,
  domain: domainMap[d.category] || 'unknown',
  category: d.category,
  update_frequency: d.category === 'public_safety' ? 'daily' : 'unknown',
  row_count: null,
  column_count: d.cols.length || null,
  columns: d.cols.map(c => ({ name: c, field_name: c, type: 'text', description: null })),
  tables: [],
  tags: ['azure', 'open-datasets', d.category],
  description: d.desc,
  last_updated: null,
  created_at: null,
  collected_at: new Date().toISOString(),
}));

const output = 'D:/Projects/wa-data-catalog/schemas/azure.jsonl';
fs.writeFileSync(output, records.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(`Wrote ${records.length} Azure Open Dataset records to azure.jsonl`);
