// A/B Test: Haiku (cloud) vs Gemma 4 E2B (local) for dataset schema enrichment
// Haiku output already exists in final/. Gemma runs live via Ollama.
// Usage: node ab-test-haiku-vs-gemma.mjs

import fs from 'fs';
import path from 'path';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const SCHEMAS_DIR = 'D:/Projects/wa-data-catalog/schemas';
const OUTPUT_FILE = path.join(SCHEMAS_DIR, 'ab-test-haiku-vs-gemma.json');

const SOURCES = [
  { file: 'worldbank.jsonl', sample: 50 },
  { file: 'eurostat.jsonl', sample: 50 },
  { file: 'sec-edgar-companies.jsonl', sample: 50 },
  { file: 'canada.jsonl', sample: 50 },
  { file: 'france.jsonl', sample: 50 },
  { file: 'colombia.jsonl', sample: 50 },
  { file: 'who-gho.jsonl', sample: 50 },
  { file: 'italy.jsonl', sample: 50 },
  { file: 'nyc.jsonl', sample: 50 },
  { file: 'un-sdg.jsonl', sample: 50 },
];

const VALID_DOMAINS = [
  'health', 'education', 'transportation', 'environment', 'finance',
  'public_safety', 'elections', 'labor', 'demographics',
  'natural_resources', 'technology', 'legal', 'energy',
  'agriculture', 'housing',
];

const FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    domain: {
      type: ['string', 'null'],
      enum: [...VALID_DOMAINS, null],
    },
    summary: { type: 'string' },
  },
  required: ['domain', 'summary'],
};

const PROMPT_TEMPLATE = `You classify datasets and write short descriptions. You receive a dataset's name, publisher, description, column names, and tags.

RULES:
1. Choose the BEST matching domain from the allowed list. If genuinely unclear, return null.
2. Write 1-2 sentences describing what the data CONTAINS and who would use it.
3. Be SPECIFIC — mention actual column content, not generic descriptions.
4. Base everything on the input fields. Do NOT use outside knowledge.
5. If the input has very little information, say so rather than guessing.

ALLOWED DOMAINS: health, education, transportation, environment, finance, public_safety, elections, labor, demographics, natural_resources, technology, legal, energy, agriculture, housing

DATASET:
Name: {name}
Publisher: {publisher}
Description: {description}
Columns: {columns}
Tags: {tags}

Return JSON only.`;

// === SAMPLE EVENLY-SPACED INDICES ===
function sampleIndices(totalLines, count) {
  if (count >= totalLines) return Array.from({ length: totalLines }, (_, i) => i);
  const step = totalLines / count;
  return Array.from({ length: count }, (_, i) => Math.floor(i * step));
}

// === BUILD PROMPT FROM ENRICHED RECORD ===
function buildPrompt(record) {
  const cols = (record.columns || []).slice(0, 12).map(c => c.name).join(', ');
  const desc = (record.description || '').slice(0, 250);
  const tags = (record.tags || []).slice(0, 8).join(', ');
  const pub = record.publisher_normalized || record.provider || 'Unknown';
  const name = record.name || 'Untitled';

  return PROMPT_TEMPLATE
    .replace('{name}', name)
    .replace('{publisher}', pub)
    .replace('{description}', desc || 'None')
    .replace('{columns}', cols || 'None')
    .replace('{tags}', tags || 'None');
}

// === CALL OLLAMA ===
async function callOllama(prompt) {
  const start = Date.now();
  try {
    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemma4:e2b',
        prompt,
        stream: false,
        format: FORMAT_SCHEMA,
        options: { temperature: 0.1, num_predict: 300, top_p: 0.9, repeat_penalty: 1.1 },
      }),
      signal: AbortSignal.timeout(120000),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const elapsed = Date.now() - start;
    const parsed = JSON.parse(data.response || '{}');
    return { domain: parsed.domain || null, summary: parsed.summary || '', elapsed_ms: elapsed, error: null };
  } catch (e) {
    return { domain: null, summary: '', elapsed_ms: Date.now() - start, error: e.message };
  }
}

// === PRE-WARM ===
async function prewarm() {
  console.log('Pre-warming gemma4:e2b...');
  const start = Date.now();
  await callOllama('Return {"domain": null, "summary": "test"}');
  console.log(`  Warmed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

// === MAIN ===
async function main() {
  // Check Ollama
  try {
    const check = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
    const data = await check.json();
    const models = (data.models || []).map(m => m.name);
    console.log('Ollama models available:', models.join(', '));
    if (!models.some(m => m.includes('gemma4'))) {
      console.error('ERROR: gemma4:e2b not found. Pull it first: ollama pull gemma4:e2b');
      process.exit(1);
    }
  } catch (e) {
    console.error('Ollama not running! Start it first.');
    process.exit(1);
  }

  // Build test set: load enriched (input) + final (haiku output) for sampled indices
  console.log('\nBuilding test set...');
  const testRecords = [];

  for (const source of SOURCES) {
    const enrichedLines = fs.readFileSync(path.join(SCHEMAS_DIR, 'enriched', source.file), 'utf8').trim().split('\n');
    const finalLines = fs.readFileSync(path.join(SCHEMAS_DIR, 'final', source.file), 'utf8').trim().split('\n');
    const indices = sampleIndices(enrichedLines.length, source.sample);

    for (const idx of indices) {
      const enriched = JSON.parse(enrichedLines[idx]);
      const final_ = JSON.parse(finalLines[idx]);
      testRecords.push({
        source: source.file,
        line_index: idx,
        input: enriched,
        haiku: { domain: final_.domain, summary: final_.semantic_description || '' },
      });
    }
    console.log(`  ${source.file}: ${indices.length} records sampled (of ${enrichedLines.length})`);
  }

  console.log(`\nTotal test records: ${testRecords.length}`);

  // Run Gemma
  await prewarm();
  console.log(`\n=== Running Gemma 4 E2B on ${testRecords.length} records ===\n`);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < testRecords.length; i++) {
    const t = testRecords[i];
    const prompt = buildPrompt(t.input);
    const gemma = await callOllama(prompt);

    const agree = gemma.domain === t.haiku.domain;
    results.push({
      source: t.source,
      line_index: t.line_index,
      name: (t.input.name || '').slice(0, 80),
      haiku_domain: t.haiku.domain,
      gemma_domain: gemma.domain,
      domain_agree: agree,
      haiku_summary: t.haiku.summary,
      gemma_summary: gemma.summary,
      gemma_ms: gemma.elapsed_ms,
      gemma_error: gemma.error,
    });

    const symbol = agree ? '✓' : '✗';
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    const eta = i > 0 ? (((Date.now() - startTime) / (i + 1)) * (testRecords.length - i - 1) / 60000).toFixed(1) : '?';
    console.log(`[${i + 1}/${testRecords.length}] ${elapsed}s ${symbol} h=${t.haiku.domain} g=${gemma.domain || 'null'} | ${(t.input.name || '').slice(0, 45)} (ETA ${eta}m)`);
  }

  // === COMPUTE STATS ===
  const domainAgree = results.filter(r => r.domain_agree).length;
  const timings = results.map(r => r.gemma_ms).filter(t => t > 0).sort((a, b) => a - b);
  const errors = results.filter(r => r.gemma_error).length;
  const totalSec = (Date.now() - startTime) / 1000;

  // Per-source agreement
  const perSource = {};
  for (const r of results) {
    if (!perSource[r.source]) perSource[r.source] = { total: 0, agree: 0 };
    perSource[r.source].total++;
    if (r.domain_agree) perSource[r.source].agree++;
  }

  // Disagreement breakdown
  const disagreements = results.filter(r => !r.domain_agree);
  const disagreeByDomain = {};
  for (const d of disagreements) {
    const key = `${d.haiku_domain} → ${d.gemma_domain || 'null'}`;
    disagreeByDomain[key] = (disagreeByDomain[key] || 0) + 1;
  }

  // Summary quality heuristic: flag generic summaries
  const haikuGeneric = results.filter(r => r.haiku_summary.includes('Contains data on') || r.haiku_summary.includes('Published by') && r.haiku_summary.length < 80).length;
  const gemmaGeneric = results.filter(r => r.gemma_summary.includes('Contains data on') || r.gemma_summary.includes('Published by') && r.gemma_summary.length < 80).length;
  const haikuEmpty = results.filter(r => !r.haiku_summary || r.haiku_summary.length < 20).length;
  const gemmaEmpty = results.filter(r => !r.gemma_summary || r.gemma_summary.length < 20).length;

  const stats = {
    total_records: results.length,
    domain_agreement: domainAgree,
    domain_agreement_pct: (domainAgree / results.length * 100).toFixed(1) + '%',
    gemma_median_ms: timings[Math.floor(timings.length / 2)] || 0,
    gemma_p95_ms: timings[Math.floor(timings.length * 0.95)] || 0,
    gemma_mean_ms: Math.round(timings.reduce((s, t) => s + t, 0) / timings.length) || 0,
    gemma_errors: errors,
    total_seconds: Math.round(totalSec),
    haiku_generic_summaries: haikuGeneric,
    gemma_generic_summaries: gemmaGeneric,
    haiku_empty_summaries: haikuEmpty,
    gemma_empty_summaries: gemmaEmpty,
    per_source_agreement: Object.fromEntries(
      Object.entries(perSource).map(([k, v]) => [k, `${v.agree}/${v.total} (${(v.agree / v.total * 100).toFixed(0)}%)`])
    ),
    top_disagreements: Object.entries(disagreeByDomain).sort((a, b) => b[1] - a[1]).slice(0, 15),
    extrapolated_200k_hours: ((timings.reduce((s, t) => s + t, 0) / timings.length) / 1000 * 200000 / 3600).toFixed(1),
  };

  // Save full output
  const output = { test_date: new Date().toISOString(), stats, results };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Print report
  console.log('\n' + '='.repeat(65));
  console.log('  A/B TEST: Haiku (cloud) vs Gemma 4 E2B (local)');
  console.log('='.repeat(65));
  console.log(`\n  Records tested:        ${stats.total_records}`);
  console.log(`  Domain agreement:      ${stats.domain_agreement}/${stats.total_records} (${stats.domain_agreement_pct})`);
  console.log(`  Gemma errors:          ${stats.gemma_errors}`);
  console.log(`  Gemma median latency:  ${stats.gemma_median_ms}ms`);
  console.log(`  Gemma P95 latency:     ${stats.gemma_p95_ms}ms`);
  console.log(`  Total Gemma time:      ${stats.total_seconds}s`);
  console.log(`  Extrapolated 200K:     ~${stats.extrapolated_200k_hours} hours`);
  console.log(`\n  Summary quality (generic/empty):`);
  console.log(`    Haiku:  ${haikuGeneric} generic, ${haikuEmpty} empty`);
  console.log(`    Gemma:  ${gemmaGeneric} generic, ${gemmaEmpty} empty`);
  console.log(`\n  Per-source agreement:`);
  for (const [src, pct] of Object.entries(stats.per_source_agreement)) {
    console.log(`    ${src.padEnd(30)} ${pct}`);
  }
  if (stats.top_disagreements.length) {
    console.log(`\n  Top disagreements (haiku → gemma):`);
    for (const [pair, count] of stats.top_disagreements) {
      console.log(`    ${pair.padEnd(35)} ${count}x`);
    }
  }
  console.log('\n  Full results: ' + OUTPUT_FILE);
}

main().catch(err => { console.error(err.message); process.exit(1); });
