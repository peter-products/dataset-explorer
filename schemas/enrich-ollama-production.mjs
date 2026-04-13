// Production LLM enrichment using Gemma 4 E2B via Ollama
// Processes all records from enriched/ directory, writes to final/
// Applies best practices from D:\Projects\local-llm-best-practices.md:
//   - format schema for grammar-constrained generation
//   - think: false (harmless for Gemma, included for safety)
//   - checkpoint after each success
//   - pre-warm before batch
//   - temperature 0.1 for determinism
//
// Usage:
//   node enrich-ollama-production.mjs                    # process all files
//   node enrich-ollama-production.mjs wa-gov.jsonl       # process one file
//   node enrich-ollama-production.mjs --resume            # resume from checkpoint

import fs from 'fs';
import path from 'path';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'gemma4:e2b';
const INPUT_DIR = 'D:/Projects/wa-data-catalog/schemas/enriched';
const OUTPUT_DIR = 'D:/Projects/wa-data-catalog/schemas/final';
const CHECKPOINT_FILE = 'D:/Projects/wa-data-catalog/schemas/enrichment-checkpoint.json';

const VALID_DOMAINS = [
  'health', 'education', 'transportation', 'environment', 'finance',
  'public_safety', 'elections', 'labor', 'demographics',
  'natural_resources', 'technology', 'legal', 'energy',
  'agriculture', 'housing',
];

const FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    domain: { type: ['string', 'null'], enum: [...VALID_DOMAINS, null] },
    summary: { type: 'string' },
  },
  required: ['domain', 'summary'],
};

const LABELS = {
  health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
  environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
  elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics',
  natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
  energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use',
};

const PROMPT = `You classify datasets and write short descriptions.

RULES:
1. Choose the BEST domain from: health, education, transportation, environment, finance, public_safety, elections, labor, demographics, natural_resources, technology, legal, energy, agriculture, housing. Return null if unclear.
2. Write 1-2 sentences describing what the data CONTAINS and who would use it.
3. Be SPECIFIC. Base everything on the input. Do NOT guess.
4. If the input has little info, say so rather than inventing details.

DATASET:
Name: {name}
Publisher: {publisher}
Description: {description}
Columns: {columns}
Tags: {tags}

Return JSON only.`;

// === CHECKPOINT ===
function loadCheckpoint() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
  } catch (e) {
    return { completed_files: [], current_file: null, current_offset: 0, total_processed: 0, total_enriched: 0, started: new Date().toISOString() };
  }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

// === OLLAMA ===
async function callOllama(prompt) {
  try {
    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        stream: false,
        think: false,
        format: FORMAT_SCHEMA,
        options: { temperature: 0.1, num_predict: 300, top_p: 0.9, repeat_penalty: 1.1 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    const data = await resp.json();
    return JSON.parse(data.response || '{}');
  } catch (e) {
    return null;
  }
}

async function prewarm() {
  console.log('Pre-warming Gemma 4 E2B...');
  const s = Date.now();
  await callOllama('Return {"domain": null, "summary": "warmup"}');
  // Second call to ensure VRAM is loaded
  await callOllama('Return {"domain": "health", "summary": "test data about hospitals"}');
  console.log(`  Ready in ${((Date.now() - s) / 1000).toFixed(1)}s`);
}

// === BUILD PROMPT ===
function buildPrompt(record) {
  const cols = (record.columns || []).slice(0, 12).map(c => c.name).join(', ');
  return PROMPT
    .replace('{name}', (record.name || 'Untitled').slice(0, 100))
    .replace('{publisher}', (record.publisher_normalized || record.provider || 'Unknown').slice(0, 60))
    .replace('{description}', (record.description || 'None').slice(0, 250))
    .replace('{columns}', cols || 'None')
    .replace('{tags}', (record.tags || []).slice(0, 8).join(', ') || 'None');
}

// === APPLY ENRICHMENT ===
function applyEnrichment(record, result) {
  if (result && result.domain && VALID_DOMAINS.includes(result.domain)) {
    record.domain = result.domain;
    record.hierarchy.continent = result.domain;
    record.hierarchy.continent_label = LABELS[result.domain] || result.domain;
  }

  if (result && result.summary && result.summary.length > 20) {
    record.semantic_description = result.summary;
    const parts = [
      result.summary,
      'Published by: ' + record.hierarchy.planet_label,
      'Category: ' + (LABELS[record.domain] || record.domain),
      'Geography: ' + (record.geographic_detail || record.geographic_scope || 'varies'),
    ];
    const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
    if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
    record.embedding_text = parts.join('\n');
  }

  record.llm_enriched = true;
  record.llm_model = MODEL;
  return record;
}

// === PROCESS ONE FILE ===
async function processFile(filename, checkpoint) {
  const inputPath = path.join(INPUT_DIR, filename);
  const outputPath = path.join(OUTPUT_DIR, filename);

  const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n');
  const startOffset = (checkpoint.current_file === filename) ? checkpoint.current_offset : 0;

  if (startOffset > 0) {
    console.log(`  Resuming from record ${startOffset}/${lines.length}`);
  }

  // If resuming, read existing output; otherwise start fresh
  let outputLines = [];
  if (startOffset > 0 && fs.existsSync(outputPath)) {
    outputLines = fs.readFileSync(outputPath, 'utf8').trim().split('\n');
  }

  let enriched = 0;
  let failed = 0;

  for (let i = startOffset; i < lines.length; i++) {
    let record;
    try {
      record = JSON.parse(lines[i]);
    } catch (e) {
      outputLines.push(lines[i]); // Pass through unparseable lines
      continue;
    }

    const prompt = buildPrompt(record);
    const result = await callOllama(prompt);

    if (result) {
      record = applyEnrichment(record, result);
      enriched++;
    } else {
      record.llm_enriched = false;
      failed++;
    }

    outputLines.push(JSON.stringify(record));

    // Checkpoint every 10 records
    if ((i + 1) % 10 === 0 || i === lines.length - 1) {
      fs.writeFileSync(outputPath, outputLines.join('\n') + '\n');
      checkpoint.current_file = filename;
      checkpoint.current_offset = i + 1;
      checkpoint.total_processed++;
      checkpoint.total_enriched += enriched;
      saveCheckpoint(checkpoint);

      const pct = ((i + 1) / lines.length * 100).toFixed(0);
      const elapsed = enriched + failed;
      process.stdout.write(`\r  ${filename}: ${i + 1}/${lines.length} (${pct}%) | ${enriched} enriched, ${failed} failed`);
    }
  }

  // Final write
  fs.writeFileSync(outputPath, outputLines.join('\n') + '\n');
  console.log(`\n  Done: ${enriched} enriched, ${failed} failed out of ${lines.length}`);

  return { enriched, failed, total: lines.length };
}

// === MAIN ===
async function main() {
  // Create output directory
  try { fs.mkdirSync(OUTPUT_DIR, { recursive: true }); } catch (e) {}

  const checkpoint = loadCheckpoint();
  const targetFile = process.argv[2];
  const isResume = targetFile === '--resume';

  // Get file list
  let files;
  if (targetFile && !isResume) {
    files = [targetFile];
  } else {
    files = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jsonl')).sort();
    // Skip completed files
    files = files.filter(f => !checkpoint.completed_files.includes(f));
  }

  console.log(`Files to process: ${files.length}`);
  console.log(`Already completed: ${checkpoint.completed_files.length}`);
  console.log(`Total processed so far: ${checkpoint.total_processed}`);

  await prewarm();

  let grandTotal = { enriched: 0, failed: 0, total: 0 };
  const startTime = Date.now();

  for (const file of files) {
    console.log(`\nProcessing: ${file}`);
    const result = await processFile(file, checkpoint);
    grandTotal.enriched += result.enriched;
    grandTotal.failed += result.failed;
    grandTotal.total += result.total;

    // Mark file as completed
    checkpoint.completed_files.push(file);
    checkpoint.current_file = null;
    checkpoint.current_offset = 0;
    saveCheckpoint(checkpoint);
  }

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n${'='.repeat(50)}`);
  console.log(`SESSION COMPLETE`);
  console.log(`  Records: ${grandTotal.total} (${grandTotal.enriched} enriched, ${grandTotal.failed} failed)`);
  console.log(`  Time: ${(elapsed / 60).toFixed(1)} minutes (${(elapsed / grandTotal.total).toFixed(2)}s/record)`);
  console.log(`  Files done this session: ${files.length}`);
  console.log(`  Total files completed: ${checkpoint.completed_files.length}`);
  const remaining = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.jsonl')).length - checkpoint.completed_files.length;
  console.log(`  Files remaining: ${remaining}`);
  if (remaining > 0) {
    const estHours = (elapsed / grandTotal.total * remaining * 1000 / 3600).toFixed(1);
    console.log(`  Estimated remaining: ~${estHours} hours`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
