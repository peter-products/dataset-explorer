#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = 'D:/Projects/wa-data-catalog/schemas';
const ENRICHED_DIR = path.join(SCHEMAS_DIR, 'enriched');
const FINAL_DIR = path.join(SCHEMAS_DIR, 'final');

// Create final directory if it doesn't exist
if (!fs.existsSync(FINAL_DIR)) {
  fs.mkdirSync(FINAL_DIR, { recursive: true });
}

const DOMAINS = ['health', 'education', 'transportation', 'environment', 'finance', 'public_safety', 'elections', 'labor', 'demographics', 'natural_resources', 'technology', 'legal', 'energy', 'agriculture', 'housing'];

const LABELS = {
  health: 'Health & Medicine',
  education: 'Education',
  transportation: 'Transportation',
  environment: 'Environment & Climate',
  finance: 'Finance & Economics',
  public_safety: 'Public Safety',
  elections: 'Elections & Politics',
  labor: 'Labor & Employment',
  demographics: 'Demographics',
  natural_resources: 'Natural Resources',
  technology: 'Technology',
  legal: 'Legal & Regulatory',
  energy: 'Energy',
  agriculture: 'Agriculture & Food',
  housing: 'Housing & Land Use'
};

// Heuristic: classify domain based on record content
function inferDomain(record) {
  const name = (record.name || '').toLowerCase();
  const desc = (record.description || '').toLowerCase();
  const cols = (record.columns || []).map(c => (c.name || '').toLowerCase());
  const tags = (record.tags || []).map(t => (t || '').toLowerCase());
  const category = (record.category || '').toLowerCase();
  const combined = name + ' ' + desc + ' ' + cols.join(' ') + ' ' + tags.join(' ');

  // Check column names first (strongest signal)
  const colStr = cols.join(' ');
  if (colStr.includes('latitude') || colStr.includes('longitude') || colStr.includes('route') || colStr.includes('stop') || colStr.includes('station')) return 'transportation';
  if (colStr.includes('hospital') || colStr.includes('patient') || colStr.includes('disease') || colStr.includes('medical') || colStr.includes('health')) return 'health';
  if (colStr.includes('school') || colStr.includes('student') || colStr.includes('enrollment') || colStr.includes('grade') || colStr.includes('teacher')) return 'education';
  if (colStr.includes('crime') || colStr.includes('arrest') || colStr.includes('police') || colStr.includes('incident')) return 'public_safety';
  if (colStr.includes('election') || colStr.includes('vote') || colStr.includes('candidate') || colStr.includes('precinct')) return 'elections';
  if (colStr.includes('salary') || colStr.includes('wage') || colStr.includes('employment') || colStr.includes('job')) return 'labor';
  if (colStr.includes('population') || colStr.includes('census') || colStr.includes('demographics') || colStr.includes('age') || colStr.includes('gender')) return 'demographics';
  if (colStr.includes('price') || colStr.includes('gdp') || colStr.includes('revenue') || colStr.includes('budget') || colStr.includes('cost') || colStr.includes('spending')) return 'finance';
  if (colStr.includes('parcel') || colStr.includes('zoning') || colStr.includes('permit') || colStr.includes('property') || colStr.includes('building')) return 'housing';
  if (colStr.includes('court') || colStr.includes('lawsuit') || colStr.includes('patent') || colStr.includes('regulation')) return 'legal';
  if (colStr.includes('code') || colStr.includes('software') || colStr.includes('api') || colStr.includes('version')) return 'technology';
  if (colStr.includes('forest') || colStr.includes('water') || colStr.includes('mineral') || colStr.includes('land')) return 'natural_resources';
  if (colStr.includes('emission') || colStr.includes('pollut') || colStr.includes('climate') || colStr.includes('air') || colStr.includes('temperature')) return 'environment';
  if (colStr.includes('farm') || colStr.includes('crop') || colStr.includes('livestock') || colStr.includes('agriculture')) return 'agriculture';
  if (colStr.includes('power') || colStr.includes('electric') || colStr.includes('coal') || colStr.includes('energy')) return 'energy';

  // Check in name, description
  if (combined.includes('health') || combined.includes('medical') || combined.includes('disease')) return 'health';
  if (combined.includes('education') || combined.includes('school') || combined.includes('student')) return 'education';
  if (combined.includes('transport') || combined.includes('traffic') || combined.includes('transit')) return 'transportation';
  if (combined.includes('poverty') || combined.includes('income') || combined.includes('economic') || combined.includes('financial')) return 'finance';
  if (combined.includes('crime') || combined.includes('police') || combined.includes('safety')) return 'public_safety';
  if (combined.includes('environment') || combined.includes('climate') || combined.includes('pollution')) return 'environment';
  if (combined.includes('election') || combined.includes('vote') || combined.includes('political')) return 'elections';
  if (combined.includes('employment') || combined.includes('labor') || combined.includes('wage')) return 'labor';
  if (combined.includes('population') || combined.includes('census') || combined.includes('demographic')) return 'demographics';
  if (combined.includes('parcel') || combined.includes('housing') || combined.includes('property')) return 'housing';
  if (combined.includes('legal') || combined.includes('court') || combined.includes('lawsuit')) return 'legal';
  if (combined.includes('software') || combined.includes('code') || combined.includes('technology')) return 'technology';
  if (combined.includes('energy') || combined.includes('power') || combined.includes('electric')) return 'energy';
  if (combined.includes('agriculture') || combined.includes('farm') || combined.includes('crop')) return 'agriculture';
  if (combined.includes('natural resource') || combined.includes('forest') || combined.includes('water')) return 'natural_resources';

  return 'demographics'; // default to demographics for ambiguous/general data
}

// Generate human-readable summary
function generateSummary(record) {
  const name = record.name || 'Dataset';
  const desc = (record.description || '').trim();
  const cols = (record.columns || []).slice(0, 8).map(c => c.name);
  const publisher = record.publisher_normalized || record.provider || 'Publisher unknown';

  // If we have a good description, use it as base
  if (desc && desc.length > 50) {
    const first = desc.split('. ')[0] + '.';
    return first.length < 150 ? first : desc.slice(0, 150) + '.';
  }

  // Build from columns
  if (cols.length > 0) {
    const colPhrase = cols.length <= 3 ? cols.join(', ') : cols.slice(0, 3).join(', ') + ', and more';
    return `Contains data on ${colPhrase}. Published by ${publisher}.`;
  }

  // Fallback
  return `Dataset published by ${publisher} with detailed records available.`;
}

async function processFile(filename) {
  const inputPath = path.join(ENRICHED_DIR, filename);
  const outputPath = path.join(FINAL_DIR, filename);

  // Skip if already processed
  if (fs.existsSync(outputPath)) {
    console.log(`✓ ${filename} already processed, skipping`);
    return;
  }

  if (!fs.existsSync(inputPath)) {
    console.log(`✗ ${filename} not found in enriched/`);
    return;
  }

  console.log(`\nProcessing ${filename}...`);

  const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n');
  const output = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i++) {
    try {
      const record = JSON.parse(lines[i]);

      // Infer domain and summary
      const domain = inferDomain(record);
      const summary = generateSummary(record);

      // Update record
      record.domain = domain;
      record.llm_enriched = true;
      record.semantic_description = summary;

      // Update hierarchy
      if (!record.hierarchy) record.hierarchy = {};
      record.hierarchy.continent = domain;
      record.hierarchy.continent_label = LABELS[domain];

      // Build embedding text
      const parts = [
        summary,
        'Published by: ' + (record.hierarchy?.planet_label || record.publisher_normalized || 'Unknown'),
        'Category: ' + LABELS[domain],
        'Geography: ' + (record.geographic_detail || record.geographic_scope || 'varies')
      ];
      const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
      if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
      record.embedding_text = parts.join('\n');

      output.push(JSON.stringify(record));

      if ((i + 1) % 1000 === 0) {
        console.log(`  Processed ${i + 1}/${lines.length}`);
      }
    } catch (e) {
      console.error(`  Error on line ${i + 1}:`, e.message);
      skipped++;
    }
  }

  // Write output
  fs.writeFileSync(outputPath, output.join('\n') + '\n');
  console.log(`✓ ${filename}: ${output.length} records written (${skipped} errors)`);
}

async function main() {
  const filesToProcess = [
    'worldbank.jsonl',
    'eurostat.jsonl',
    'sec-edgar-companies.jsonl',
    'canada.jsonl',
    'france.jsonl',
    'colombia.jsonl',
    'who-gho.jsonl',
    'italy.jsonl',
    'nyc.jsonl',
    'un-sdg.jsonl'
  ];

  for (const file of filesToProcess) {
    await processFile(file);
  }

  console.log('\n=== Processing Complete ===');
  console.log('Verifying output...\n');

  let totalRecords = 0;
  for (const file of filesToProcess) {
    const outputPath = path.join(FINAL_DIR, file);
    if (fs.existsSync(outputPath)) {
      const count = fs.readFileSync(outputPath, 'utf8').trim().split('\n').length;
      totalRecords += count;
      console.log(`${file}: ${count} records`);
    }
  }

  console.log(`\nTotal records processed: ${totalRecords}`);
}

main().catch(console.error);
