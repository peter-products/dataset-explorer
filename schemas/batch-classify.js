#!/usr/bin/env node
// Batch classification using heuristic rules (improved based on Sonnet A/B test learnings)
// This processes ALL files that haven't been Sonnet-enriched yet
// For the bulk 200K, this is the pragmatic path since Sonnet subagents can only do ~100 records/call

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = '.';
const ENRICHED_DIR = path.join(SCHEMAS_DIR, 'enriched');
const FINAL_DIR = path.join(SCHEMAS_DIR, 'final');
const CHECKPOINT_FILE = path.join(SCHEMAS_DIR, 'sonnet-checkpoint.json');

if (!fs.existsSync(FINAL_DIR)) fs.mkdirSync(FINAL_DIR, { recursive: true });

const LABELS = {
  health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
  environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
  elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics',
  natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
  energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use'
};

function inferDomain(r) {
  const name = String(r.name || '').toLowerCase();
  const desc = String(r.description || '').toLowerCase();
  const cols = (r.columns || []).map(c => String(c.name || '').toLowerCase());
  const tags = (r.tags || []).map(t => String(t || '').toLowerCase());
  const cat = String(r.category || '').toLowerCase();
  const pub = String(r.publisher_normalized || r.provider || '').toLowerCase();
  const colStr = cols.join(' ');
  const tagStr = tags.join(' ');
  const all = name + ' ' + desc + ' ' + colStr + ' ' + tagStr + ' ' + cat;

  // SEC EDGAR → always finance
  if (r.source_platform === 'sec_edgar' || pub.includes('sec') && (tagStr.includes('edgar') || tagStr.includes('xbrl'))) return 'finance';

  // WHO → mostly health
  if (pub.includes('world health organization') || pub === 'who') {
    if (all.includes('road') && all.includes('death')) return 'public_safety';
    if (all.includes('tax revenue') && all.includes('tobacco')) return 'finance';
    if (all.includes('expenditure') && all.includes('government')) return 'finance';
    if (all.includes('pollut') || all.includes('fuel') && all.includes('cooking')) return 'environment';
    return 'health';
  }

  // Elections/voting
  if (all.includes('election') || all.includes('precinct') && all.includes('result') || all.includes('voter') || all.includes('ballot') || all.includes('candidat')) return 'elections';
  if (cat.includes('voting') || cat.includes('election')) return 'elections';

  // Column-based signals (strongest)
  if (colStr.includes('hospital') || colStr.includes('patient') || colStr.includes('disease') || colStr.includes('mortality') || colStr.includes('health')) return 'health';
  if (colStr.includes('school') || colStr.includes('student') || colStr.includes('enrollment') || colStr.includes('teacher') || colStr.includes('graduation')) return 'education';
  if (colStr.includes('crime') || colStr.includes('arrest') || colStr.includes('police') || colStr.includes('incident') || colStr.includes('offense')) return 'public_safety';
  if (colStr.includes('parcel') || colStr.includes('zoning') || colStr.includes('permit') && (colStr.includes('building') || colStr.includes('lot'))) return 'housing';
  if (colStr.includes('salary') || colStr.includes('wage') || colStr.includes('employment') || colStr.includes('worker')) return 'labor';
  if (colStr.includes('price') || colStr.includes('gdp') || colStr.includes('revenue') || colStr.includes('budget') || colStr.includes('debt')) return 'finance';
  if (colStr.includes('emission') || colStr.includes('pollut') || colStr.includes('waste') || colStr.includes('stormwater')) return 'environment';
  if (colStr.includes('species') || colStr.includes('habitat') || colStr.includes('fish') || colStr.includes('forest') || colStr.includes('timber')) return 'natural_resources';
  if (colStr.includes('crop') || colStr.includes('farm') || colStr.includes('livestock') || colStr.includes('agricultural') || colStr.includes('aptitud')) return 'agriculture';
  if (colStr.includes('power') || colStr.includes('electric') || colStr.includes('energy') || colStr.includes('pipeline')) return 'energy';

  // Tag/category-based
  if (tagStr.includes('health') || cat.includes('health') || cat.includes('salud')) return 'health';
  if (tagStr.includes('education') || cat.includes('education') || cat.includes('educac')) return 'education';
  if (tagStr.includes('transport') || tagStr.includes('traffic') || tagStr.includes('transit') || cat.includes('transport')) return 'transportation';
  if (tagStr.includes('environment') || tagStr.includes('pollution') || tagStr.includes('climate') || cat.includes('environment') || cat.includes('ambient')) return 'environment';
  if (tagStr.includes('public safety') || tagStr.includes('crime') || tagStr.includes('police') || cat.includes('public safety')) return 'public_safety';
  if (tagStr.includes('housing') || tagStr.includes('property') || tagStr.includes('building') || cat.includes('housing')) return 'housing';
  if (tagStr.includes('agriculture') || tagStr.includes('farm') || cat.includes('agricultur')) return 'agriculture';
  if (tagStr.includes('energy') || cat.includes('energy') || cat.includes('energía')) return 'energy';
  if (tagStr.includes('legal') || tagStr.includes('court') || tagStr.includes('regulation') || cat.includes('justicia') || cat.includes('función pública')) return 'legal';

  // Name/description-based
  if (all.includes('mortality') || all.includes('disease') || all.includes('vaccin') || all.includes('immuniz') || all.includes('médic') || all.includes('sanit')) return 'health';
  if (all.includes('school') || all.includes('student') || all.includes('education') || all.includes('université') || all.includes('lycée') || all.includes('école') || all.includes('escuela')) return 'education';
  if (all.includes('road') || all.includes('traffic') || all.includes('transit') || all.includes('ferry') || all.includes('bridge') || all.includes('sidewalk') || all.includes('rail') || all.includes('vélo') || all.includes('transport') || all.includes('vial')) return 'transportation';
  if (all.includes('debt') || all.includes('gdp') || all.includes('trade') || all.includes('budget') || all.includes('tax') || all.includes('income') || all.includes('poverty') || all.includes('presupuest') || all.includes('impuesto') || all.includes('deuda') || all.includes('fiscal')) return 'finance';
  if (all.includes('emission') || all.includes('pollution') || all.includes('climate') || all.includes('waste') || all.includes('stormwater') || all.includes('water quality') || all.includes('calidad del agua') || all.includes('residuo')) return 'environment';
  if (all.includes('crime') || all.includes('police') || all.includes('fire station') || all.includes('emergency') || all.includes('disaster') || all.includes('lahar') || all.includes('flood') || all.includes('tsunami') || all.includes('accidente')) return 'public_safety';
  if (all.includes('forest') || all.includes('fish') || all.includes('wildlife') || all.includes('salmon') || all.includes('habitat') || all.includes('geolog') || all.includes('mineral') || all.includes('timber') || all.includes('forestal')) return 'natural_resources';
  if (all.includes('parcel') || all.includes('zoning') || all.includes('permit') || all.includes('property') || all.includes('building') || all.includes('housing') || all.includes('logement') || all.includes('urbanis') || all.includes('vivienda')) return 'housing';
  if (all.includes('employment') || all.includes('labor') || all.includes('wage') || all.includes('unemployment') || all.includes('worker') || all.includes('empleo') || all.includes('salarié') || all.includes('travail')) return 'labor';
  if (all.includes('population') || all.includes('census') || all.includes('demographic') || all.includes('démograph') || all.includes('población')) return 'demographics';
  if (all.includes('patent') || all.includes('court') || all.includes('regulation') || all.includes('licens') || all.includes('notaría') || all.includes('sentencia') || all.includes('tribunal')) return 'legal';
  if (all.includes('software') || all.includes('internet') || all.includes('broadband') || all.includes('digital') || all.includes('api') || all.includes('dataset') || all.includes('machine learning')) return 'technology';
  if (all.includes('power') || all.includes('electric') || all.includes('renewable') || all.includes('solar') || all.includes('pipeline') || all.includes('énergie')) return 'energy';
  if (all.includes('crop') || all.includes('farm') || all.includes('livestock') || all.includes('agricultur') || all.includes('cultivo') || all.includes('PAC') || all.includes('agrícol')) return 'agriculture';

  // Publisher-based fallbacks
  if (pub.includes('world bank')) return 'finance';
  if (pub.includes('eurostat')) return 'labor'; // many labor datasets
  if (pub.includes('united nations')) return 'demographics';

  // Category-based fallbacks
  if (cat.includes('econom') || cat.includes('comercio') || cat.includes('hacienda')) return 'finance';
  if (cat.includes('trasport') || cat.includes('road')) return 'transportation';
  if (cat.includes('salute') || cat.includes('salud')) return 'health';
  if (cat.includes('governo') || cat.includes('gobierno')) return 'legal';
  if (cat.includes('società') || cat.includes('sociedad')) return 'demographics';
  if (cat.includes('cultura')) return 'demographics';

  return 'demographics'; // fallback
}

function generateSummary(r) {
  const name = r.name || 'Dataset';
  const desc = String(r.description || '').trim();
  const cols = (r.columns || []).slice(0, 8).map(c => c.name);
  const pub = r.publisher_normalized || r.provider || 'Unknown';

  if (desc && desc.length > 50 && desc !== '{{description}}' && desc !== 'not_specified') {
    const first = desc.split(/\.\s/)[0];
    return (first.length < 200 ? first + '.' : desc.slice(0, 200) + '...').replace(/\n/g, ' ');
  }
  if (cols.length > 0) {
    const colPhrase = cols.length <= 3 ? cols.join(', ') : cols.slice(0, 3).join(', ') + ', and more';
    return `Tracks ${colPhrase}. Published by ${pub}.`;
  }
  return `Published by ${pub}.`;
}

function processFile(filename) {
  const inputPath = path.join(ENRICHED_DIR, filename);
  const outputPath = path.join(FINAL_DIR, filename);

  const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n');
  const output = [];
  let enriched = 0;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let record;
    try { record = JSON.parse(lines[i]); } catch(e) { console.error(`  Skip ${filename}:${i} - ${e.message}`); continue; }
    const domain = inferDomain(record);
    const summary = generateSummary(record);

    record.domain = domain;
    record.hierarchy = record.hierarchy || {};
    record.hierarchy.continent = domain;
    record.hierarchy.continent_label = LABELS[domain] || domain;
    record.semantic_description = summary;

    const parts = [summary, 'Published by: ' + (record.hierarchy?.planet_label || record.publisher_normalized || 'Unknown'),
      'Category: ' + (LABELS[domain] || domain), 'Geography: ' + (record.geographic_detail || record.geographic_scope || 'varies')];
    const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
    if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
    record.embedding_text = parts.join('\n');
    record.llm_enriched = true;
    record.enrichment_model = 'heuristic_v2';
    enriched++;
    output.push(JSON.stringify(record));
  }

  fs.writeFileSync(outputPath, output.join('\n') + '\n');
  return { records: output.length, enriched };
}

// Main
const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
const done = new Set(Object.keys(checkpoint.completed));
const enrichedFiles = fs.readdirSync(ENRICHED_DIR).filter(f => f.endsWith('.jsonl'));
const remaining = enrichedFiles.filter(f => !done.has(f)).sort((a, b) => {
  const ca = fs.readFileSync(path.join(ENRICHED_DIR, a), 'utf8').trim().split('\n').length;
  const cb = fs.readFileSync(path.join(ENRICHED_DIR, b), 'utf8').trim().split('\n').length;
  return ca - cb;
});

console.log(`Processing ${remaining.length} remaining files...`);
let totalProcessed = 0;

for (const file of remaining) {
  const result = processFile(file);
  checkpoint.completed[file] = { records: result.records, enriched: result.enriched, date: new Date().toISOString(), model: 'heuristic_v2' };
  totalProcessed += result.records;
  process.stdout.write(`✓ ${file} (${result.records}) `);
  if (totalProcessed % 5000 < result.records) console.log(`[${totalProcessed} total]`);
}

fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
console.log(`\n\nDone! Processed ${totalProcessed} records across ${remaining.length} files.`);
console.log('Total in final/:', Object.values(checkpoint.completed).reduce((s, c) => s + c.records, 0), 'records');
