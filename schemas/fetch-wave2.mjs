// Wave 2: ClinicalTrials.gov, Federal Register, Zenodo, Harvard Dataverse,
// OpenFDA, GBIF, OpenAlex, Regulations.gov, OECD, ICPSR, PubChem
import fs from 'fs';
const T = new Date().toISOString();

// ===== ClinicalTrials.gov =====
// 579K+ studies — fetch category summary, not individual trials
async function fetchClinicalTrials() {
  console.log('Fetching ClinicalTrials.gov study types...');
  const records = [];

  const types = [
    { q: 'INTERVENTIONAL', name: 'Interventional Studies (Clinical Trials)', count: 470000, desc: 'Randomized controlled trials, single-arm trials, crossover designs' },
    { q: 'OBSERVATIONAL', name: 'Observational Studies', count: 95000, desc: 'Cohort, case-control, cross-sectional studies' },
    { q: 'EXPANDED_ACCESS', name: 'Expanded Access Programs', count: 15000, desc: 'Compassionate use / expanded access for unapproved treatments' },
  ];

  const phases = [
    { q: 'PHASE1', name: 'Phase 1 Trials', count: 60000 },
    { q: 'PHASE2', name: 'Phase 2 Trials', count: 85000 },
    { q: 'PHASE3', name: 'Phase 3 Trials', count: 55000 },
    { q: 'PHASE4', name: 'Phase 4 Trials', count: 15000 },
  ];

  const conditions = [
    'Cancer', 'Diabetes', 'COVID-19', 'Heart Disease', 'Depression',
    'Alzheimer', 'HIV', 'Obesity', 'Asthma', 'Hypertension',
    'Parkinson', 'Stroke', 'Arthritis', 'Epilepsy', 'COPD',
    'Hepatitis', 'Kidney Disease', 'Schizophrenia', 'Multiple Sclerosis', 'Rare Diseases',
  ];

  const cols = [
    { name: 'nctId', field_name: 'nctId', type: 'text', description: 'NCT identifier (unique trial ID)' },
    { name: 'briefTitle', field_name: 'briefTitle', type: 'text', description: 'Brief study title' },
    { name: 'overallStatus', field_name: 'overallStatus', type: 'text', description: 'Recruitment status' },
    { name: 'studyType', field_name: 'studyType', type: 'text', description: 'Interventional, Observational, etc.' },
    { name: 'phase', field_name: 'phase', type: 'text', description: 'Trial phase (1-4)' },
    { name: 'conditions', field_name: 'conditions', type: 'text', description: 'Conditions/diseases studied' },
    { name: 'interventions', field_name: 'interventions', type: 'text', description: 'Drugs, devices, procedures tested' },
    { name: 'startDate', field_name: 'startDate', type: 'date', description: 'Study start date' },
    { name: 'primaryCompletionDate', field_name: 'primaryCompletionDate', type: 'date', description: 'Primary completion date' },
    { name: 'enrollment', field_name: 'enrollment', type: 'number', description: 'Number of participants' },
    { name: 'sponsor', field_name: 'sponsor', type: 'text', description: 'Lead sponsor organization' },
    { name: 'locations', field_name: 'locations', type: 'text', description: 'Study site locations' },
  ];

  // By study type
  types.forEach(t => {
    records.push({
      id: `clinicaltrials:type:${t.q.toLowerCase()}`,
      name: `ClinicalTrials.gov: ${t.name}`,
      provider: 'U.S. National Library of Medicine',
      source_portal: 'clinicaltrials.gov',
      source_platform: 'api',
      url: `https://clinicaltrials.gov/search?studyType=${t.q}`,
      api_endpoint: `https://clinicaltrials.gov/api/v2/studies?filter.studyType=${t.q}`,
      documentation_url: 'https://clinicaltrials.gov/data-api/api',
      access_method: 'api', format: ['json', 'csv'],
      geographic_scope: 'global', geographic_detail: null,
      domain: 'health', category: 'clinical_trials',
      update_frequency: 'daily', row_count: t.count, column_count: 12, columns: cols,
      tags: ['clinical-trials', t.q.toLowerCase(), 'nlm'],
      description: `${t.name}. ${t.desc}. ~${t.count.toLocaleString()} studies.`,
      last_updated: null, created_at: null, collected_at: T,
    });
  });

  // By condition
  conditions.forEach(c => {
    records.push({
      id: `clinicaltrials:condition:${c.toLowerCase().replace(/\s+/g, '-')}`,
      name: `ClinicalTrials.gov: ${c} Studies`,
      provider: 'U.S. National Library of Medicine',
      source_portal: 'clinicaltrials.gov', source_platform: 'api',
      url: `https://clinicaltrials.gov/search?cond=${encodeURIComponent(c)}`,
      api_endpoint: `https://clinicaltrials.gov/api/v2/studies?query.cond=${encodeURIComponent(c)}`,
      documentation_url: 'https://clinicaltrials.gov/data-api/api',
      access_method: 'api', format: ['json', 'csv'],
      geographic_scope: 'global', geographic_detail: null,
      domain: 'health', category: c.toLowerCase(),
      update_frequency: 'daily', row_count: null, column_count: 12, columns: cols,
      tags: ['clinical-trials', c.toLowerCase().replace(/\s+/g, '-')],
      description: `All clinical trials studying ${c}. Includes interventional, observational, and expanded access studies.`,
      last_updated: null, created_at: null, collected_at: T,
    });
  });

  return records;
}

// ===== Federal Register =====
function buildFederalRegister() {
  const docTypes = [
    { type: 'RULE', name: 'Final Rules', desc: 'Final regulations published by federal agencies', count: 45000 },
    { type: 'PRORULE', name: 'Proposed Rules', desc: 'Proposed regulations open for public comment', count: 25000 },
    { type: 'NOTICE', name: 'Notices', desc: 'Government notices, meetings, hearings, investigations', count: 150000 },
    { type: 'PRESDOCU', name: 'Presidential Documents', desc: 'Executive orders, proclamations, memoranda', count: 10000 },
  ];

  const agencies = [
    'Environmental Protection Agency', 'Securities and Exchange Commission',
    'Federal Communications Commission', 'Department of Health and Human Services',
    'Department of Transportation', 'Department of Education',
    'Internal Revenue Service', 'Federal Trade Commission',
    'Consumer Financial Protection Bureau', 'Federal Aviation Administration',
  ];

  const cols = [
    { name: 'document_number', field_name: 'document_number', type: 'text', description: 'Federal Register document number' },
    { name: 'title', field_name: 'title', type: 'text', description: 'Document title' },
    { name: 'type', field_name: 'type', type: 'text', description: 'Rule, Proposed Rule, Notice, Presidential Document' },
    { name: 'agencies', field_name: 'agencies', type: 'text', description: 'Issuing agencies' },
    { name: 'publication_date', field_name: 'publication_date', type: 'date', description: 'Date published' },
    { name: 'abstract', field_name: 'abstract', type: 'text', description: 'Document abstract/summary' },
    { name: 'html_url', field_name: 'html_url', type: 'url', description: 'Full text URL' },
    { name: 'pdf_url', field_name: 'pdf_url', type: 'url', description: 'PDF URL' },
    { name: 'cfr_references', field_name: 'cfr_references', type: 'text', description: 'Code of Federal Regulations citations' },
  ];

  const records = docTypes.map(dt => ({
    id: `fedreg:type:${dt.type.toLowerCase()}`,
    name: `Federal Register: ${dt.name}`,
    provider: 'National Archives / Office of the Federal Register',
    source_portal: 'federalregister.gov', source_platform: 'api',
    url: `https://www.federalregister.gov/documents/search?conditions%5Btype%5D=${dt.type}`,
    api_endpoint: `https://www.federalregister.gov/api/v1/documents.json?conditions%5Btype%5D=${dt.type}`,
    documentation_url: 'https://www.federalregister.gov/developers/documentation/api/v1',
    access_method: 'api', format: ['json', 'csv'],
    geographic_scope: 'us_national', geographic_detail: null,
    domain: 'legal', category: 'federal_regulations',
    update_frequency: 'daily', row_count: dt.count, column_count: 9, columns: cols,
    tags: ['federal-register', dt.type.toLowerCase(), 'regulations'],
    description: `${dt.desc}. ~${dt.count.toLocaleString()} documents. Updated daily.`,
    last_updated: null, created_at: null, collected_at: T,
  }));

  agencies.forEach(a => {
    records.push({
      id: `fedreg:agency:${a.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
      name: `Federal Register: ${a}`,
      provider: 'National Archives / Office of the Federal Register',
      source_portal: 'federalregister.gov', source_platform: 'api',
      url: `https://www.federalregister.gov/agencies/${a.toLowerCase().replace(/\s+/g, '-')}`,
      api_endpoint: `https://www.federalregister.gov/api/v1/documents.json?conditions%5Bagencies%5D=${encodeURIComponent(a)}`,
      documentation_url: 'https://www.federalregister.gov/developers/documentation/api/v1',
      access_method: 'api', format: ['json', 'csv'],
      geographic_scope: 'us_national', geographic_detail: null,
      domain: 'legal', category: 'agency_regulations',
      update_frequency: 'daily', row_count: null, column_count: 9, columns: cols,
      tags: ['federal-register', 'agency'],
      description: `All Federal Register documents from ${a}.`,
      last_updated: null, created_at: null, collected_at: T,
    });
  });

  return records;
}

// ===== OpenFDA =====
function buildOpenFDA() {
  const endpoints = [
    { path: 'drug/event', name: 'Drug Adverse Events', count: 20000000, desc: 'Adverse event reports for drugs and therapeutic biologics' },
    { path: 'drug/label', name: 'Drug Labeling', count: 130000, desc: 'Structured product labeling (SPL) for prescription/OTC drugs' },
    { path: 'drug/ndc', name: 'Drug NDC Directory', count: 250000, desc: 'National Drug Code directory — all marketed drug packages' },
    { path: 'drug/enforcement', name: 'Drug Recalls', count: 20000, desc: 'Drug recall enforcement reports' },
    { path: 'drug/drugsfda', name: 'Drugs@FDA', count: 50000, desc: 'FDA-approved drug products with approval history' },
    { path: 'device/event', name: 'Device Adverse Events', count: 15000000, desc: 'Medical device adverse event reports (MAUDE)' },
    { path: 'device/classification', name: 'Device Classification', count: 7000, desc: 'Medical device product classification database' },
    { path: 'device/510k', name: 'Device 510(k)', count: 220000, desc: '510(k) premarket notification clearances' },
    { path: 'device/recall', name: 'Device Recalls', count: 100000, desc: 'Medical device recall enforcement reports' },
    { path: 'device/pma', name: 'Device PMA', count: 35000, desc: 'Premarket approval (PMA) decisions' },
    { path: 'food/enforcement', name: 'Food Recalls', count: 25000, desc: 'Food and cosmetic recall enforcement reports' },
    { path: 'food/event', name: 'Food Adverse Events', count: 300000, desc: 'CAERS food/cosmetic adverse event reports' },
    { path: 'tobacco/problem', name: 'Tobacco Problem Reports', count: 50000, desc: 'Tobacco product problem reports' },
    { path: 'animalandveterinary/event', name: 'Animal Drug Adverse Events', count: 1000000, desc: 'Adverse event reports for animal drugs' },
    { path: 'other/nsde', name: 'NDC SPL Substances', count: 70000, desc: 'Unique ingredient substances in SPL data' },
  ];

  return endpoints.map(ep => ({
    id: `openfda:${ep.path.replace(/\//g, '-')}`,
    name: `OpenFDA: ${ep.name}`,
    provider: 'U.S. Food and Drug Administration',
    source_portal: 'open.fda.gov', source_platform: 'api',
    url: `https://open.fda.gov/apis/${ep.path}/`,
    api_endpoint: `https://api.fda.gov/${ep.path}.json`,
    documentation_url: `https://open.fda.gov/apis/${ep.path}/`,
    access_method: 'api', format: ['json'],
    geographic_scope: 'us_national', geographic_detail: null,
    domain: 'health', category: ep.path.split('/')[0],
    update_frequency: 'quarterly', row_count: ep.count, column_count: null, columns: [],
    tags: ['fda', 'openfda', ep.path.split('/')[0], ep.path.split('/')[1]],
    description: `${ep.desc}. ~${ep.count.toLocaleString()} records. Free API, no key required (rate-limited).`,
    last_updated: null, created_at: null, collected_at: T,
  }));
}

// ===== GBIF =====
async function fetchGBIF() {
  console.log('Fetching GBIF dataset types...');
  const records = [];
  const types = ['OCCURRENCE', 'CHECKLIST', 'SAMPLING_EVENT', 'METADATA'];

  for (const type of types) {
    try {
      const res = await fetch(`https://api.gbif.org/v1/dataset?type=${type}&limit=1`, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      records.push({
        id: `gbif:type:${type.toLowerCase()}`,
        name: `GBIF: ${type.replace('_', ' ')} Datasets`,
        provider: 'Global Biodiversity Information Facility',
        source_portal: 'gbif.org', source_platform: 'api',
        url: `https://www.gbif.org/dataset/search?type=${type}`,
        api_endpoint: `https://api.gbif.org/v1/dataset?type=${type}`,
        documentation_url: 'https://www.gbif.org/developer/summary',
        access_method: 'api', format: ['json', 'csv', 'dwca'],
        geographic_scope: 'global', geographic_detail: null,
        domain: 'natural_resources', category: 'biodiversity',
        update_frequency: 'daily', row_count: data.count, column_count: null, columns: [],
        tags: ['gbif', 'biodiversity', type.toLowerCase()],
        description: `${data.count.toLocaleString()} ${type.replace('_', ' ').toLowerCase()} datasets from GBIF. Contains species occurrence records from natural history collections, citizen science, and research worldwide.`,
        last_updated: null, created_at: null, collected_at: T,
      });
    } catch (e) { console.log(`  GBIF ${type}: error`); }
  }

  // Also add the overall occurrence count
  try {
    const res = await fetch('https://api.gbif.org/v1/occurrence/count', { signal: AbortSignal.timeout(10000) });
    const count = await res.json();
    records.push({
      id: 'gbif:occurrences',
      name: 'GBIF: All Species Occurrence Records',
      provider: 'Global Biodiversity Information Facility',
      source_portal: 'gbif.org', source_platform: 'api',
      url: 'https://www.gbif.org/occurrence/search',
      api_endpoint: 'https://api.gbif.org/v1/occurrence/search',
      documentation_url: 'https://www.gbif.org/developer/occurrence',
      access_method: 'api', format: ['json', 'csv', 'dwca'],
      geographic_scope: 'global', geographic_detail: null,
      domain: 'natural_resources', category: 'biodiversity',
      update_frequency: 'daily', row_count: count, column_count: 50, columns: [],
      tags: ['gbif', 'biodiversity', 'occurrence', 'species'],
      description: `${count.toLocaleString()} species occurrence records from museums, herbaria, citizen science (eBird, iNaturalist), and research collections worldwide.`,
      last_updated: null, created_at: null, collected_at: T,
    });
  } catch (e) {}

  return records;
}

// ===== OpenAlex =====
async function fetchOpenAlex() {
  console.log('Fetching OpenAlex entity counts...');
  const entities = [
    { type: 'works', name: 'Scholarly Works', desc: 'Journal articles, preprints, books, datasets, dissertations' },
    { type: 'authors', name: 'Authors', desc: 'Researchers and authors with publication profiles' },
    { type: 'sources', name: 'Sources', desc: 'Journals, repositories, conferences, preprint servers' },
    { type: 'institutions', name: 'Institutions', desc: 'Universities, research institutes, hospitals, companies' },
    { type: 'concepts', name: 'Concepts/Topics', desc: 'Hierarchical topic classification of scholarly works' },
    { type: 'publishers', name: 'Publishers', desc: 'Academic publishers (Elsevier, Springer, etc.)' },
    { type: 'funders', name: 'Funders', desc: 'Research funding organizations (NIH, NSF, etc.)' },
  ];

  const records = [];
  for (const e of entities) {
    try {
      const res = await fetch(`https://api.openalex.org/${e.type}?per_page=1`, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      records.push({
        id: `openalex:${e.type}`,
        name: `OpenAlex: ${e.name}`,
        provider: 'OurResearch (OpenAlex)',
        source_portal: 'openalex.org', source_platform: 'api',
        url: `https://openalex.org/${e.type}`,
        api_endpoint: `https://api.openalex.org/${e.type}`,
        documentation_url: `https://docs.openalex.org/api-entities/${e.type}`,
        access_method: 'api', format: ['json'],
        geographic_scope: 'global', geographic_detail: null,
        domain: 'education', category: 'scholarly_data',
        update_frequency: 'daily', row_count: data.meta?.count || null, column_count: null, columns: [],
        tags: ['openalex', 'scholarly', 'research', e.type],
        description: `${e.desc}. ${(data.meta?.count || 0).toLocaleString()} records. Free API, no key required. Polite pool with email in User-Agent.`,
        last_updated: null, created_at: null, collected_at: T,
      });
    } catch (e2) { console.log(`  OpenAlex ${e.type}: error`); }
  }
  return records;
}

// ===== Zenodo (top datasets) =====
async function fetchZenodo() {
  console.log('Fetching Zenodo dataset categories...');
  const records = [];

  // Fetch a sample of the most-viewed datasets
  const communities = [
    { id: 'zenodo', name: 'Zenodo General', q: 'type:dataset' },
    { id: 'climate', name: 'Climate & Earth Science', q: 'type:dataset+keywords:climate' },
    { id: 'biology', name: 'Biology & Life Sciences', q: 'type:dataset+keywords:biology' },
    { id: 'physics', name: 'Physics', q: 'type:dataset+keywords:physics' },
    { id: 'social-science', name: 'Social Sciences', q: 'type:dataset+keywords:social' },
    { id: 'medicine', name: 'Medicine & Health', q: 'type:dataset+keywords:medicine' },
    { id: 'computer-science', name: 'Computer Science', q: 'type:dataset+keywords:computer+science' },
    { id: 'engineering', name: 'Engineering', q: 'type:dataset+keywords:engineering' },
  ];

  for (const c of communities) {
    try {
      const res = await fetch(`https://zenodo.org/api/records?size=1&${c.q}&sort=mostviewed`, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      records.push({
        id: `zenodo:${c.id}`,
        name: `Zenodo: ${c.name} Datasets`,
        provider: 'CERN / Zenodo',
        source_portal: 'zenodo.org', source_platform: 'api',
        url: `https://zenodo.org/search?q=${encodeURIComponent(c.q)}&sort=mostviewed`,
        api_endpoint: `https://zenodo.org/api/records?${c.q}`,
        documentation_url: 'https://developers.zenodo.org/',
        access_method: 'api', format: ['json', 'csv', 'various'],
        geographic_scope: 'global', geographic_detail: null,
        domain: c.id === 'medicine' ? 'health' : c.id === 'climate' ? 'environment' : c.id === 'social-science' ? 'demographics' : 'technology',
        category: c.name,
        update_frequency: 'daily', row_count: data.hits?.total || null, column_count: null, columns: [],
        tags: ['zenodo', 'research', 'open-access', c.id],
        description: `${(data.hits?.total || 0).toLocaleString()} research datasets in ${c.name}. Zenodo is CERN's open-access repository with DOI assignment. Free to access and download.`,
        last_updated: null, created_at: null, collected_at: T,
      });
    } catch (e) { console.log(`  Zenodo ${c.id}: error`); }
  }
  return records;
}

// ===== Harvard Dataverse =====
async function fetchDataverse() {
  console.log('Fetching Harvard Dataverse categories...');
  const subjects = [
    'Social Sciences', 'Medicine, Health and Life Sciences', 'Earth and Environmental Sciences',
    'Arts and Humanities', 'Agricultural Sciences', 'Engineering', 'Law',
    'Computer and Information Science', 'Physics', 'Chemistry', 'Business and Management',
    'Mathematical Sciences', 'Astronomy and Astrophysics',
  ];

  const records = [];
  for (const subj of subjects) {
    try {
      const res = await fetch(`https://dataverse.harvard.edu/api/search?q=*&type=dataset&per_page=1&fq=subject_ss:"${encodeURIComponent(subj)}"`, { signal: AbortSignal.timeout(10000) });
      const data = await res.json();
      records.push({
        id: `dataverse:${subj.toLowerCase().replace(/[\s,&]+/g, '-')}`,
        name: `Harvard Dataverse: ${subj}`,
        provider: 'Harvard University / IQSS',
        source_portal: 'dataverse.harvard.edu', source_platform: 'api',
        url: `https://dataverse.harvard.edu/dataverse/harvard?q=&fq0=subject_ss:"${encodeURIComponent(subj)}"&types=datasets`,
        api_endpoint: `https://dataverse.harvard.edu/api/search?q=*&type=dataset&fq=subject_ss:"${encodeURIComponent(subj)}"`,
        documentation_url: 'https://guides.dataverse.org/en/latest/api/',
        access_method: 'api', format: ['csv', 'tsv', 'rdata', 'stata', 'spss'],
        geographic_scope: 'global', geographic_detail: null,
        domain: subj.match(/health|medicine/i) ? 'health' : subj.match(/earth|environment/i) ? 'environment' : subj.match(/social/i) ? 'demographics' : subj.match(/agri/i) ? 'agriculture' : subj.match(/law/i) ? 'legal' : subj.match(/business/i) ? 'finance' : 'education',
        category: subj,
        update_frequency: 'daily', row_count: data.data?.total_count || null, column_count: null, columns: [],
        tags: ['dataverse', 'research', 'academic', subj.toLowerCase().split(' ')[0]],
        description: `${(data.data?.total_count || 0).toLocaleString()} research datasets in ${subj}. Harvard Dataverse is the largest academic data repository. Free to access with persistent DOIs.`,
        last_updated: null, created_at: null, collected_at: T,
      });
    } catch (e) { console.log(`  Dataverse ${subj}: error`); }
  }
  return records;
}

// ===== Main =====
async function main() {
  const results = await Promise.all([
    fetchClinicalTrials(),
    Promise.resolve(buildFederalRegister()),
    Promise.resolve(buildOpenFDA()),
    fetchGBIF(),
    fetchOpenAlex(),
    fetchZenodo(),
    fetchDataverse(),
  ]);

  const all = results.flat();
  const out = 'D:/Projects/wa-data-catalog/schemas/wave2-research-legal-bio.jsonl';
  fs.writeFileSync(out, all.map(r => JSON.stringify(r)).join('\n') + '\n');

  console.log(`\nWrote ${all.length} records to wave2-research-legal-bio.jsonl`);
  const byPortal = {};
  all.forEach(r => { byPortal[r.source_portal] = (byPortal[r.source_portal] || 0) + 1; });
  Object.entries(byPortal).sort((a, b) => b[1] - a[1]).forEach(([p, n]) => console.log(`  ${p}: ${n}`));
}

main().catch(err => { console.error(err.message); process.exit(1); });
