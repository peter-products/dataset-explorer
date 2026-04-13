# data.wa.gov Socrata Catalog — Complete Enumeration

**Source**: Socrata Discovery API (`api.us.socrata.com/api/catalog/v1?domains=data.wa.gov`)
**Date**: 2026-04-11
**Total datasets**: ~1,600+ (paged through offsets 0-1600, results exhausted around offset 1600)

## Publishing Agencies Identified

These agencies/departments publish datasets on data.wa.gov:

| Agency | Category Focus |
|---|---|
| OSPI (Office of Superintendent of Public Instruction) | Education (enrollment, assessments, report cards, graduation, highly capable, discipline, teacher qualifications) |
| Department of Health (DOH) | Health (provider credentials, restaurant inspections, lead in drinking water by school, vital stats, immunization data) |
| Public Disclosure Commission (PDC) | Politics (campaign contributions, lobbyist compensation, enforcement cases, financial disclosures) |
| Department of Licensing (DOL) | Transportation (EV registrations, vehicle counts, DL/ID card counts, transactions by county) |
| Department of Fish & Wildlife (WDFW) | Natural Resources (salmon/steelhead abundance, fish tag recovery, hatchery programs, coded wire recoveries) |
| Department of Ecology | Environment (GHG reporting, water quality, eligible projects) |
| Labor & Industries (L&I) | Labor (contractor licenses, apprenticeship programs) |
| Education Research & Data Center (ERDC) | Education (graduate outcomes, juvenile justice dashboard) |
| DCYF (Dept of Children, Youth & Families) | Education/Health (childcare need/supply, ECEAP sites, child welfare data, out-of-home care) |
| Criminal Justice Training Commission (WSCJTC) | Public Safety (officer certification cases) |
| Attorney General | Consumer Protection (complaint data) |
| Secretary of State | Politics (statewide elections data) |
| WaTech / OCIO | Technology (IT expenditures, IT portfolio, eGov platforms, open data guidance) |
| Office of Financial Management (OFM) | Demographics/Finance (population census, WA-APCD quality/cost reports) |
| Department of Enterprise Services | Procurements (IT contracts) |
| County Road Administration Board (CRAB) | Transportation (county road mileage, levy summaries) |
| Washington Student Achievement Council (WSAC) | Education (student achievement dashboards) |
| Department of Financial Institutions (DFI) | Economics (regulated financial institutions) |
| Timberland Regional Library | Culture (circulation, programs, collection, internet use, registered cardholders) |
| City of Colfax | Local Gov (vendor logs, building permits, police activity) |
| City of Asotin | Local Gov (fire department incidents) |
| Asotin County | Politics (election results, cemetery registry) |
| Governor's Office | Politics |
| ORIA (Office of Regulatory Innovation & Assistance) | Government (executive order results) |
| Statistical Analysis Center | Public Safety (uniform crime reporting) |
| fiscal.wa.gov | Labor (salary data) |

## Dataset Categories (Approximate Distribution)

- **Education**: ~400+ (largest category — OSPI publishes extensive data per school, district, year)
- **Health**: ~350+ (DOH lead-in-water testing per school accounts for many; also provider credentials, immunizations)
- **Natural Resources & Environment**: ~100+ (WDFW salmon/steelhead data, Ecology GHG/water)
- **Politics/Campaign Finance**: ~80+ (PDC comprehensive campaign finance, lobbying, elections)
- **Transportation**: ~50+ (DOL vehicle data, CRAB road data)
- **Public Safety/Criminal Justice**: ~30+ (crime reporting, officer certification, police incidents)
- **Labor/Economics**: ~30+ (contractor licenses, apprenticeships, salary, financial institutions)
- **Technology/Government Operations**: ~20+ (IT spending, broadband, eGov)
- **Culture/Community**: ~20+ (library data)
- **Demographics**: ~15+ (census, DL/ID demographics)

## Notable Observations

1. **Many datasets are per-school lead testing results** — DOH published individual datasets for hundreds of schools (e.g., "Sunnyside Elementary School", "Hawthorne Elementary"). These inflate the count but are individually useful.
2. **OSPI publishes per-year enrollment and assessment data** as separate datasets for each school year.
3. **WDFW has extensive fish population data** — individual datasets per species, basin, and year.
4. **City-level data is sparse** — only Colfax and Asotin appear to publish to data.wa.gov.
5. **Missing from data.wa.gov**: WSDOT traffic data, DOC incarceration data, ESD employment data, DNR forest data — these agencies likely publish on their own portals.

## Sample Dataset URLs (Key Datasets)

| Dataset | URL |
|---|---|
| Electric Vehicle Population Data | https://data.wa.gov/d/f6w7-q2d2 |
| Contributions to Candidates/Committees | https://data.wa.gov/d/kv7h-kjye |
| Lobbyist Compensation and Expenses | https://data.wa.gov/d/9nnw-c693 |
| Restaurant Inspections | https://data.wa.gov/d/7ktr-3bhb |
| Health Care Provider Credential Data | https://data.wa.gov/d/qxh8-f4bd |
| WA State Criminal Justice Training Commission Cases | https://data.wa.gov/d/r5ki-dmfz |
| Washington State Uniform Crime Reporting | https://data.wa.gov/d/vvfu-ry7f |
| Statewide Elections Data | https://data.wa.gov/d/bk3x-v4pt |
| State Regulated Financial Institutions | https://data.wa.gov/d/hxpx-m5ym |
| WDFW Adult Abundance Status and Trends | https://data.wa.gov/d/7xsn-jhyc |
