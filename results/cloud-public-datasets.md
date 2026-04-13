# Cloud Platform Public Datasets Catalog

Research date: 2026-04-10

---

## 1. Google BigQuery Public Datasets

**Project**: `bigquery-public-data`
**Total**: ~213 official public datasets (as of early 2026)
**Access method**: SQL (BigQuery console, bq CLI, REST API, client libraries)
**Pricing**: Free storage (Google pays); first 1 TB/month of queries free; pay per query after that
**Browse**: https://console.cloud.google.com/marketplace/browse?filter=solution-type:dataset

### Known Datasets

| Dataset ID | Name | Domain | Description |
|---|---|---|---|
| `stackoverflow` | Stack Overflow | Technology | Q&A posts, users, votes, comments, tags — quarterly updates |
| `hacker_news` | Hacker News | Technology | Posts, comments, and votes from Hacker News |
| `github_repos` | GitHub Repos | Technology | Contents, commits, languages, licenses for public GitHub repos |
| `samples` | BigQuery Samples | Reference | Sample tables including Shakespeare, Natality, GSOD |
| `usa_names` | USA Names | Demographics | Baby names by state from Social Security Administration |
| `census_bureau_acs` | American Community Survey | Demographics | Demographic, economic, housing data from US Census |
| `census_bureau_usa` | US Census Bureau | Demographics | Decennial census population data |
| `geo_us_boundaries` | US Geographic Boundaries | Geospatial | State, county, ZIP code boundaries |
| `noaa_gsod` | NOAA GSOD | Weather | Global Summary of the Day weather data, 9000+ stations, 1929-present |
| `noaa_isd` | NOAA ISD | Weather | Integrated Surface Database — hourly weather observations |
| `ghcn_d` | GHCN Daily | Weather | Global Historical Climatology Network daily observations |
| `ghcn_m` | GHCN Monthly | Weather | Global Historical Climatology Network monthly summaries |
| `epa_historical_air_quality` | EPA Air Quality | Environment | Historical air quality measurements across the US |
| `openaq` | OpenAQ | Environment | Global air quality measurements from ground-level sensors |
| `google_analytics_sample` | Google Analytics Sample | Marketing | Sample Google Analytics 360 data for a real e-commerce site |
| `google_trends` | Google Trends | Marketing | Google search interest data by region and time |
| `bbc_news` | BBC News | Media | BBC news article full text |
| `wikipedia` | Wikipedia | Reference | Wikipedia pageview statistics |
| `new_york_citibike` | NYC Citi Bike Trips | Transportation | Trip data: start/end stations, duration, user type |
| `san_francisco_bikeshare` | SF Bikeshare | Transportation | San Francisco bike share trip data |
| `austin_bikeshare` | Austin Bikeshare | Transportation | Austin B-cycle trip data |
| `new_york_taxi_trips` | NYC Taxi Trips | Transportation | Yellow and green taxi trip records |
| `chicago_taxi_trips` | Chicago Taxi Trips | Transportation | Chicago taxi trip data |
| `chicago_crime` | Chicago Crime | Public Safety | Reported crime incidents in Chicago |
| `san_francisco_sfpd_incidents` | SF Police Incidents | Public Safety | San Francisco police department incident reports |
| `austin_crime` | Austin Crime | Public Safety | Austin police department crime reports |
| `iowa_liquor_sales` | Iowa Liquor Sales | Commerce | Every wholesale purchase of liquor in Iowa |
| `baseball` | Baseball | Sports | Historical Major League Baseball statistics |
| `ncaa_basketball` | NCAA Basketball | Sports | Men's and women's NCAA tournament data |
| `patents` | Google Patents | Intellectual Property | Patent publications and research |
| `patents_view` | PatentsView | Intellectual Property | USPTO patent data (assignees, inventors, claims) |
| `crypto_ethereum` | Ethereum Blockchain | Blockchain/Crypto | Ethereum transactions, blocks, smart contracts — daily updates |
| `crypto_bitcoin` | Bitcoin Blockchain | Blockchain/Crypto | Bitcoin transactions and blocks |
| `crypto_polygon` | Polygon Blockchain | Blockchain/Crypto | Polygon network data |
| `crypto_avalanche_contract_chain` | Avalanche | Blockchain/Crypto | Avalanche C-Chain data |
| `cms_medicare` | CMS Medicare | Healthcare | Medicare provider utilization and payment data |
| `cms_synthetic_patient_data_omop` | CMS Synthetic Patient Data | Healthcare | Synthetic claims data in OMOP format |
| `fda_food` | FDA Food | Healthcare | FDA food enforcement and recall data |
| `nlm_rxnorm` | RxNorm | Healthcare | National Library of Medicine drug vocabulary |
| `world_bank_intl_debt` | World Bank Debt | Economics | International debt statistics |
| `world_bank_intl_education` | World Bank Education | Economics | International education statistics |
| `world_bank_wdi` | World Development Indicators | Economics | World Bank development indicators |
| `bls` | Bureau of Labor Statistics | Economics | Employment, wages, CPI data |
| `sec_quarterly_financials` | SEC Financials | Finance | Quarterly financial statements from SEC filings |
| `london_bicycles` | London Bicycles | Transportation | London bike share trip data |
| `ml_datasets` | ML Datasets | Machine Learning | Classic ML datasets (iris, etc.) |
| `thelook_ecommerce` | TheLook E-commerce | Commerce | Synthetic e-commerce dataset for analytics practice |
| `ga4_obfuscated_sample_ecommerce` | GA4 Sample | Marketing | Obfuscated Google Analytics 4 e-commerce data |
| `sunroof_solar` | Project Sunroof | Energy | Google's solar potential estimates for buildings |
| `geo_openstreetmap` | OpenStreetMap | Geospatial | OpenStreetMap planet data |
| `human_genome_variants` | Human Genome Variants | Genomics | Genomic variant data |
| `genomics_cannabis` | Cannabis Genomics | Genomics | Cannabis sativa genome annotations |
| `idc` | Imaging Data Commons | Healthcare | Cancer imaging data from NCI |

> **Note**: This is a representative list. The full catalog contains ~213 datasets. Browse the complete list at the [Google Cloud Marketplace](https://console.cloud.google.com/marketplace/browse?filter=solution-type:dataset).

---

## 2. AWS Open Data Registry

**Total**: 650+ datasets (and growing — 82 new/updated in a recent quarter)
**Access method**: S3 (direct download), Athena (SQL), AWS CLI, some via API
**Pricing**: Free to access; you pay only for compute/egress in your own AWS account
**Browse**: https://registry.opendata.aws
**Source repo**: https://github.com/awslabs/open-data-registry

### Known Datasets by Category

#### Genomics & Life Sciences
| Name | Description | Format |
|---|---|---|
| 1000 Genomes | Genomic variation across 3,202 individuals / 602 trios | VCF, BAM, CRAM on S3 |
| NIH STRIDES datasets | Various NIH-funded genomic and biomedical datasets | Mixed |
| ClinVar | NCBI database of genomic variant-disease relationships | VCF |
| gnomAD | Genome Aggregation Database — population variant frequencies | VCF, Hail |
| Open Targets | Drug target identification and validation data | Parquet, JSON |
| Allen Brain Atlas | Mouse and human brain gene expression atlases | Multiple |
| TCGA (Cancer Genome Atlas) | Multi-cancer genomic characterization | BAM, VCF, MAF |
| GTEx | Genotype-Tissue Expression — tissue-specific gene expression | Multiple |
| UniProt | Protein sequence and functional information | FASTA, XML |

#### Climate & Weather
| Name | Description | Format |
|---|---|---|
| NOAA GOES-16/17/18 | Geostationary weather satellite imagery | NetCDF on S3 |
| NOAA NEXRAD | National Weather Service Doppler radar data | Level II/III archives |
| NOAA GHCN | Global Historical Climatology Network | CSV |
| NOAA GFS | Global Forecast System weather model output | GRIB2 |
| ERA5 (ECMWF) | Global atmospheric reanalysis from 1940 to present | NetCDF, Zarr |
| NASA NEX-GDDP-CMIP6 | High-res bias-corrected climate change projections | NetCDF |
| NASA POWER | Surface solar irradiance and meteorology | NetCDF, CSV |
| Copernicus Climate Data | EU climate monitoring service data | NetCDF |

#### Satellite & Geospatial
| Name | Description | Format |
|---|---|---|
| Landsat | 50+ years of Earth observation imagery | GeoTIFF (COG) |
| Sentinel-2 | ESA optical satellite — 10m resolution, 5-day revisit | JPEG2000, COG |
| Sentinel-1 | ESA SAR satellite — all-weather radar imagery | GeoTIFF |
| SpaceNet | Labeled satellite imagery for ML (buildings, roads) | GeoTIFF + GeoJSON |
| Capella Space SAR | Commercial SAR satellite open data samples | GeoTIFF |
| NAIP | National Agriculture Imagery Program — US aerial photos | GeoTIFF |
| Digital Earth Africa | Africa-wide analysis-ready satellite data | GeoTIFF, COG |
| OpenStreetMap | Crowdsourced global map data | PBF, Parquet |
| Overture Maps | Open map data (places, buildings, transportation) | GeoParquet |

#### Natural Language & Web
| Name | Description | Format |
|---|---|---|
| Common Crawl | Petabytes of web crawl data (raw + extracted text) | WARC, WET, WAT |
| Wikipedia dumps | Full Wikipedia article text in multiple languages | XML, Parquet |
| C4 (Colossal Clean Crawled Corpus) | Cleaned web text for NLP training | JSON |
| Pile | 800GB diverse text dataset for language modeling | JSONL |

#### General / Other
| Name | Description | Format |
|---|---|---|
| US Census | American Community Survey and decennial census | CSV, Parquet |
| NYC Taxi & Limousine | Taxi trip records for NYC | CSV, Parquet |
| IRS Statistics of Income | Tax return statistics | CSV |
| USDA NAIP | Aerial photography of US agricultural land | GeoTIFF |
| FDA Drug Labels | Structured product labeling for drugs | XML |
| CORD-19 | COVID-19 open research dataset (Allen AI) | JSON |
| Amazon Reviews | Product review dataset | Parquet |
| LSST/Rubin Observatory | Astronomical survey data | FITS |

> **Note**: This is a representative subset. The full registry has 650+ datasets. Browse at [registry.opendata.aws](https://registry.opendata.aws).

---

## 3. Azure Open Datasets

**Total**: ~30 curated datasets
**Access method**: Python SDK (azureml-opendatasets), Spark, REST API, direct download (Parquet/CSV)
**Pricing**: Free (Microsoft pays storage); egress charges may apply for large reads on Azure
**Browse**: https://learn.microsoft.com/en-us/azure/open-datasets/dataset-catalog

### Complete Dataset Catalog

#### Transportation
| Name | Description | Format |
|---|---|---|
| TartanAir: AirSim Simulation | Autonomous vehicle simulation data for SLAM | Multiple |
| NYC Taxi — Yellow | Yellow taxi trip records (pickup/dropoff, fares, distances) | Parquet |
| NYC Taxi — Green | Green taxi trip records | Parquet |
| NYC Taxi — FHV | For-hire vehicle trip records | Parquet |

#### Health & Genomics
| Name | Description | Format |
|---|---|---|
| COVID-19 Data Lake | Collection of COVID-related data: cases, testing, hospital capacity, mobility | Multiple |

#### Labor & Economics
| Name | Description | Format |
|---|---|---|
| US Labor Force Statistics | Participation rates by age, gender, race | Parquet |
| US National Employment Hours & Earnings | CES nonfarm employment estimates | Parquet |
| US State Employment Hours & Earnings | State-level CES employment estimates | Parquet |
| US Local Area Unemployment Statistics | Monthly/annual employment data by region | Parquet |
| US Consumer Price Index | CPI — average price changes for urban consumers | Parquet |
| US Producer Price Index — Industry | PPI by industry | Parquet |
| US Producer Price Index — Commodities | PPI by commodity | Parquet |

#### Population & Safety
| Name | Description | Format |
|---|---|---|
| US Population by County | Population by gender/race from 2000/2010 Census | Parquet |
| US Population by ZIP Code | Population by gender/race from 2010 Census | Parquet |
| Boston Safety Data | 311 service requests — daily updates | Parquet |
| Chicago Safety Data | 311 service requests — daily updates | Parquet |
| New York City Safety Data | 311 service requests 2010-present — daily updates | Parquet |
| San Francisco Safety Data | Fire department calls and 311 cases, 2015-present | Parquet |
| Seattle Safety Data | Fire department 911 dispatches, 2010-present | Parquet |

#### Supplemental & ML
| Name | Description | Format |
|---|---|---|
| Diabetes | 442 samples, 10 features — classic ML dataset | CSV |
| OJ Sales Simulated Data | Dominick's OJ dataset + simulated data for batch model training | CSV |
| MNIST | 70,000 handwritten digit images (60K train, 10K test) | Binary |
| Microsoft News (MIND) | Large-scale news recommendation benchmark | TSV |
| Public Holidays | Worldwide holidays for 38 countries, 1970-2099 | Parquet |
| Russian Open Speech-to-Text | Large-scale Russian language STT dataset | WAV + text |

---

## 4. Snowflake Marketplace (Free Listings)

**Total**: 3,400+ total listings from 820+ providers; hundreds are free
**Access method**: SQL via Snowflake account (Delta Sharing for external access)
**Pricing**: Free listings require a Snowflake account (which has a free trial); data access is free, compute costs are yours
**Browse**: https://app.snowflake.com/marketplace

### Notable Free Datasets

#### Cybersyn Foundations (60+ public-domain sources)
| Name | Domain | Description |
|---|---|---|
| Bureau of Labor Statistics | Economics | Employment, wages, CPI, PPI |
| Federal Reserve (FRED) | Economics | Interest rates, money supply, GDP |
| Bureau of Economic Analysis | Economics | GDP, personal income, trade data |
| FDIC | Finance | Bank financial data, institution info |
| SEC Filings | Finance | Company financial statements, ownership |
| US Census / ACS | Demographics | Population, housing, socioeconomic data |
| CDC | Health | Disease surveillance, mortality, vaccination |
| World Health Organization | Health | Global health statistics |
| World Bank | Economics | Development indicators, debt statistics |
| NOAA | Weather | Weather and climate observations |
| Climate Watch | Environment | Greenhouse gas emissions, climate policy |
| EIA (Energy Info Admin) | Energy | Energy production, consumption, prices |
| USPTO Patent Grants | IP | Patent application and grant data |
| GitHub Archive | Technology | Public GitHub event data |
| OpenAlex | Academic | Open scholarly metadata |
| US Addresses | Geospatial | Standardized US address data |
| Government Contracts | Public Sector | Federal procurement data |
| Crime Rates | Public Safety | US crime statistics |
| Foreign Exchange Rates | Finance | Currency exchange rates |
| Holidays | Reference | Global holiday dates |

#### Other Free Providers on Snowflake Marketplace
| Provider | Dataset | Domain | Description |
|---|---|---|---|
| Knoema | Economy Data Atlas | Economics | Global macroeconomic data across 1000+ indicators |
| Knoema | Demographics Data Atlas | Demographics | Population, migration, urbanization |
| Knoema | Agriculture Data Atlas | Agriculture | Crop production, trade, food security |
| Knoema | Tourism Data Atlas | Tourism | International tourism arrivals, receipts |
| Knoema | Commodities Data Atlas | Commodities | Global commodity prices and trade |
| Knoema | Environment Data Atlas | Environment | Emissions, natural resources, energy |
| StarSchema | COVID-19 Epidemiological Data | Health | Cases, testing, hospitalizations, vaccines — hourly updates |
| Weather Source | Global Weather & Climate Data for BI | Weather | 1000 US zip codes + 6 intl cities, 15-day forecast |
| OpenCorporates | Company Data (Sample) | Business | Sample corporate registry data (free tier) |
| SafeGraph | US Open Census Data | Demographics | 7500+ attributes from ACS 2019 |
| CARTO | Overture Maps (multiple layers) | Geospatial | Places, buildings, transportation, divisions, addresses |

---

## 5. Databricks Marketplace (Free Listings)

**Total**: Growing catalog; mix of free and paid
**Access method**: Delta Sharing protocol; accessible from any Databricks workspace with Unity Catalog
**Pricing**: Free listings available; Databricks account required
**Browse**: https://marketplace.databricks.com

### Notable Free Datasets

| Provider | Dataset | Domain | Description |
|---|---|---|---|
| CARTO | Overture Maps — Places | Geospatial | Points of interest worldwide |
| CARTO | Overture Maps — Buildings | Geospatial | Building footprints |
| CARTO | Overture Maps — Transportation | Geospatial | Road network and transit |
| CARTO | Overture Maps — Divisions | Geospatial | Administrative boundaries |
| CARTO | Overture Maps — Addresses | Geospatial | Global address data |
| CARTO | Overture Maps — Base | Geospatial | Land use, water, infrastructure |
| Databricks | Sample datasets (built-in) | Reference | NYC taxi, wine quality, lending club, flights |
| Various | Solution Accelerators | ML/AI | Pre-built ML notebooks and models |
| Various | ML Models | ML/AI | Pre-trained models shared via marketplace |

---

## 6. Other Data Marketplaces

### Dewey Data (deweydata.io)
- **Model**: Subscription-only (NOT free). Single license unlocks 150+ commercial data providers.
- **Domain focus**: People, place, company, and government data for academic research.
- **Free option**: Annual grant program offers free 2-year subscriptions to 5 selected research teams.
- **Notable providers**: Advan Research (foot traffic), SafeGraph, Revelio Labs (workforce), Lightcast (labor market).
- **Access**: Web platform, API, bulk download.
- **Verdict**: Not free for general use.

### Datarade (datarade.ai)
- **Model**: Marketplace connecting buyers to 2,600+ data providers across 560+ categories. Free to browse and compare.
- **Domain focus**: All categories — location, financial, marketing, company, weather, etc.
- **Free option**: Free data samples and previews. Actual datasets are paid (prices vary by provider).
- **Access**: Direct from providers (API, file delivery, cloud integration).
- **Verdict**: Free to discover; datasets themselves are mostly paid.

### data.world
- **Model**: Freemium. Free Community plan provides access to thousands of open datasets and projects.
- **Domain focus**: General — government, health, education, environment, social, business.
- **Free option**: Yes — thousands of community-contributed datasets are free. In-browser SQL queries.
- **Access**: Web UI (SQL queries, visualizations), API, CSV/JSON download.
- **Notable free datasets**: US government data, WHO data, city open data portals, user-contributed datasets.
- **Verdict**: Genuinely free community tier with substantial data.

### Additional Free Data Sources (Not Cloud-Platform Marketplaces)

| Source | URL | Description | Free? |
|---|---|---|---|
| Kaggle Datasets | kaggle.com/datasets | 200K+ community datasets, competitions | Yes |
| Hugging Face Datasets | huggingface.co/datasets | 100K+ datasets focused on ML/NLP | Yes |
| US Government (data.gov) | data.gov | 300K+ federal datasets | Yes |
| EU Open Data Portal | data.europa.eu | European Commission and EU agency data | Yes |
| World Bank Open Data | data.worldbank.org | 1,400+ development indicators, 200+ countries | Yes |
| UN Data | data.un.org | United Nations statistical databases | Yes |
| OECD Data | data.oecd.org | Economic and social statistics for 38 member countries | Yes |
| NASA Open Data | data.nasa.gov | Earth science, space science, engineering | Yes |
| CERN Open Data | opendata.cern.ch | Particle physics collision data | Yes |
| FiveThirtyEight | github.com/fivethirtyeight/data | Data behind FiveThirtyEight articles | Yes |

---

## Summary Comparison

| Platform | Total Datasets | Truly Free? | Access Method | Account Required? |
|---|---|---|---|---|
| **Google BigQuery** | ~213 | Yes (1 TB/mo free queries) | SQL | Google Cloud (free tier) |
| **AWS Open Data** | 650+ | Yes (pay for your compute) | S3, Athena, CLI | AWS (free tier available) |
| **Azure Open Datasets** | ~30 curated | Yes (egress may cost) | Python SDK, Spark, API | Optional (works without) |
| **Snowflake Marketplace** | 3,400+ listings (many free) | Many free listings | SQL | Snowflake account (free trial) |
| **Databricks Marketplace** | Growing | Some free | Delta Sharing | Databricks account |
| **Dewey Data** | 150+ providers | No (subscription) | Web, API | Paid subscription |
| **Datarade** | 2,600+ providers | Browse free; data paid | Varies | Free to browse |
| **data.world** | Thousands | Yes (community plan) | SQL, API, download | Free account |

---

## Key Takeaways

1. **Largest free catalog**: AWS Open Data Registry (650+ datasets) — strongest in scientific, geospatial, and genomics data.
2. **Best for SQL analysts**: Google BigQuery (~213 datasets) — query directly with SQL, generous free tier.
3. **Best curated/clean data**: Azure Open Datasets (~30) — small but ML-ready, well-documented.
4. **Best for business/economic data**: Snowflake Marketplace via Cybersyn Foundations — 60+ government data sources, analytics-ready.
5. **Best for geospatial**: Overture Maps available on both Snowflake and Databricks via CARTO.
6. **Best community platform**: data.world — free SQL-in-browser, community collaboration.

Sources:
- [BigQuery Public Datasets docs](https://docs.cloud.google.com/bigquery/public-data)
- [Google Cloud Marketplace — Datasets](https://console.cloud.google.com/marketplace/browse?filter=solution-type:dataset)
- [AWS Registry of Open Data](https://registry.opendata.aws)
- [AWS Open Data GitHub](https://github.com/awslabs/open-data-registry)
- [Azure Open Datasets Catalog](https://learn.microsoft.com/en-us/azure/open-datasets/dataset-catalog)
- [Snowflake Marketplace](https://app.snowflake.com/marketplace)
- [Cybersyn Foundations](https://www.cybersyn.com/product/foundations)
- [Databricks Marketplace](https://marketplace.databricks.com)
- [Dewey Data](https://www.deweydata.io)
- [Datarade](https://datarade.ai)
- [data.world](https://data.world)
