# Washington State Public Data Discovery — Research Plan

## Purpose

Identify **every** public dataset produced by any governmental entity in Washington state — state agencies, counties, cities, towns, special purpose districts, and regional bodies. False positives are acceptable; missed datasets are not.

This plan is designed to be executed across multiple agent sessions. Each section is a discrete research task. Results from each task should be appended to a master inventory file.

---

## Output Format

For every dataset discovered, record:

| Field | Description |
|---|---|
| entity_name | Government body that produces/owns the data |
| entity_type | state_agency / county / city / town / special_district / regional / tribal / federal_about_wa |
| dataset_name | Name of the dataset |
| url | Direct link to the dataset or portal page |
| format | CSV, API, GIS, PDF, database, etc. |
| portal | Which portal hosts it (data.wa.gov, ArcGIS Hub, custom, etc.) |
| access_method | download, API, Socrata, CKAN, ArcGIS REST, scrape, FOIA |
| description | Brief description of what the data contains |
| update_frequency | Real-time, daily, monthly, annual, one-time, unknown |
| discovery_method | Which search task found it |

---

## PHASE 1: Known Open Data Portals (Direct Crawl)

These portals have structured catalogs. Enumerate every dataset in each.

### Task 1.1 — State Portal (data.wa.gov)

- **URL**: https://data.wa.gov
- **Platform**: Socrata
- **Method**: Use the Socrata Discovery API to list all datasets
  - `https://api.us.socrata.com/api/catalog/v1?domains=data.wa.gov&limit=100&offset=0`
  - Page through all results (expect 1,000+ datasets)
- **Also check**: https://data.wa.gov/browse — filter by category, agency, type
- Record the "publishing department" for each dataset — this also helps enumerate which agencies publish data

### Task 1.2 — City Open Data Portals

Known Socrata/CKAN portals (enumerate all datasets in each):

| City | Portal URL | Platform |
|---|---|---|
| Seattle | data.seattle.gov | Socrata |
| Tacoma | data.cityoftacoma.org | Socrata |
| Spokane | my.spokanecity.org/opendata | Custom |
| Bellevue | bellevue.gov/open-data | Custom |
| Everett | everettwa.gov (search for open data) | Unknown |
| Olympia | olympiawa.gov | Unknown |
| Vancouver | cityofvancouver.us | Unknown |
| Kirkland | kirklandwa.gov | Unknown |
| Redmond | redmond.gov | Unknown |
| Renton | rentonwa.gov | Unknown |

**Search task**: For every city with population > 10,000 in WA, search `"{city name}" washington open data portal` and `site:{citywebsite} "open data" OR "data catalog" OR "public data"`. The full city list is in Task 3.2.

### Task 1.3 — County Open Data Portals

Known portals:

| County | Portal URL | Platform |
|---|---|---|
| King County | data.kingcounty.gov | Socrata |
| King County GIS | gismaps.kingcounty.gov/arcgis/rest/services | ArcGIS |
| Snohomish County | snohomishcountywa.gov/5702/Open-Data | Custom |
| Pierce County | piercecountywa.gov (search open data) | Unknown |
| Clark County | clark.wa.gov | Unknown |
| Thurston County | geodata.thurstoncountywa.gov | ArcGIS |
| Spokane County | spokanecounty.org | Unknown |
| Whatcom County | whatcomcounty.us | Unknown |
| Kitsap County | kitsapgov.com | Unknown |

**Search task**: For all 39 WA counties, search for open data portals and GIS portals. Full county list in Task 3.1.

### Task 1.4 — GIS / Geospatial Portals

These are major sources of spatial data:

- **WA Geospatial Open Data** (WAGDA): geo.wa.gov
- **WA DNR GIS**: wadnr.opendata.arcgis.com
- **WSDOT GIS**: wsdot.wa.gov/data/geodata
- **WA Department of Ecology GIS**: ecology.wa.gov/Research-Data/Data-resources/Geographic-Information-Systems-GIS
- **WA Department of Fish & Wildlife**: geodataservices.wdfw.wa.gov
- **ArcGIS Hub search**: hub.arcgis.com — search "Washington state" and enumerate all WA government org accounts
  - Also search: `https://hub.arcgis.com/search?q=washington%20state&type=Feature%20Layer`
- **King County iMAP**: kingcounty.gov/services/gis.aspx
- **Seattle GIS**: seattle.gov/gis

**Search task**: Search ArcGIS Hub for every WA government entity name. Many entities publish GIS data on ArcGIS Hub even when they don't have a standalone open data portal.

### Task 1.5 — Federal Portals (WA-specific data)

- **data.gov**: Filter by state=Washington, also search "Washington state"
  - `https://catalog.data.gov/dataset?q=washington+state&ext_location=Washington`
- **Census Bureau**: census.gov — American Community Survey, decennial census, economic census (WA geographies)
- **BLS**: bls.gov — employment, wages, CPI for WA MSAs
- **EPA**: Facility data, air/water quality for WA
- **USGS**: Water data, geological surveys for WA
- **NOAA**: Weather, climate data for WA stations
- **FEMA**: Flood maps, disaster declarations for WA
- **HUD**: Housing data for WA
- **DOT/NHTSA**: Crash data, traffic data for WA
- **FBI/DOJ**: Crime data (UCR) for WA agencies
- **CMS**: Medicare/Medicaid data for WA
- **USDA**: Agricultural data for WA counties
- **BEA**: GDP, income data for WA

---

## PHASE 2: State Agency Enumeration

Every WA state agency may produce data. Enumerate them all, then search each.

### Task 2.1 — Master Agency List

Build the complete list of WA state government entities from these sources:

1. **WA Office of Financial Management agency list**: ofm.wa.gov
2. **wa.gov agency directory**: https://www.wa.gov/agency/ (or similar directory page)
3. **WA State Legislature agency list** (budget documents list all agencies)
4. **Search**: `site:wa.gov "agency" OR "department" OR "commission" OR "board" directory`

**Known major agencies to definitely include** (each may have sub-agencies):

| Category | Agencies |
|---|---|
| Transportation | WSDOT, WA State Ferries, WA Traffic Safety Commission |
| Natural Resources | DNR, Dept of Ecology, Dept of Fish & Wildlife, Parks & Recreation, Conservation Commission |
| Health & Human Services | DOH, DSHS, HCA (Health Care Authority), Dept of Children Youth & Families |
| Education | OSPI, State Board of Education, Student Achievement Council, WA State Board for Community & Technical Colleges |
| Public Safety | WSP, Criminal Justice Training Commission, Dept of Corrections, Liquor & Cannabis Board |
| Labor & Economy | ESD (Employment Security), L&I (Labor & Industries), Dept of Commerce, Dept of Revenue |
| Government Operations | OFM, Secretary of State, Office of the Attorney General, State Auditor, State Treasurer |
| Environment & Agriculture | Dept of Agriculture, Puget Sound Partnership, Pollution Control Hearings Board |
| Regulatory | Utilities & Transportation Commission, Insurance Commissioner, Dept of Licensing, Gambling Commission |
| Other | Military Department, Dept of Veterans Affairs, Office of Minority & Women's Business Enterprises, Redistricting Commission |

### Task 2.2 — Search Each Agency for Data

For each agency identified in 2.1, execute these searches:

1. `site:{agency-domain} data OR dataset OR download OR "open data" OR statistics OR reports`
2. `site:{agency-domain} filetype:csv OR filetype:xlsx OR filetype:json OR filetype:xml OR filetype:geojson`
3. `site:{agency-domain} API OR "web service" OR "data feed"`
4. `site:{agency-domain} GIS OR "geographic" OR "geospatial" OR "map data"`
5. `site:{agency-domain} dashboard` (dashboards often have underlying datasets)
6. `site:{agency-domain} "public records" OR "public disclosure" OR "data request"`
7. Check if the agency has an ArcGIS Hub presence: `site:hub.arcgis.com "{agency name}"`
8. Check if the agency publishes to data.wa.gov (cross-reference with Task 1.1 results)

### Task 2.3 — Legislative and Judicial Data

Often missed:

- **WA State Legislature**: leg.wa.gov — bill data, voting records, session laws, fiscal notes
- **TVW (WA public affairs network)**: tvw.org — hearing recordings, metadata
- **WA Courts**: courts.wa.gov — case data, judicial statistics
- **Administrative Office of the Courts**: statistical reports
- **WA State Ethics Commission**: filings, disclosures
- **Public Disclosure Commission**: pdc.wa.gov — campaign finance, lobbyist data
- **Redistricting Commission**: redistricting.wa.gov — boundary data

---

## PHASE 3: Local Government Enumeration

### Task 3.1 — All 39 Counties

Complete list of WA counties:

Adams, Asotin, Benton, Chelan, Clallam, Clark, Columbia, Cowlitz, Douglas, Ferry, Franklin, Garfield, Grant, Grays Harbor, Island, Jefferson, King, Kitsap, Kittitas, Klickitat, Lewis, Lincoln, Mason, Okanogan, Pacific, Pend Oreille, Pierce, San Juan, Skagit, Skamania, Snohomish, Spokane, Stevens, Thurston, Wahkiakum, Walla Walla, Whatcom, Whitman, Yakima

For each county, search for:
1. Open data portal
2. GIS portal / ArcGIS presence
3. Assessor/property data (almost all counties publish this)
4. County budget/financial data
5. Sheriff/public safety data
6. Public health data (county health departments)
7. Elections data
8. Permit/land use data

**Search queries per county**:
- `"{county name} county" washington "open data" OR "data portal" OR "public data"`
- `"{county name} county" washington GIS OR "map data" OR arcgis`
- `site:{county-website} data OR download OR statistics`

### Task 3.2 — All Incorporated Cities and Towns

**Source the full list from**:
- Municipal Research and Services Center (MRSC): mrsc.org — maintains a directory of all WA cities/towns
- OFM population estimates include a full city/town list
- WA Association of Cities: awcnet.org

There are **281 incorporated cities and towns** in WA. For cities with population > 50,000, do a deep search (same as county searches above). For smaller cities, do a lighter search:
- `"{city name}" washington "open data" OR "data download"`
- Check if they have an ArcGIS Hub presence
- Check if any of their data appears on their county's portal

**Cities > 50,000 (deep search)**:
Seattle, Spokane, Tacoma, Vancouver, Bellevue, Kent, Everett, Renton, Federal Way, Spokane Valley, Kirkland, Bellingham, Auburn, Kennewick, Redmond, Marysville, Pasco, Lakewood, Sammamish, Olympia, Burien, Lacey, Edmonds, Richland, Shoreline, Bremerton

### Task 3.3 — Special Purpose Districts

WA has **~1,700** special purpose districts. These are a massive blind spot in most data inventories.

**Types of special purpose districts** (search for the governing association + member list for each type):

| District Type | Association / Directory | Approx Count |
|---|---|---|
| School districts | OSPI school district directory | ~295 |
| Fire districts | WA Fire Commissioners Association | ~300 |
| Water/sewer districts | WA Association of Sewer & Water Districts | ~200 |
| Port districts | WA Public Ports Association (wppa.org) | ~76 |
| Library districts | WA State Library | ~60 |
| Hospital districts | awphd.org | ~50+ |
| Park & recreation districts | varies | ~100 |
| Utility districts (PUDs) | wpuda.org | ~28 |
| Irrigation districts | varies | ~60 |
| Diking/drainage districts | varies | dozens |
| Transit authorities | varies | ~30 |
| Housing authorities | varies | ~35 |
| Conservation districts | wadistricts.org | ~45 |
| Mosquito control districts | varies | few |
| Cemetery districts | varies | dozens |

**Strategy**: Don't search every single one individually. Instead:
1. Get the **member/directory list** from each association
2. For the **largest districts by budget** in each category, search for data
3. Focus especially on **port districts** (major economic data), **PUDs** (energy data), **transit authorities** (ridership data), and **school districts** (OSPI aggregates most education data centrally)

### Task 3.4 — Tribal Governments

29 federally recognized tribes in WA. Some publish data publicly, especially related to:
- Natural resources management
- Gaming/casino economic data
- Health data (may be through Indian Health Service)
- Environmental monitoring

**Source**: Governor's Office of Indian Affairs (goia.wa.gov) for full list. Search each tribal government website for public data.

### Task 3.5 — Regional and Multi-Jurisdictional Entities

These often have excellent data and are frequently missed:

- **Puget Sound Regional Council (PSRC)**: psrc.org — transportation, land use, economic data
- **Southwest WA Regional Transportation Council**: rtc.wa.gov
- **Spokane Regional Transportation Council**: srtc.org
- **Puget Sound Clean Air Agency**: pscleanair.gov
- **Regional 911 / Emergency Management agencies**
- **Watershed planning units**
- **Metropolitan planning organizations (MPOs)**
- **Council of Governments (COGs)** — WA has several
- **Growth Management Hearings Boards**

---

## PHASE 4: Cross-Cutting Data Category Searches

Some data types exist across many entities. Search by data type to catch what entity-by-entity searches miss.

### Task 4.1 — Financial/Budget Data

- **WA State Auditor (SAO)**: sao.wa.gov — audits and financial statements for ALL local governments
- **WA Fiscal Information**: fiscal.wa.gov — state budget and expenditure data
- **Local Government Financial Reporting System**: operated by SAO, covers cities, counties, districts
- **CAFR/ACFR reports**: search `site:wa.gov "comprehensive annual financial report" OR "CAFR" OR "ACFR"`
- **WA State Treasurer**: tre.wa.gov — investment, debt, unclaimed property data
- **Municipal bond data**: EMMA (emma.msrb.org) filtered to WA issuers

### Task 4.2 — Elections Data

- **Secretary of State**: sos.wa.gov — voter registration, election results, campaign finance
- **Public Disclosure Commission**: pdc.wa.gov — contributions, expenditures, lobbying
- **County elections offices** (each county runs elections)
- **Redistricting data**: redistricting.wa.gov

### Task 4.3 — Property & Land Use Data

- **County assessor offices** (all 39 counties) — parcel data, valuations, ownership
- **County recorder/auditor offices** — deed transfers, liens
- **Dept of Revenue**: dor.wa.gov — property tax statistics
- **County planning departments** — zoning, permits, comprehensive plans
- **MRSC**: May aggregate some land use data

### Task 4.4 — Criminal Justice & Public Safety

- **WSP**: wsp.wa.gov — crime statistics, collision data, sex offender registry
- **WA Association of Sheriffs & Police Chiefs (WASPC)**: waspc.org — crime data
- **Dept of Corrections**: doc.wa.gov — incarceration data
- **County jails** — booking data (many counties publish jail rosters)
- **Municipal courts** — case data
- **911 dispatch / CAD data** — some jurisdictions publish call data

### Task 4.5 — Education Data

- **OSPI**: k12.wa.us — school report cards, enrollment, test scores, funding (comprehensive, covers all districts)
- **Education Research & Data Center (ERDC)**: erdc.wa.gov
- **State Board for Community & Technical Colleges**: sbctc.edu — enrollment, completion data for all 34 community/technical colleges
- **WA public universities**: UW, WSU, WWU, CWU, EWU, Evergreen — each publishes institutional data

### Task 4.6 — Health Data

- **DOH**: doh.wa.gov — vital statistics, disease surveillance, environmental health
- **HCA**: hca.wa.gov — Medicaid data, state employee health data
- **Local health jurisdictions** (35 in WA) — each may publish local health data
- **WA Tracking Network**: fortress.wa.gov/doh/wtn — environmental health indicators
- **Hospital discharge data**: DOH collects CHARS data

### Task 4.7 — Environmental & Natural Resources Data

- **Dept of Ecology**: ecology.wa.gov — air quality, water quality, toxic sites, permits
- **DNR**: dnr.wa.gov — forest data, geological data, aquatic lands
- **Fish & Wildlife**: wdfw.wa.gov — fish counts, hunting/wildlife data
- **Puget Sound Partnership**: pugetsoundinfo.wa.gov — Puget Sound vital signs
- **WA Conservation Commission**: scc.wa.gov

### Task 4.8 — Transportation Data

- **WSDOT**: wsdot.wa.gov — traffic counts, crash data, bridge data, travel times
- **WA State Ferries**: wsdot.wa.gov/ferries — ridership, schedule data
- **Sound Transit**: soundtransit.org — ridership data
- **King County Metro**: kingcounty.gov/metro — GTFS feeds, ridership
- **Other transit agencies**: Community Transit, Pierce Transit, Intercity Transit, etc. — most publish GTFS feeds
- **National Transit Database (NTD)**: transit.dot.gov — aggregated data for all WA transit agencies
- **Port data**: container volumes, tonnage, vessel calls (especially Port of Seattle, Port of Tacoma)

### Task 4.9 — Economic & Labor Data

- **ESD**: esd.wa.gov — employment data, unemployment claims, labor market info
- **Dept of Commerce**: commerce.wa.gov — economic development data
- **Dept of Revenue**: dor.wa.gov — tax collection data
- **OFM**: ofm.wa.gov — population estimates, forecasts, economic/revenue forecasts

### Task 4.10 — Infrastructure & Utilities Data

- **PUDs**: Power generation, rates, outage data
- **Dept of Commerce**: Energy data for WA
- **Utilities & Transportation Commission**: wutc.wa.gov — regulated utility data
- **WA State Broadband Office**: broadband data/maps
- **Water system data**: DOH maintains water system inventory

---

## PHASE 5: Discovery Techniques (Catch Everything Else)

### Task 5.1 — Google Dorking (Broad Sweeps)

Run these searches and collect every unique dataset URL:

```
site:wa.gov filetype:csv
site:wa.gov filetype:xlsx
site:wa.gov filetype:json
site:wa.gov filetype:xml
site:wa.gov filetype:geojson
site:wa.gov filetype:kml
site:wa.gov filetype:shp
site:wa.gov filetype:zip "data"
site:wa.gov "download data" OR "data download" OR "export" OR "bulk download"
site:wa.gov "API" "endpoint" OR "documentation"
site:wa.gov "public dataset" OR "open data" OR "data catalog"
site:wa.gov inurl:opendata OR inurl:open-data OR inurl:datasets
site:wa.gov "Socrata" OR "CKAN" OR "ArcGIS" OR "data portal"
```

Repeat the above with `site:*.wa.us` (some agencies use .wa.us instead of .wa.gov).

Also search for county/city domains:
```
site:kingcounty.gov filetype:csv
site:seattle.gov filetype:csv
site:spokanecounty.org filetype:csv
(... repeat for major jurisdictions)
```

### Task 5.2 — Socrata Discovery API (Multi-Domain)

Socrata powers many government open data portals. Use their discovery API to find ALL Socrata domains in WA:

```
https://api.us.socrata.com/api/catalog/v1?q=washington&limit=100&offset=0
```

Also directly check if these domains are Socrata-powered (hit `/api/catalog/v1` on each):
- Any .wa.gov subdomain
- Any county/city website

### Task 5.3 — ArcGIS Hub / ArcGIS Online

Search for WA government organizations on ArcGIS:
- `https://hub.arcgis.com/search?collection=Dataset&q=washington+state`
- Search for each agency, county, and major city name
- Look at organization pages — each org lists all their published layers

### Task 5.4 — CKAN Instances

Some WA entities might use CKAN. Search:
- `"washington" site:ckan.org`
- `"wa.gov" "CKAN"`
- Check data.wa.gov if it has a CKAN API endpoint

### Task 5.5 — GitHub / Code Repositories

Government agencies sometimes publish data or data tools on GitHub:
- Search GitHub: `org:washingtonstateorg` (various org names)
- `washington state government data site:github.com`
- `wa.gov site:github.com`

### Task 5.6 — Academic and Research Data Repositories

WA government data is sometimes hosted or mirrored by academic institutions:
- **UW Libraries data services**: lib.uw.edu
- **WSU data repositories**
- **ICPSR** (Inter-university Consortium for Political and Social Research): filtered to WA
- **Dataverse**: search for WA government data

### Task 5.7 — FOIA/Public Records Logs

Many agencies publish logs of public records requests, which reveal what datasets exist (even if not proactively published):
- Search each major agency for "public records request log" or "disclosure log"
- These logs often name specific databases and datasets maintained by the agency

### Task 5.8 — Budget Documents and IT Inventories

State budget documents and IT system inventories reveal internal databases:
- **OFM IT portfolio/inventory**: Lists state agency IT systems (each system likely produces data)
- **Agency strategic plans**: Often mention data systems
- **Legislative budget provisos**: Sometimes mandate data reporting
- Search: `site:ofm.wa.gov "information systems" OR "IT inventory" OR "data systems"`

### Task 5.9 — News and Press Releases

Government press releases often reference data:
- `site:wa.gov "released data" OR "new data" OR "data shows" OR "report released"`
- `"washington state" "open data" OR "data portal" OR "public data" site:govtech.com OR site:statescoop.com`

---

## PHASE 6: Validation and Gap-Filling

### Task 6.1 — Cross-Reference Against National Inventories

Compare your inventory against these national compilations:
- **Open Data Census**: Check WA entries
- **Data.gov**: Ensure every WA entry in data.gov is in your inventory
- **US City Open Data Census**: Check WA cities
- **Sunlight Foundation / Open Data Policy comparisons**
- **National Neighborhood Indicators Partnership (NNIP)**: nnip.org — check WA partner orgs

### Task 6.2 — Mandatory Reporting Cross-Reference

WA law requires certain data to be published. Search for:
- **RCW (Revised Code of Washington)** references to data reporting requirements: `site:leg.wa.gov "shall publish" OR "shall make available" OR "public data"`
- **Executive orders** related to open data
- **WA Open Data Executive Order** (if one exists — several states have them)

### Task 6.3 — Coverage Gap Analysis

After completing Phases 1-5, check for gaps:
1. Are there any counties with zero datasets? (Shouldn't be — at minimum they have assessor data)
2. Are there any state agencies with zero datasets? (Search harder)
3. Are there data categories with suspiciously low counts? (e.g., if you found health data from only 5 of 35 local health jurisdictions, search the other 30)
4. Compare your entity list against the complete OFM entity list
5. For any entity type where you found data from < 50% of entities, do targeted searches for the missing ones

### Task 6.4 — Known Unknowns Inventory

Create a separate list of:
- Agencies/entities you searched but found nothing (may need deeper investigation or FOIA)
- Data that you know exists but can't find a public URL for (e.g., "DOH maintains hospital discharge data but it may be restricted")
- Datasets behind paywalls or registration walls
- APIs you found but couldn't enumerate (may need API keys)

---

## Execution Notes

- **Parallelize**: Phases 1-4 can run in parallel. Phase 5 supplements. Phase 6 validates.
- **Dedup as you go**: Many datasets appear on multiple portals (e.g., a DOH dataset on both doh.wa.gov and data.wa.gov). Record both URLs but flag as same dataset.
- **Capture metadata even for restricted data**: If a dataset exists but requires registration or payment, still catalog it. The goal is to know it exists.
- **Timestamp everything**: Record when each dataset was discovered. URLs and availability change.
- **Store raw search results**: Keep the raw output of every search, not just the curated dataset list. This enables re-processing later.