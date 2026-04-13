# Research Summary — Initial Scoping Complete

**Date**: 2026-04-11
**Status**: Phase 1 scoping complete. Results ready for deeper enumeration.

---

## What We Found

### WA State Government Data

| Source | Result |
|---|---|
| **data.wa.gov (Socrata)** | ~1,600+ datasets from 25+ agencies. Largest categories: Education (OSPI), Health (DOH), Natural Resources (WDFW), Politics/Elections (PDC). Many are per-school lead testing results or per-year enrollment data. |
| **WA State Agencies** | 25 major agencies researched. Each has its own data portal beyond data.wa.gov. WSDOT, DNR, Ecology, WDFW, DOH, ESD, OFM all have substantial standalone data. Key finding: most agency data is NOT on data.wa.gov. |
| **WA Counties (39)** | 19 counties have ArcGIS Hub portals, 13 have basic GIS/downloads, 7 have minimal data. King County is most comprehensive (Socrata + ArcGIS). ArcGIS Hub is the dominant platform. |
| **WA Cities (26 major)** | 8 cities have full open data portals (Seattle, Tacoma, Bellevue, Auburn, Spokane, Marysville, Everett, Burien). 12 have GIS-only portals. 6 have minimal/no data. Seattle is most comprehensive. |
| **WA GIS Portal (geo.wa.gov)** | State geospatial portal on ArcGIS Hub. Parcels, EV charging, parks, boundaries, environment, transportation. |

**Total WA data sources identified**: ~100+ distinct portals/data pages across state agencies, counties, and cities.

### Global Public Data Infrastructure

| Source | Result |
|---|---|
| **National government portals** | 100+ countries have open data portals. Wikipedia alone lists portals for 80+ nations. |
| **US state portals** | All 50 states documented. 21 use Socrata, 4 use ArcGIS Hub, 2 use CKAN, 1 DKAN, 1 OpenDataSoft, 12 custom, 5 have no unified portal. New York leads (3,000+ datasets). |
| **US city portals** | 28+ major cities documented with portals. Socrata dominant (NYC, Chicago, LA, Seattle, etc.). ArcGIS Hub growing (DC, Portland, Boise). |
| **International city portals** | 16+ cities documented (Tokyo, Seoul, Amsterdam, Berlin, Buenos Aires, etc.). |
| **Meta-catalogs** | DataPortals.org (605), Open Data Inception (2,600+), re3data.org (3,000+ research repos). These are the master indices. |
| **Cloud warehouses** | BigQuery (~213 public datasets), AWS Open Data (650+), Azure (~30), Snowflake Marketplace (3,400+ listings, many free), Databricks (growing). |
| **Research platforms** | Kaggle (50K+), Hugging Face (500K+), Zenodo (millions), Harvard Dataverse (100K+), ICPSR (16K+). |
| **API directories** | Public APIs GitHub repo (1,400+), ProgrammableWeb (24K+), RapidAPI Hub (thousands). |
| **Supranational** | 21 international org portals (World Bank, UN, OECD, WHO, IMF, etc.). |

---

## Key Findings

### WA-Specific
1. **data.wa.gov has ~1,600 datasets but is incomplete** — major agencies (WSDOT, ESD, DOC) publish primarily on their own sites
2. **ArcGIS Hub dominates local government** — 19 of 39 counties + 16 cities use it. Zero use CKAN.
3. **King County + Seattle are the gold standard** — both Socrata (tabular) and ArcGIS Hub (geospatial)
4. **Special districts are the biggest gap** — ~1,700 exist, almost none searched yet
5. **Federal data about WA** not yet searched (Census, BLS, EPA, etc.)

### Global
1. **Socrata (Tyler Technologies) is the dominant US government platform** — 21 states + dozens of cities
2. **3 meta-catalogs cover most known portals** — DataPortals.org, Open Data Inception, re3data
3. **Cloud warehouses are the highest-value targets** — BigQuery, AWS, Snowflake have queryable data
4. **The long tail is enormous** — 2,600+ portals worldwide, most undocumented at the dataset level

---

## What's Left To Do

### WA State (from RESEARCH-PLAN.md)
- [ ] Complete agency search (agencies 15-25 in the list)
- [ ] Search all special purpose districts (~1,700 — school, fire, port, PUD, transit, etc.)
- [ ] Search tribal governments (29 in WA)
- [ ] Search regional entities (PSRC, etc.)
- [ ] Cross-cutting searches by data category (financial, elections, property, criminal justice, health, environment, transport, economic, infrastructure)
- [ ] Federal data about WA (Census, BLS, EPA, USGS, etc.)
- [ ] Google dorking (file type searches across .wa.gov)
- [ ] ArcGIS Hub enumeration for each WA entity
- [ ] FOIA/public records logs for dataset discovery
- [ ] Validation and gap analysis

### Global Portals (from RESEARCH-PLAN-PUBLIC-PORTALS.md)
- [ ] Fetch full Socrata domain list (API endpoint needs investigation)
- [ ] Enumerate all datasets in BigQuery, AWS, Snowflake
- [ ] Complete US state portal list (fill in missing dataset counts)
- [ ] Enumerate all CKAN instances worldwide
- [ ] Fetch Open Data Inception full dataset (2,600+ portals CSV)
- [ ] Fetch DataPortals.org full CSV (605 portals)
- [ ] Domain-specific portals (health, transport, energy, finance, legal, etc.)
- [ ] SPARQL endpoints / Linked Data sources
- [ ] Reddit/HN/forum discovery
- [ ] Validation of all portal URLs

---

## Files Produced

| File | Description |
|---|---|
| `RESEARCH-PLAN.md` | WA government data discovery plan (6 phases) |
| `RESEARCH-PLAN-PUBLIC-PORTALS.md` | Global portals/warehouses/APIs discovery plan (6 phases) |
| `results/wa-gov-socrata-catalog.md` | data.wa.gov complete catalog (~1,600 datasets, agencies, categories) |
| `results/wa-state-agencies.md` | 25 WA state agencies with data portals, APIs, GIS services |
| `results/wa-local-gov-portals.md` | All 39 counties + 26 major cities portal inventory |
| `results/us-state-portals.md` | All 50 US state open data portals (URL, platform, dataset count) |
| `results/international-gov-portals.md` | 100+ country government portals |
| `results/cloud-public-datasets.md` | BigQuery, AWS, Azure, Snowflake, Databricks public datasets |
| `results/global-portals-master-list.md` | Consolidated global portal inventory |
| `results/meta-catalog-portals.md` | Raw leads from DataPortals.org, Open Data Inception, etc. |
