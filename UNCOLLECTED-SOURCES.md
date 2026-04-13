# Uncollected Data Sources — Future Work

Last updated: 2026-04-11

## International Government Portals (~90 countries)
- UK: data.gov.uk (CKAN — needs custom API handling, returned HTML not JSON)
- France: data.gouv.fr
- Canada: open.canada.ca (non-standard CKAN API)
- Australia: data.gov.au (non-standard API)
- EU: data.europa.eu (custom API)
- Germany: govdata.de
- Japan: data.go.jp
- South Korea: data.go.kr
- India: data.gov.in
- Brazil: dados.gov.br
- Mexico: datos.gob.mx
- All other countries listed in `results/international-gov-portals.md`
- Colombia's datos.gov.co is already collected (Socrata)

## US State Portals (29 non-Socrata states)
- California (CKAN — data.ca.gov)
- Indiana (CKAN — hub.mph.in.gov)
- Oklahoma (DKAN — data.ok.gov)
- North Carolina (OpenDataSoft — linc.osbm.nc.gov)
- Florida, Georgia, Kentucky, Mississippi (ArcGIS Hub primary)
- Alabama, Arkansas, Kansas, Louisiana, Maine, Minnesota, Nebraska, Nevada, North Dakota, Ohio, Rhode Island, South Carolina, South Dakota, Tennessee, Wyoming (custom portals)
- Arizona, New Hampshire, New Mexico, West Virginia, Wisconsin (no unified portal — fragmented)

## International Organizations
- IMF: data.imf.org — API exists but too slow/unreliable (timed out twice)
- OECD: data.oecd.org — uses SDMX format, needs custom parser
- UNICEF: data.unicef.org
- UNHCR: data.unhcr.org
- IAEA: iaea.org/resources/databases
- WTO: data.wto.org
- Asian Development Bank: data.adb.org
- African Development Bank: dataportal.opendataforafrica.org
- Inter-American Development Bank: data.iadb.org

## Research Repositories
- Zenodo (CERN): zenodo.org — millions of records, has REST API
- Dryad: datadryad.org
- Figshare: figshare.com — has API
- Harvard Dataverse: dataverse.harvard.edu — has API
- ICPSR: icpsr.umich.edu — 16K+ social science studies
- Papers with Code: paperswithcode.com/datasets
- PANGAEA: pangaea.de — 400K+ earth science datasets
- PhysioNet: physionet.org — clinical/physiological data
- OpenAIRE: explore.openaire.eu — European research data

## Biomedical Databases
- ClinicalTrials.gov — clinical trial registry, has API
- PubChem: pubchem.ncbi.nlm.nih.gov — chemical/bioassay data
- GenBank/NCBI: ncbi.nlm.nih.gov — genomic data
- DrugBank: drugbank.com — drug data (partial free)
- Protein Data Bank: rcsb.org
- MIMIC (PhysioNet): mimic.mit.edu — critical care data

## Legal & Regulatory
- CourtListener: courtlistener.com — US court opinions
- RECAP (Free Law Project): free.law — federal court filings
- Regulations.gov — US federal rulemaking, has API
- Federal Register: federalregister.gov — has API
- Congress.gov / ProPublica Congress API
- GDELT: gdeltproject.org — global events database (already in BigQuery)
- ACLED: acleddata.com — armed conflict data

## Geospatial / Maps
- OpenStreetMap planet dumps
- Overture Maps (already in BigQuery via overture_maps dataset)
- Natural Earth: naturalearthdata.com
- OpenTopography: opentopography.org — lidar/elevation
- Global Forest Watch: globalforestwatch.org
- Copernicus: copernicus.eu — EU earth observation

## Other
- Common Crawl: commoncrawl.org — web crawl corpus (already on AWS)
- Internet Archive: archive.org
- Stack Exchange Data Dump: archive.org/details/stackexchange
- Wikipedia Dumps: dumps.wikimedia.org
- npm registry: registry.npmjs.org
- PyPI: pypi.org

## WA-Specific Gaps
- WA special purpose districts (~1,700 — school, fire, port, PUD, transit)
- WA tribal governments (29)
- WA regional entities (PSRC, etc.)
- WA agency-specific APIs (WSDOT Traveler API, PDC SODA/OData, EIM database)
- 3 failed WA ArcGIS hubs (Tacoma, Everett, Burien — no DCAT feed)
- San Juan County ArcGIS (500 error)

## API Directories (meta-sources)
- ProgrammableWeb: 24K+ APIs
- RapidAPI Hub
- Public APIs GitHub repo (1,400+) — already in meta-catalog research
- APIs.guru — OpenAPI directory
