// A/B Test: Gemma 4 E2B vs Qwen 3.5 9B for dataset schema enrichment
// Runs 50 test records through both models, measures accuracy + speed
// Usage: node ab-test-enrichment.mjs

import fs from 'fs';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const INPUT_FILE = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-sample.jsonl';
const OUTPUT_FILE = 'D:/Projects/wa-data-catalog/schemas/ab-test-results.json';

const MODEL_A = 'gemma4:e2b';
const MODEL_B = 'qwen3.5:9b';

const VALID_DOMAINS = [
  'health', 'education', 'transportation', 'environment', 'finance',
  'public_safety', 'elections', 'labor', 'demographics',
  'natural_resources', 'technology', 'legal', 'energy',
  'agriculture', 'housing', null,
];

const FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    domain: {
      type: ['string', 'null'],
      enum: VALID_DOMAINS,
    },
    summary: {
      type: 'string',
    },
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

// === SELECT 50 TEST RECORDS ===
// Pick indices spread across the sample to get variety
function selectTestRecords(allLines) {
  // Hand-picked indices for coverage:
  // 0-9: easy cases (strong signals)
  // 10-19: Austin city data (mixed domains)
  // 20-29: Bay Area Metro (ambiguous housing/transport)
  // 30-39: BigQuery (well-described)
  // 40-49: international + sparse
  const indices = [
    // Easy: clear domain signals
    0, 10, 18, 27, 58, 63, 100, 119, 160, 205,
    // Austin city: mixed
    50, 53, 54, 56, 59, 64, 72, 77, 80, 86,
    // Bay Area: ambiguous
    304, 308, 311, 318, 321, 335, 341, 356, 369, 376,
    // BigQuery: rich schemas
    476, 477, 479, 482, 484, 486, 488, 494, 495, 499,
    // International/sparse
    1, 5, 19, 45, 106, 145, 219, 233, 312, 468,
  ];
  return indices.map(i => ({ index: i, record: JSON.parse(allLines[i]) }));
}

// === BUILD PROMPT ===
function buildPrompt(record) {
  const r = record;
  const cols = (r.columns || []).slice(0, 12).map(c => c.name).join(', ');
  const desc = (r.description || '').slice(0, 250);
  const tags = (r.tags || []).slice(0, 8).join(', ');
  const pub = r.publisher_normalized || r.provider || 'Unknown';
  const name = r.name || 'Untitled';

  return PROMPT_TEMPLATE
    .replace('{name}', name)
    .replace('{publisher}', pub)
    .replace('{description}', desc || 'None')
    .replace('{columns}', cols || 'None')
    .replace('{tags}', tags || 'None');
}

// === CALL OLLAMA ===
async function callOllama(model, prompt) {
  const start = Date.now();
  try {
    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        think: false,
        format: FORMAT_SCHEMA,
        options: {
          temperature: 0.1,
          num_predict: 300,
          top_p: 0.9,
          repeat_penalty: 1.1,
        },
      }),
      signal: AbortSignal.timeout(300000),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    const elapsed = Date.now() - start;
    const text = data.response || '{}';

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { domain: null, summary: '', elapsed_ms: elapsed, parse_error: true };
    }

    return {
      domain: parsed.domain || null,
      summary: parsed.summary || '',
      elapsed_ms: elapsed,
      parse_error: false,
    };
  } catch (e) {
    return { domain: null, summary: '', elapsed_ms: Date.now() - start, error: e.message };
  }
}

// === PRE-WARM MODEL ===
async function prewarm(model) {
  console.log(`Pre-warming ${model}...`);
  const start = Date.now();
  await callOllama(model, 'Return {"domain": null, "summary": "test"}');
  console.log(`  Warmed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

// === RUN ALL RECORDS THROUGH ONE MODEL ===
async function runModel(model, testRecords) {
  console.log(`\n=== Running ${model} on ${testRecords.length} records ===`);
  await prewarm(model);

  const results = [];
  for (let i = 0; i < testRecords.length; i++) {
    const { index, record } = testRecords[i];
    const prompt = buildPrompt(record);
    const result = await callOllama(model, prompt);

    results.push({
      record_index: index,
      input_name: (record.name || '').slice(0, 60),
      input_domain: record.domain,
      model_domain: result.domain,
      model_summary: result.summary,
      elapsed_ms: result.elapsed_ms,
      parse_error: result.parse_error || false,
      error: result.error || null,
    });

    const match = result.domain === record.domain ? '✓' : '✗';
    console.log(`  [${i + 1}/${testRecords.length}] ${result.elapsed_ms}ms ${match} ${result.domain || 'null'} | ${(record.name || '').slice(0, 40)}`);
  }

  return results;
}

// === COMPUTE STATS ===
function computeStats(results, groundTruth) {
  const timings = results.map(r => r.elapsed_ms).filter(t => t > 0);
  timings.sort((a, b) => a - b);

  let domainCorrect = 0;
  let nullCorrect = 0;
  let nullTotal = 0;
  let formatOk = 0;

  for (const r of results) {
    if (!r.parse_error && !r.error) formatOk++;

    // Compare to ground truth from our 500 LLM-enriched records where available,
    // otherwise use the deterministic domain
    const truth = groundTruth[r.record_index] || r.input_domain;
    if (r.model_domain === truth) domainCorrect++;

    if (truth === null || truth === 'unknown') {
      nullTotal++;
      if (r.model_domain === null) nullCorrect++;
    }
  }

  return {
    domain_accuracy: domainCorrect / results.length,
    median_ms: timings[Math.floor(timings.length / 2)] || 0,
    p95_ms: timings[Math.floor(timings.length * 0.95)] || 0,
    mean_ms: timings.reduce((s, t) => s + t, 0) / timings.length || 0,
    format_compliance: formatOk / results.length,
    null_correct: nullTotal > 0 ? nullCorrect / nullTotal : 1.0,
    total_seconds: timings.reduce((s, t) => s + t, 0) / 1000,
  };
}

// === MAIN ===
async function main() {
  // Check Ollama is running
  try {
    const check = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
    const data = await check.json();
    const models = (data.models || []).map(m => m.name);
    console.log('Ollama models:', models.join(', '));
    if (!models.some(m => m.includes('gemma4'))) console.log('WARNING: gemma4:e2b not found');
    if (!models.some(m => m.includes('qwen3.5'))) console.log('WARNING: qwen3.5:9b not found');
  } catch (e) {
    console.error('Ollama not running! Start it first.');
    process.exit(1);
  }

  // Load and select test records
  const allLines = fs.readFileSync(INPUT_FILE, 'utf8').trim().split('\n');
  console.log(`Loaded ${allLines.length} records from sample`);
  const testRecords = selectTestRecords(allLines);
  console.log(`Selected ${testRecords.length} test records`);

  // Load ground truth from our existing LLM enrichment (records 0-499)
  const groundTruth = {};
  try {
    const enriched = fs.readFileSync('D:/Projects/wa-data-catalog/schemas/llm-enrichment-output.jsonl', 'utf8').trim().split('\n');
    // The output file has records in order 0-499
    enriched.forEach((line, i) => {
      try {
        const r = JSON.parse(line);
        groundTruth[i] = r.domain;
      } catch (e) {}
    });
    console.log(`Loaded ${Object.keys(groundTruth).length} ground truth records from LLM enrichment`);
  } catch (e) {
    console.log('No ground truth file found, using deterministic domains');
  }

  // Run Model A (Gemma)
  const resultsA = await runModel(MODEL_A, testRecords);
  const statsA = computeStats(resultsA, groundTruth);

  // Run Model B (Qwen)
  const resultsB = await runModel(MODEL_B, testRecords);
  const statsB = computeStats(resultsB, groundTruth);

  // Save results
  const output = {
    test_date: new Date().toISOString(),
    test_records: testRecords.length,
    model_a: { name: MODEL_A, results: resultsA, stats: statsA },
    model_b: { name: MODEL_B, results: resultsB, stats: statsB },
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  // Print comparison
  console.log('\n' + '='.repeat(60));
  console.log('A/B TEST RESULTS');
  console.log('='.repeat(60));
  console.log(`\n${'Metric'.padEnd(25)} ${'Gemma 4 E2B'.padEnd(15)} ${'Qwen 3.5 9B'.padEnd(15)}`);
  console.log('-'.repeat(55));
  console.log(`${'Domain accuracy'.padEnd(25)} ${(statsA.domain_accuracy * 100).toFixed(1)}%${' '.repeat(10)} ${(statsB.domain_accuracy * 100).toFixed(1)}%`);
  console.log(`${'Format compliance'.padEnd(25)} ${(statsA.format_compliance * 100).toFixed(1)}%${' '.repeat(10)} ${(statsB.format_compliance * 100).toFixed(1)}%`);
  console.log(`${'Null handling'.padEnd(25)} ${(statsA.null_correct * 100).toFixed(1)}%${' '.repeat(10)} ${(statsB.null_correct * 100).toFixed(1)}%`);
  console.log(`${'Median latency'.padEnd(25)} ${statsA.median_ms}ms${' '.repeat(Math.max(1, 11 - String(statsA.median_ms).length))} ${statsB.median_ms}ms`);
  console.log(`${'P95 latency'.padEnd(25)} ${statsA.p95_ms}ms${' '.repeat(Math.max(1, 11 - String(statsA.p95_ms).length))} ${statsB.p95_ms}ms`);
  console.log(`${'Total time'.padEnd(25)} ${statsA.total_seconds.toFixed(1)}s${' '.repeat(Math.max(1, 11 - String(statsA.total_seconds.toFixed(1)).length))} ${statsB.total_seconds.toFixed(1)}s`);

  // Extrapolate
  const gemmaHours = (statsA.mean_ms / 1000 * 200000 / 3600).toFixed(1);
  const qwenHours = (statsB.mean_ms / 1000 * 200000 / 3600).toFixed(1);
  console.log(`\nExtrapolated 200K records:`);
  console.log(`  Gemma: ~${gemmaHours} hours`);
  console.log(`  Qwen:  ~${qwenHours} hours`);

  console.log(`\nResults saved to ${OUTPUT_FILE}`);
  console.log('Next step: Claude scores summary quality (1-5) for each record');
}

main().catch(err => { console.error(err.message); process.exit(1); });
