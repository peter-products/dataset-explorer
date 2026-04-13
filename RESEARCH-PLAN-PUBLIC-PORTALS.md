# Public Data Warehouses, Open Data Portals & APIs — Research Plan

## Purpose

Identify **every** publicly queryable data warehouse, open data portal, and public API where structured data can be accessed — whether government, academic, nonprofit, or commercial (free tier). This is the global inventory of "places where public data lives."

This complements the WA-specific plan. That plan finds datasets within WA government. This plan finds the **platforms and infrastructure** where public data of any kind is hosted.

---

## Output Format

For every portal/warehouse/API discovered, record:

| Field | Description |
|---|---|
| name | Name of the portal, warehouse, or API |
| url | Primary URL |
| operator | Who runs it (government agency, company, nonprofit, university) |
| platform_type | warehouse / portal / api / marketplace / repository / catalog |
| underlying_tech | Socrata, CKAN, ArcGIS Hub, BigQuery, Snowflake, custom, etc. |
| query_method | SQL, API, download, GraphQL, SPARQL, OData, bulk export |
| geographic_scope | global / national / state / regional / city / varies |
| domain_scope | government, health, science, finance, transportation, multi-domain, etc. |
| dataset_count | Approximate number of datasets (if known) |
| free_tier | yes / partial / no |
| registration_required | yes / no |
| description | What kind of data it hosts |
| discovery_method | Which search task found it |

---

## PHASE 1: Major Known Public Data Platforms

### Task 1.1 — Government Open Data Portals (US Federal)

| Portal | URL | Platform | Notes |
|---|---|---|---|
| data.gov | data.gov | CKAN | US federal open data — 300K+ datasets |
| Census Bureau | data.census.gov | custom | American Community Survey, decennial, economic census |
| Bureau of Labor Statistics | bls.gov/data | custom | Employment, prices, productivity |
| Bureau of Economic Analysis | bea.gov | custom | GDP, income, trade |
| Federal Reserve (FRED) | fred.stlouisfed.org | custom | 800K+ economic time series |
| SEC EDGAR | sec.gov/edgar | custom | All public company filings |
| CMS (Medicare/Medicaid) | data.cms.gov | Socrata | Healthcare data |
| EPA | epa.gov/data | custom + Socrata | Environmental data |
| NOAA | ncdc.noaa.gov | custom | Weather, climate, ocean |
| USGS | usgs.gov/products/data | custom | Water, geological, biological |
| NASA | data.nasa.gov | Socrata + custom | Space, earth science |
| NIH/NLM | ncbi.nlm.nih.gov | custom | Biomedical data (PubMed, GenBank, etc.) |
| USDA | ers.usda.gov/data-products | custom | Agricultural data |
| DOT | data.transportation.gov | Socrata | Transportation data |
| HUD | huduser.gov | custom | Housing data |
| DOE/EIA | eia.gov | custom | Energy data |
| FCC | opendata.fcc.gov | Socrata | Telecommunications data |
| FBI/DOJ | crime-data-explorer.fr.cloud.gov | custom | Crime data (UCR/NIBRS) |
| USPTO | patentsview.org | custom | Patent data |
| FEMA | fema.gov/api/open | API | Disaster data |
| GSA | api.data.gov | API gateway | API keys for many federal APIs |
| USAspending | usaspending.gov | custom + API | Federal spending data |
| SAM.gov | sam.gov | custom | Federal contracts, entities |
| FDIC | fdic.gov/analysis | custom | Banking/financial institution data |
| Federal Election Commission | fec.gov/data | API | Campaign finance |
| Social Security Administration | ssa.gov/data | custom | SSA statistics |
| IRS | irs.gov/statistics | custom | Tax statistics (SOI) |

**Search task**: For every federal agency listed at usa.gov/agency-index, check if they have a data portal, API, or bulk download page.

### Task 1.2 — Government Open Data Portals (US State Level)

**Every US state has or should have an open data portal.** Enumerate all 50:

**Search queries**:
- `"{state name}" open data portal`
- `data.{state abbreviation}.gov`
- `site:{state}.gov "open data" OR "data portal" OR "data catalog"`

**Known portals (validate and complete the list)**:

| State | Known URL | Platform |
|---|---|---|
| California | data.ca.gov | CKAN |
| New York | data.ny.gov | Socrata |
| Texas | data.texas.gov | Socrata |
| Illinois | data.illinois.gov | Socrata |
| Washington | data.wa.gov | Socrata |
| Oregon | data.oregon.gov | Socrata |
| Colorado | data.colorado.gov | Socrata |
| Connecticut | data.ct.gov | Socrata |
| Hawaii | data.hawaii.gov | Socrata |
| Maryland | data.maryland.gov | Socrata |
| Massachusetts | data.mass.gov | custom |
| Michigan | data.michigan.gov | Socrata |
| Missouri | data.mo.gov | Socrata |
| New Jersey | data.nj.gov | Socrata |
| Ohio | data.ohio.gov | custom |
| Pennsylvania | data.pa.gov | custom |
| Virginia | data.virginia.gov | Socrata |
| Florida | open.florida.gov | custom |
| Georgia | data.georgia.gov | Socrata |
| ... | Complete for all 50 states | ... |

### Task 1.3 — Government Open Data Portals (US City/County)

Many major US cities have open data portals. Identify all of them.

**Search queries**:
- `"{city name}" open data portal`
- `data.{city domain}`
- Use the Socrata Discovery API to find all Socrata-powered domains: `https://api.us.socrata.com/api/catalog/v1/domains`

**Known major city portals**:
New York (data.cityofnewyork.us), Chicago (data.cityofchicago.org), Los Angeles (data.lacity.org), San Francisco (datasf.org), Seattle (data.seattle.gov), Austin (data.austintexas.gov), Boston (data.boston.gov), Denver (denvergov.org/opendata), Philadelphia (opendataphilly.org), Portland (civicapps.org), Detroit (data.detroitmi.gov), Atlanta (atlantaga.gov), Nashville (data.nashville.gov), San Jose (data.sanjoseca.gov), Kansas City (data.kcmo.org), Honolulu (data.honolulu.gov), Baltimore (data.baltimorecity.gov), Louisville (data.louisvilleky.gov), New Orleans (data.nola.gov), Chattanooga (data.chattanooga.gov)

**Also search for county portals**: King County, Los Angeles County, Cook County, Harris County, Maricopa County, etc.

### Task 1.4 — Government Open Data Portals (International)

| Portal | URL | Scope | Notes |
|---|---|---|---|
| data.gov.uk | data.gov.uk | UK | UK government open data |
| data.europa.eu | data.europa.eu | EU | European Data Portal |
| open.canada.ca | open.canada.ca | Canada | Canadian government |
| data.gov.au | data.gov.au | Australia | Australian government |
| data.gov.in | data.gov.in | India | Indian government |
| datos.gob.mx | datos.gob.mx | Mexico | Mexican government |
| data.go.jp | data.go.jp | Japan | Japanese government |
| data.gov.sg | data.gov.sg | Singapore | Singapore government |
| data.govt.nz | data.govt.nz | New Zealand | NZ government |
| govdata.de | govdata.de | Germany | German government |
| data.gouv.fr | data.gouv.fr | France | French government |
| dati.gov.it | dati.gov.it | Italy | Italian government |
| datos.gob.es | datos.gob.es | Spain | Spanish government |
| data.overheid.nl | data.overheid.nl | Netherlands | Dutch government |
| opendata.swiss | opendata.swiss | Switzerland | Swiss government |
| data.go.kr | data.go.kr | South Korea | Korean government |
| data.gov.tw | data.gov.tw | Taiwan | Taiwanese government |
| dados.gov.br | dados.gov.br | Brazil | Brazilian government |
| data.go.th | data.go.th | Thailand | Thai government |
| data.gov.ie | data.gov.ie | Ireland | Irish government |
| data.gov.il | data.gov.il | Israel | Israeli government |
| data.gov.ru | data.gov.ru | Russia | Russian government |

**Search task**: Search for `"{country name}" open data portal government` for every UN member state. Also check the Open Data Barometer and Global Data Barometer rankings for leads.

### Task 1.5 — Supranational / International Organization Data

| Organization | URL | Notes |
|---|---|---|
| World Bank | data.worldbank.org | Development indicators, 16K+ datasets |
| UN Data | data.un.org | Aggregated UN statistics |
| UN Stats | unstats.un.org | SDG indicators, national accounts |
| OECD | data.oecd.org | Economic/social indicators for member states |
| WHO | who.int/data | Global health data |
| IMF | data.imf.org | International financial statistics |
| WTO | data.wto.org | Trade data |
| FAO | fao.org/faostat | Agriculture and food data |
| UNESCO | data.uis.unesco.org | Education, science, culture statistics |
| ILO | ilostat.ilo.org | Labor statistics |
| UNICEF | data.unicef.org | Children/maternal health data |
| UNHCR | data.unhcr.org | Refugee/displacement data |
| World Economic Forum | weforum.org/reports | Global competitiveness, etc. |
| IAEA | iaea.org/resources/databases | Nuclear energy data |
| Eurostat | ec.europa.eu/eurostat | EU statistics |
| African Development Bank | dataportal.opendataforafrica.org | African economic data |
| Asian Development Bank | data.adb.org | Asian economic data |
| Inter-American Development Bank | data.iadb.org | Latin American data |

---

## PHASE 2: Public Cloud Data Warehouses & Marketplaces

### Task 2.1 — BigQuery Public Datasets

- **URL**: console.cloud.google.com/marketplace/browse?filter=solution-type:dataset
- **Also**: cloud.google.com/bigquery/public-data
- **Method**: List all datasets in the `bigquery-public-data` project
- These are directly queryable via SQL at no cost (1TB/month free)
- **Known datasets include**: GitHub activity, Stack Overflow, Hacker News, US Census, CMS Medicare, SEC EDGAR, NOAA weather, Ethereum blockchain, Wikipedia, NYC taxi trips, Google Trends, US geographic data
- **Search**: Enumerate the full catalog — there are 200+ datasets

### Task 2.2 — Snowflake Marketplace

- **URL**: app.snowflake.com/marketplace
- **Method**: Browse all free/public listings
- **Categories**: Financial, healthcare, weather, government, ESG, demographics, geospatial
- Providers include: Knoema, Cybersyn, Starschema, Weather Source, SafeGraph, Rearc
- Some are free, some require paid accounts
- **Search**: Filter by "Free" and enumerate all available datasets

### Task 2.3 — AWS Open Data Registry

- **URL**: registry.opendata.aws
- **Method**: Enumerate the full registry
- Data is hosted on S3 — free to access (you pay for compute)
- **Categories**: Climate, life sciences, geospatial, machine learning, satellite imagery
- Notable: Landsat, NEXRAD weather radar, 1000 Genomes, Common Crawl, Open Street Map

### Task 2.4 — Azure Open Datasets

- **URL**: azure.microsoft.com/en-us/products/open-datasets
- **Method**: Enumerate catalog
- **Categories**: Government, health, transportation, economic, demographic, weather

### Task 2.5 — Databricks Marketplace

- **URL**: databricks.com/product/marketplace
- **Method**: Browse free datasets
- Focus on ML/analytics datasets

### Task 2.6 — Other Cloud/Commercial Data Marketplaces

| Name | URL | Notes |
|---|---|---|
| Dewey Data | deweydata.io | Aggregated alternative data (some free) |
| Datarade | datarade.ai | Data marketplace/search engine |
| Crunchbase | crunchbase.com | Company/startup data (free tier) |
| PitchBook | pitchbook.com | VC/PE data (not free, but worth cataloging) |
| Statista | statista.com | Statistics portal (partial free) |
| Quandl (now Nasdaq Data Link) | data.nasdaq.com | Financial/economic data |
| Refinitiv/LSEG | refinitiv.com | Financial data (not free) |
| Bloomberg Open Data | bloomberg.com | Some open datasets |

---

## PHASE 3: Domain-Specific Data Portals

### Task 3.1 — Scientific & Research Data

| Portal | URL | Domain |
|---|---|---|
| Kaggle Datasets | kaggle.com/datasets | ML/general (80K+ datasets) |
| Hugging Face Datasets | huggingface.co/datasets | ML/NLP (100K+ datasets) |
| Google Dataset Search | datasetsearch.research.google.com | Meta-search across all domains |
| Papers with Code | paperswithcode.com/datasets | ML research datasets |
| UCI ML Repository | archive.ics.uci.edu/ml | Classic ML datasets |
| Zenodo | zenodo.org | Research data repository (CERN) |
| Dryad | datadryad.org | Research data repository |
| Figshare | figshare.com | Research data repository |
| Dataverse (Harvard) | dataverse.harvard.edu | Research data repository |
| ICPSR | icpsr.umich.edu | Social science data |
| re3data.org | re3data.org | Registry of 3K+ research data repositories |
| OpenAIRE | explore.openaire.eu | European research data |
| PANGAEA | pangaea.de | Earth/environmental science |
| GenBank/NCBI | ncbi.nlm.nih.gov | Genomic/biomedical data |
| Protein Data Bank | rcsb.org | Protein structure data |
| ClinicalTrials.gov | clinicaltrials.gov | Clinical trial data |
| PhysioNet | physionet.org | Physiological/clinical data |
| ImageNet | image-net.org | Image classification |
| COCO | cocodataset.org | Object detection/segmentation |
| Common Crawl | commoncrawl.org | Web crawl data (petabytes) |

### Task 3.2 — Geospatial Data

| Portal | URL | Notes |
|---|---|---|
| OpenStreetMap | openstreetmap.org | Crowdsourced global map data |
| Natural Earth | naturalearthdata.com | Global vector/raster data |
| TIGER/Line (Census) | census.gov/geographies | US boundary files |
| ArcGIS Hub | hub.arcgis.com | Esri's open data platform |
| ArcGIS Living Atlas | livingatlas.arcgis.com | Curated global geospatial |
| GeoNames | geonames.org | Global gazetteer |
| GADM | gadm.org | Global administrative boundaries |
| Copernicus | copernicus.eu | EU Earth observation |
| Sentinel Hub | sentinel-hub.com | Satellite imagery |
| USGS Earth Explorer | earthexplorer.usgs.gov | Satellite/aerial imagery |
| Planet | planet.com | Satellite imagery (some open) |
| Mapbox | mapbox.com | Map data/tiles (free tier) |
| Overture Maps | overturemaps.org | Open map data (Linux Foundation) |
| OpenTopography | opentopography.org | Lidar/elevation data |
| Global Forest Watch | globalforestwatch.org | Forest/land use data |

### Task 3.3 — Financial & Economic Data

| Portal | URL | Notes |
|---|---|---|
| FRED (Federal Reserve) | fred.stlouisfed.org | 800K+ time series |
| Yahoo Finance | finance.yahoo.com | Stock data (API) |
| Alpha Vantage | alphavantage.co | Stock/forex/crypto API (free tier) |
| EDGAR (SEC) | sec.gov/edgar | All US public company filings |
| Open FIGI | openfigi.com | Financial instrument identifiers |
| Quandl / Nasdaq Data Link | data.nasdaq.com | Financial/economic (free tier) |
| ECB Statistical Data Warehouse | sdw.ecb.europa.eu | European central bank data |
| Bank for International Settlements | bis.org/statistics | International banking stats |
| GLEIF | gleif.org | Legal entity identifiers |
| OpenCorporates | opencorporates.com | Global company data |
| SEC XBRL | sec.gov/structureddata | Machine-readable financial filings |
| Polygon.io | polygon.io | Market data API (free tier) |
| CoinGecko | coingecko.com | Crypto data API |
| IEX Cloud | iexcloud.io | Market data (free tier) |

### Task 3.4 — Health & Biomedical Data

| Portal | URL | Notes |
|---|---|---|
| CMS Open Data | data.cms.gov | Medicare/Medicaid |
| HealthData.gov | healthdata.gov | US health datasets |
| WHO Global Health Observatory | who.int/data/gho | Global health indicators |
| IHME / Global Burden of Disease | healthdata.org | Disease/mortality estimates |
| OpenFDA | open.fda.gov | Drug, device, food recall data |
| CDC WONDER | wonder.cdc.gov | Mortality, disease, environmental |
| GHDx (Global Health Data Exchange) | ghdx.healthdata.org | Health data catalog |
| MIMIC (PhysioNet) | mimic.mit.edu | Critical care clinical data |
| UK Biobank | ukbiobank.ac.uk | Large-scale biomedical (registration) |
| Genomic Data Commons | gdc.cancer.gov | Cancer genomic data |
| DrugBank | drugbank.com | Drug data (partial free) |
| PubChem | pubchem.ncbi.nlm.nih.gov | Chemical/bioassay data |

### Task 3.5 — Transportation Data

| Portal | URL | Notes |
|---|---|---|
| OpenFlights | openflights.org | Airport, airline, route data |
| GTFS feeds | transitfeeds.com / mobility database | Transit schedules worldwide |
| OpenMobilityData | transitland.org | Transit data aggregator |
| National Transit Database | transit.dot.gov/ntd | US transit stats |
| NHTSA | nhtsa.gov/data | Vehicle safety, crash data |
| FAA | faa.gov/data_research | Aviation data |
| AIS (ship tracking) | marinecadastre.gov | Vessel tracking data |
| OpenRailwayMap | openrailwaymap.org | Global rail data |
| Citibike/bike share | multiple | Trip data (many cities publish) |
| Uber Movement | movement.uber.com | Travel times (if still active) |
| BTS (Bureau of Transportation Statistics) | bts.gov | US transportation stats |

### Task 3.6 — Energy & Climate Data

| Portal | URL | Notes |
|---|---|---|
| EIA | eia.gov | US energy data |
| IRENA | irena.org/Statistics | Renewable energy data |
| IEA | iea.org/data-and-statistics | Global energy (partial free) |
| NOAA Climate Data | ncdc.noaa.gov | Weather/climate |
| NASA Earthdata | earthdata.nasa.gov | Earth observation |
| Berkeley Earth | berkeleyearth.org | Global temperature data |
| Global Carbon Project | globalcarbonproject.org | CO2 emissions |
| Copernicus Climate Data Store | cds.climate.copernicus.eu | European climate data |
| NREL | nrel.gov/data | Renewable energy data |
| OpenEI | openei.org | Energy data wiki |

### Task 3.7 — Social / Demographic Data

| Portal | URL | Notes |
|---|---|---|
| US Census | data.census.gov | American demographic data |
| American Community Survey | census.gov/programs-surveys/acs | Annual demographic estimates |
| IPUMS | ipums.org | Harmonized census/survey data |
| Pew Research | pewresearch.org | Survey/polling data |
| Gallup | gallup.com | Survey data (partial) |
| DHS (Demographic & Health Surveys) | dhsprogram.com | Global health surveys |
| World Values Survey | worldvaluessurvey.org | Cross-cultural survey data |
| General Social Survey (GSS) | gss.norc.org | US social trends |
| UN Population Division | population.un.org | Global population data |

### Task 3.8 — Education Data

| Portal | URL | Notes |
|---|---|---|
| NCES (National Center for Ed Stats) | nces.ed.gov | US education data |
| IPEDS | nces.ed.gov/ipeds | Higher education data |
| College Scorecard | collegescorecard.ed.gov | US college outcomes |
| Common Data Set | various | Individual college data |
| PISA (OECD) | oecd.org/pisa | International student assessment |
| EdX/Coursera | research datasets | Learning analytics |

### Task 3.9 — Legal & Regulatory Data

| Portal | URL | Notes |
|---|---|---|
| CourtListener | courtlistener.com | US court opinions/PACER data |
| RECAP (Free Law Project) | free.law | Federal court filings |
| Regulations.gov | regulations.gov | US federal rulemaking |
| Federal Register | federalregister.gov | US regulations API |
| Congress.gov / ProPublica Congress API | congress.gov / propublica.org | Legislative data |
| GovInfo | govinfo.gov | US government publications |
| Law.gov | law.gov | Legal data initiative |
| GDELT | gdeltproject.org | Global events database |
| ACLED | acleddata.com | Armed conflict data |

### Task 3.10 — Technology / Internet Data

| Portal | URL | Notes |
|---|---|---|
| GitHub Archive | gharchive.org | GitHub event data |
| Stack Exchange Data Dump | archive.org/details/stackexchange | All Stack Exchange posts |
| Wikipedia Dumps | dumps.wikimedia.org | All Wikipedia content |
| Common Crawl | commoncrawl.org | Web crawl corpus |
| Internet Archive | archive.org | Web, books, media |
| GHTorrent | ghtorrent.org | GitHub data mirror |
| npm registry | registry.npmjs.org | Package metadata |
| PyPI | pypi.org | Python package data |
| RIPE/ARIN | stat.ripe.net | Internet routing/allocation |
| Shodan | shodan.io | Internet device data (free tier) |
| BuiltWith | builtwith.com | Technology usage data |

---

## PHASE 4: Portal Discovery Infrastructure

### Task 4.1 — Meta-Catalogs (Catalogs of Catalogs)

These index other data portals — essential for completeness:

| Catalog | URL | What it indexes |
|---|---|---|
| DataPortals.org | dataportals.org | 600+ open data portals worldwide |
| Open Data Inception | opendatainception.io | 2,700+ open data portals on a map |
| re3data.org | re3data.org | 3,000+ research data repositories |
| CKAN instance registry | ckan.org/instances | All known CKAN portals |
| Socrata Discovery API | api.us.socrata.com/api/catalog/v1/domains | All Socrata-powered portals |
| ArcGIS Hub search | hub.arcgis.com | All ArcGIS Hub sites |
| Google Dataset Search | datasetsearch.research.google.com | Meta-search |
| data.world | data.world | Data catalog / community |
| Awesome Public Datasets (GitHub) | github.com/awesomedata/awesome-public-datasets | Curated list |
| Open Data Monitor | opendatamonitor.eu | European open data portals |
| Global Data Barometer | globaldatabarometer.org | Country-level data rankings |
| Open Data Index (OKFN) | index.okfn.org | Country-level open data assessments |
| US City Open Data Census | census.okfn.org | US city open data |

**CRITICAL**: These meta-catalogs are the highest-leverage tasks. Start here to get leads, then validate each portal individually.

### Task 4.2 — Platform-Based Discovery

Many portals run on the same software. Enumerate all instances of each platform:

**Socrata** (now Tyler Technologies):
- Use discovery API: `https://api.us.socrata.com/api/catalog/v1/domains` — returns ALL Socrata-powered domains
- This is the single most efficient query in the entire plan — one API call gives you hundreds of portals

**CKAN**:
- Official instance list: ckan.org/instances
- Also search: `"Powered by CKAN"` in Google
- Check `/api/3/action/package_list` on suspected CKAN sites

**ArcGIS Hub**:
- hub.arcgis.com — browse all organizations
- Each ArcGIS Hub site is its own portal with potentially thousands of layers

**DKAN** (Drupal-based):
- Search: `"Powered by DKAN"` in Google
- getdkan.org for instance list

**OpenDataSoft**:
- data.opendatasoft.com — lists all ODS-powered portals
- Used by many European cities and some US cities

**Junar**:
- Used by some Latin American governments
- junar.com/customers for leads

### Task 4.3 — API Directory Discovery

| Directory | URL | Notes |
|---|---|---|
| ProgrammableWeb | programmableweb.com | 24K+ APIs cataloged |
| RapidAPI Hub | rapidapi.com | API marketplace |
| Public APIs (GitHub) | github.com/public-apis/public-apis | Curated list of free APIs |
| APIs.guru | apis.guru | OpenAPI directory |
| Postman Public Workspace | postman.com/explore | Public API collections |
| Any API | any-api.com | API directory |
| API List | apilist.fun | Curated API list |
| Data.gov APIs | api.data.gov | US government APIs |
| EU Open Data APIs | data.europa.eu/api | European APIs |

### Task 4.4 — Linked Data / SPARQL Endpoints

Semantic web / linked data sources:

| Source | URL | Notes |
|---|---|---|
| DBpedia | dbpedia.org/sparql | Structured Wikipedia data |
| Wikidata | query.wikidata.org | Wikidata SPARQL endpoint |
| LinkedGeoData | linkedgeodata.org | OSM as linked data |
| Bio2RDF | bio2rdf.org | Biomedical linked data |
| Linked Open Data Cloud | lod-cloud.net | Catalog of linked data sources |
| SPARQL endpoints list | sparqles.ai.wu.ac.at | Monitoring 500+ SPARQL endpoints |
| GeoNames | sws.geonames.org | Geographic linked data |

---

## PHASE 5: Broad Discovery Searches

### Task 5.1 — Web Searches for Undiscovered Portals

```
"open data portal" -site:known-portals (by country/region)
"data catalog" government free download
"public dataset" API "no authentication"
"bulk download" government data CSV
"data warehouse" public free query SQL
"open data" portal launch 2024 OR 2025 OR 2026
"open data" portal site:govtech.com
"open data" portal site:statescoop.com
"open data" site:sunlightfoundation.org
"open data" site:opendataenterprise.org
"data portal" site:medium.com government
```

### Task 5.2 — Reddit / Hacker News / Forums

Data communities frequently discuss and share portals:
- Reddit: r/datasets, r/opendata, r/datascience, r/dataisbeautiful
- Hacker News: search "open data" "public dataset" "data portal"
- Data Science Stack Exchange
- KDnuggets: datasets section

### Task 5.3 — Conference and Report Mining

Open data conferences and reports catalog portals:
- **Open Data Conference / IODC** proceedings
- **OKFN (Open Knowledge Foundation)** publications
- **Sunlight Foundation** reports
- **Open Data Enterprise** reports
- **GovTech** articles on open data launches
- **StateScoop** coverage of state/local data portals

### Task 5.4 — Wikipedia Lists

Wikipedia maintains several relevant lists:
- "List of open-government data sites"
- "Open data in the United States"
- "Open data by country"
- "List of online databases"
- Category pages for open data

---

## PHASE 6: Validation

### Task 6.1 — Verify Each Portal is Active

For every portal in the inventory:
1. Confirm the URL resolves
2. Confirm datasets are accessible (not just a landing page)
3. Note the query/access method
4. Count approximate datasets if possible

### Task 6.2 — Deduplicate

Many datasets appear on multiple portals (e.g., a federal dataset on data.gov AND on BigQuery). Flag duplicates but keep all portal entries — the value is knowing where to access data, not just that it exists.

### Task 6.3 — Gap Analysis

Check coverage against:
- All countries in the Global Data Barometer top 30
- All US states
- All US cities with population > 100,000
- All major academic disciplines
- All major international organizations

### Task 6.4 — Classify by Queryability

For the business opportunity, the key distinction is:
- **Directly queryable** (SQL, API, SPARQL) — highest value
- **Bulk download** (CSV, JSON files) — can be loaded into a warehouse
- **Request-based** (FOIA, registration required) — lowest accessibility but still catalogable

---

## Execution Notes

- **Start with Phase 4 (meta-catalogs)** — these give you the most leads per unit of effort
- **Socrata Discovery API is the single highest-leverage call** — one request returns hundreds of portals
- **DataPortals.org and Open Data Inception** together cover most known government portals globally
- **re3data.org** covers most research data repositories
- Phases 1-3 fill in detail and catch what meta-catalogs miss
- Phase 5 catches the long tail
- Phase 6 validates everything
