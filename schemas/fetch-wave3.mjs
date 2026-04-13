// Wave 3: CrossRef, ORCID, GeoNames, PubChem, ICPSR, Congress.gov,
// Regulations.gov, CourtListener, Internet Archive
import fs from 'fs';
const T = new Date().toISOString();

function rec(id, name, provider, portal, url, apiEndpoint, docUrl, domain, category, desc, tags, extra = {}) {
  return {
    id, name, provider, source_portal: portal, source_platform: 'api',
    url, api_endpoint: apiEndpoint, documentation_url: docUrl,
    access_method: 'api', format: ['json'], geographic_scope: extra.geo || 'global', geographic_detail: null,
    domain, category, update_frequency: extra.freq || 'daily',
    row_count: extra.count || null, column_count: null, columns: extra.cols || [],
    tags, description: desc,
    last_updated: null, created_at: null, collected_at: T,
  };
}

const records = [
  // CrossRef
  rec('crossref:works', 'CrossRef: Scholarly Works', 'CrossRef', 'api.crossref.org',
    'https://www.crossref.org/', 'https://api.crossref.org/works', 'https://api.crossref.org/swagger-ui/index.html',
    'education', 'scholarly_metadata', '181M+ scholarly works (journal articles, preprints, books, datasets) with DOIs, citations, abstracts, authors, funding info. Free API, polite pool with mailto.',
    ['crossref', 'doi', 'citations', 'scholarly'], { count: 181172324 }),
  rec('crossref:funders', 'CrossRef: Research Funders', 'CrossRef', 'api.crossref.org',
    'https://www.crossref.org/', 'https://api.crossref.org/funders', 'https://api.crossref.org/swagger-ui/index.html',
    'education', 'research_funding', 'Registry of research funding organizations linked to grants and publications.',
    ['crossref', 'funders', 'grants'], { count: 30000 }),
  rec('crossref:journals', 'CrossRef: Journals', 'CrossRef', 'api.crossref.org',
    'https://www.crossref.org/', 'https://api.crossref.org/journals', 'https://api.crossref.org/swagger-ui/index.html',
    'education', 'journals', 'Metadata for scholarly journals with ISSN, publisher, subject, article counts.',
    ['crossref', 'journals', 'issn'], { count: 120000 }),

  // ORCID
  rec('orcid:profiles', 'ORCID: Researcher Profiles', 'ORCID', 'orcid.org',
    'https://orcid.org/', 'https://pub.orcid.org/v3.0/search', 'https://info.orcid.org/documentation/api-tutorials/',
    'education', 'researcher_ids', '27M+ researcher profiles with publication lists, affiliations, grants, and persistent identifiers.',
    ['orcid', 'researchers', 'scholarly-identity'], { count: 27424259 }),

  // GeoNames
  rec('geonames:all', 'GeoNames: Global Gazetteer', 'GeoNames', 'geonames.org',
    'https://www.geonames.org/', 'https://api.geonames.org/', 'https://www.geonames.org/export/web-services.html',
    'demographics', 'gazetteer', '12M+ geographical names covering all countries. Includes coordinates, elevation, population, postal codes, timezone, administrative divisions. Free download or API with username.',
    ['geonames', 'geography', 'places', 'coordinates'], { count: 12000000 }),
  rec('geonames:postal', 'GeoNames: Postal Codes', 'GeoNames', 'geonames.org',
    'https://www.geonames.org/postal-codes/', 'https://download.geonames.org/export/zip/', 'https://www.geonames.org/export/',
    'demographics', 'postal_codes', 'Postal/ZIP code database for 100+ countries with coordinates.',
    ['geonames', 'postal-codes', 'zip-codes'], { count: 2000000 }),

  // PubChem
  rec('pubchem:compounds', 'PubChem: Chemical Compounds', 'NCBI / NLM / NIH', 'pubchem.ncbi.nlm.nih.gov',
    'https://pubchem.ncbi.nlm.nih.gov/', 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/', 'https://pubchemdocs.ncbi.nlm.nih.gov/pug-rest',
    'health', 'chemistry', '115M+ chemical compound records with structures, properties, bioactivity, patents, safety data. Free REST API (PUG REST).',
    ['pubchem', 'chemistry', 'compounds', 'molecules'], { count: 115000000 }),
  rec('pubchem:bioassays', 'PubChem: BioAssays', 'NCBI / NLM / NIH', 'pubchem.ncbi.nlm.nih.gov',
    'https://pubchem.ncbi.nlm.nih.gov/', 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/', 'https://pubchemdocs.ncbi.nlm.nih.gov/pug-rest',
    'health', 'bioassays', '1.5M+ biological assay results testing compounds against targets.',
    ['pubchem', 'bioassay', 'drug-screening'], { count: 1500000 }),
  rec('pubchem:substances', 'PubChem: Substances', 'NCBI / NLM / NIH', 'pubchem.ncbi.nlm.nih.gov',
    'https://pubchem.ncbi.nlm.nih.gov/', 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/', 'https://pubchemdocs.ncbi.nlm.nih.gov/pug-rest',
    'health', 'substances', '300M+ substance records from 900+ data sources.',
    ['pubchem', 'substances', 'chemical-data'], { count: 300000000 }),

  // NCBI / GenBank
  rec('ncbi:genbank', 'NCBI GenBank: Nucleotide Sequences', 'NCBI / NLM / NIH', 'ncbi.nlm.nih.gov',
    'https://www.ncbi.nlm.nih.gov/genbank/', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/', 'https://www.ncbi.nlm.nih.gov/books/NBK25501/',
    'health', 'genomics', '250M+ nucleotide sequence records from GenBank, EMBL, DDBJ. Free E-utilities API.',
    ['genbank', 'genomics', 'dna', 'sequences'], { count: 250000000 }),
  rec('ncbi:pubmed', 'NCBI PubMed: Biomedical Literature', 'NCBI / NLM / NIH', 'pubmed.ncbi.nlm.nih.gov',
    'https://pubmed.ncbi.nlm.nih.gov/', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/', 'https://www.ncbi.nlm.nih.gov/books/NBK25501/',
    'health', 'biomedical_literature', '37M+ biomedical literature citations and abstracts from MEDLINE and life science journals.',
    ['pubmed', 'biomedical', 'literature', 'citations'], { count: 37000000 }),
  rec('ncbi:protein', 'NCBI Protein Database', 'NCBI / NLM / NIH', 'ncbi.nlm.nih.gov',
    'https://www.ncbi.nlm.nih.gov/protein/', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/', 'https://www.ncbi.nlm.nih.gov/books/NBK25501/',
    'health', 'proteomics', '600M+ protein sequence records from GenPept, RefSeq, SwissProt, PDB, PIR.',
    ['protein', 'proteomics', 'amino-acid'], { count: 600000000 }),
  rec('ncbi:geo', 'NCBI GEO: Gene Expression Omnibus', 'NCBI / NLM / NIH', 'ncbi.nlm.nih.gov',
    'https://www.ncbi.nlm.nih.gov/geo/', 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/', 'https://www.ncbi.nlm.nih.gov/geo/info/geo2r.html',
    'health', 'gene_expression', 'Public gene expression and functional genomics data from microarray and sequencing experiments.',
    ['geo', 'gene-expression', 'microarray', 'rna-seq'], {}),

  // Congress.gov
  rec('congress:bills', 'Congress.gov: Bills & Resolutions', 'Library of Congress', 'api.congress.gov',
    'https://www.congress.gov/', 'https://api.congress.gov/v3/bill', 'https://api.congress.gov/',
    'legal', 'legislation', 'All bills and resolutions introduced in the US Congress. Full text, sponsors, cosponsors, committees, actions, amendments.',
    ['congress', 'legislation', 'bills'], { geo: 'us_national' }),
  rec('congress:members', 'Congress.gov: Members of Congress', 'Library of Congress', 'api.congress.gov',
    'https://www.congress.gov/', 'https://api.congress.gov/v3/member', 'https://api.congress.gov/',
    'legal', 'legislators', 'Current and historical members of the US Congress with biographical info, terms, committees.',
    ['congress', 'legislators', 'senate', 'house'], { geo: 'us_national' }),
  rec('congress:votes', 'Congress.gov: Roll Call Votes', 'Library of Congress', 'api.congress.gov',
    'https://www.congress.gov/', 'https://api.congress.gov/v3/vote', 'https://api.congress.gov/',
    'elections', 'congressional_votes', 'All roll call votes in the US Senate and House, with individual member votes.',
    ['congress', 'votes', 'roll-call'], { geo: 'us_national' }),

  // CourtListener / Free Law Project
  rec('courtlistener:opinions', 'CourtListener: Court Opinions', 'Free Law Project', 'courtlistener.com',
    'https://www.courtlistener.com/', 'https://www.courtlistener.com/api/rest/v3/opinions/', 'https://www.courtlistener.com/api/',
    'legal', 'court_opinions', '10M+ US court opinions from federal and state courts. Free API and bulk data.',
    ['courtlistener', 'courts', 'opinions', 'case-law'], { geo: 'us_national', count: 10000000 }),
  rec('courtlistener:dockets', 'CourtListener: Court Dockets', 'Free Law Project', 'courtlistener.com',
    'https://www.courtlistener.com/', 'https://www.courtlistener.com/api/rest/v3/dockets/', 'https://www.courtlistener.com/api/',
    'legal', 'court_dockets', 'Federal court dockets from PACER (RECAP project). Case filings, parties, judges.',
    ['courtlistener', 'pacer', 'recap', 'dockets'], { geo: 'us_national' }),

  // Internet Archive
  rec('archive:metadata', 'Internet Archive: Digital Collections', 'Internet Archive', 'archive.org',
    'https://archive.org/', 'https://archive.org/advancedsearch.php?output=json', 'https://archive.org/developers/',
    'technology', 'digital_archive', '800B+ web pages (Wayback Machine), 28M+ books, 14M+ audio recordings, 6M+ videos, 4M+ images. Free API.',
    ['internet-archive', 'web-archive', 'books', 'media'], { count: 800000000000 }),

  // GDELT (already in BigQuery but also has own API)
  rec('gdelt:events', 'GDELT: Global Events Database', 'GDELT Project', 'gdeltproject.org',
    'https://www.gdeltproject.org/', 'https://api.gdeltproject.org/api/v2/doc/doc', 'https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/',
    'public_safety', 'global_events', 'Real-time monitoring of world events from news media in 100+ languages. 500M+ event records since 1979.',
    ['gdelt', 'events', 'news', 'conflict', 'geopolitics'], { count: 500000000 }),

  // ACLED
  rec('acled:conflicts', 'ACLED: Armed Conflict & Protest Data', 'Armed Conflict Location & Event Data Project', 'acleddata.com',
    'https://acleddata.com/', 'https://api.acleddata.com/acled/read', 'https://apidocs.acleddata.com/',
    'public_safety', 'armed_conflict', 'Real-time data on political violence and protest events in all countries. Free with registration.',
    ['acled', 'conflict', 'violence', 'protest'], {}),

  // Wikidata
  rec('wikidata:entities', 'Wikidata: Knowledge Graph', 'Wikimedia Foundation', 'wikidata.org',
    'https://www.wikidata.org/', 'https://query.wikidata.org/sparql', 'https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service',
    'technology', 'knowledge_graph', '110M+ structured data items linking Wikipedia, scholarly databases, and external identifiers. Free SPARQL endpoint.',
    ['wikidata', 'knowledge-graph', 'sparql', 'linked-data'], { count: 110000000 }),

  // DBpedia
  rec('dbpedia:entities', 'DBpedia: Structured Wikipedia', 'DBpedia Association', 'dbpedia.org',
    'https://www.dbpedia.org/', 'https://dbpedia.org/sparql', 'https://www.dbpedia.org/resources/',
    'technology', 'knowledge_graph', 'Structured data extracted from Wikipedia. 400M+ RDF triples. Free SPARQL endpoint.',
    ['dbpedia', 'wikipedia', 'sparql', 'linked-data'], { count: 400000000 }),
];

fs.writeFileSync('D:/Projects/wa-data-catalog/schemas/wave3-scholarly-legal-bio.jsonl',
  records.map(r => JSON.stringify(r)).join('\n') + '\n');
console.log(`Wrote ${records.length} wave 3 records`);
