// A/B Test v2: Fixed warmup + Qwen uses prompt-only JSON (no format schema)
// Gemma keeps format schema since it works. Qwen can't handle format param.
import fs from 'fs';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const INPUT_FILE = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-sample.jsonl';
const OUTPUT_FILE = 'D:/Projects/wa-data-catalog/schemas/ab-test-results-v2.json';

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

const PROMPT = `You classify datasets and write short descriptions.

RULES:
1. Choose the BEST domain from: health, education, transportation, environment, finance, public_safety, elections, labor, demographics, natural_resources, technology, legal, energy, agriculture, housing. Return null if unclear.
2. Write 1-2 sentences describing what the data CONTAINS.
3. Be SPECIFIC. Base everything on the input. Do NOT guess.

DATASET:
Name: {name}
Publisher: {publisher}
Description: {description}
Columns: {columns}
Tags: {tags}

Return JSON only: {"domain": "...", "summary": "..."}`;

function selectTestRecords(allLines) {
  const indices = [
    0, 10, 18, 27, 58, 63, 100, 119, 160, 205,
    50, 53, 54, 56, 59, 64, 72, 77, 80, 86,
    304, 308, 311, 318, 321, 335, 341, 356, 369, 376,
    476, 477, 479, 482, 484, 486, 488, 494, 495, 499,
    1, 5, 19, 45, 106, 145, 219, 233, 312, 468,
  ];
  return indices.map(i => ({ index: i, record: JSON.parse(allLines[i]) }));
}

function buildPrompt(record) {
  const cols = (record.columns || []).slice(0, 12).map(c => c.name).join(', ');
  return PROMPT
    .replace('{name}', record.name || 'Untitled')
    .replace('{publisher}', record.publisher_normalized || record.provider || 'Unknown')
    .replace('{description}', (record.description || 'None').slice(0, 250))
    .replace('{columns}', cols || 'None')
    .replace('{tags}', (record.tags || []).slice(0, 8).join(', ') || 'None');
}

async function callOllama(model, prompt, useFormat) {
  const start = Date.now();
  const body = {
    model,
    prompt,
    stream: false,
    think: false,
    options: { temperature: 0.1, num_predict: 300, top_p: 0.9, repeat_penalty: 1.1 },
  };
  if (useFormat) body.format = FORMAT_SCHEMA;

  try {
    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000),
    });
    const data = await resp.json();
    const elapsed = Date.now() - start;
    const text = data.response || '';

    let parsed;
    try {
      // Try direct parse first
      parsed = JSON.parse(text.trim());
    } catch (e) {
      // Try to extract JSON from text
      const match = text.match(/\{[^{}]*"domain"[^{}]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else return { domain: null, summary: '', elapsed_ms: elapsed, parse_error: true, raw: text.slice(0, 200) };
    }

    return { domain: parsed.domain || null, summary: parsed.summary || '', elapsed_ms: elapsed, parse_error: false };
  } catch (e) {
    return { domain: null, summary: '', elapsed_ms: Date.now() - start, error: e.message };
  }
}

async function prewarm(model, useFormat) {
  console.log(`Pre-warming ${model}...`);
  const s = Date.now();
  // Simple warmup — no format schema, trivial prompt
  await callOllama(model, 'Return: {"domain": null, "summary": "test"}', false);
  console.log(`  Warmed in ${((Date.now() - s) / 1000).toFixed(1)}s`);
  // Second call to ensure model is hot
  await callOllama(model, 'Return: {"domain": "health", "summary": "test data"}', useFormat);
  console.log(`  Hot call verified`);
}

async function runModel(model, testRecords, useFormat) {
  console.log(`\n=== ${model} (format=${useFormat}) on ${testRecords.length} records ===`);
  await prewarm(model, useFormat);

  const results = [];
  for (let i = 0; i < testRecords.length; i++) {
    const { index, record } = testRecords[i];
    const prompt = buildPrompt(record);
    const result = await callOllama(model, prompt, useFormat);

    results.push({
      record_index: index,
      input_name: (record.name || '').slice(0, 60),
      input_domain: record.domain,
      model_domain: result.domain,
      model_summary: result.summary,
      elapsed_ms: result.elapsed_ms,
      parse_error: result.parse_error || false,
      error: result.error || null,
      raw: result.raw || null,
    });

    const match = result.domain === record.domain ? '✓' : '·';
    const dm = result.domain || 'null';
    console.log(`  [${i + 1}/50] ${(result.elapsed_ms / 1000).toFixed(1)}s ${match} ${dm.padEnd(18)} ${(record.name || '').slice(0, 35)}`);
  }
  return results;
}

function stats(results, gt) {
  const t = results.map(r => r.elapsed_ms).sort((a, b) => a - b);
  let correct = 0, fmtOk = 0;
  for (const r of results) {
    if (!r.parse_error && !r.error) fmtOk++;
    const truth = gt[r.record_index] || r.input_domain;
    if (r.model_domain === truth) correct++;
  }
  return {
    domain_accuracy: (correct / results.length * 100).toFixed(1) + '%',
    format_compliance: (fmtOk / results.length * 100).toFixed(1) + '%',
    median_ms: t[Math.floor(t.length / 2)],
    p95_ms: t[Math.floor(t.length * 0.95)],
    mean_ms: Math.round(t.reduce((s, v) => s + v, 0) / t.length),
    total_s: (t.reduce((s, v) => s + v, 0) / 1000).toFixed(1),
    extrapolated_200k_hrs: (t.reduce((s, v) => s + v, 0) / t.length / 1000 * 200000 / 3600).toFixed(1),
  };
}

async function main() {
  const allLines = fs.readFileSync(INPUT_FILE, 'utf8').trim().split('\n');
  const testRecords = selectTestRecords(allLines);

  const gt = {};
  try {
    fs.readFileSync('D:/Projects/wa-data-catalog/schemas/llm-enrichment-output.jsonl', 'utf8')
      .trim().split('\n').forEach((l, i) => { try { gt[i] = JSON.parse(l).domain; } catch (e) {} });
  } catch (e) {}

  // Model A: Gemma with format schema
  const rA = await runModel('gemma4:e2b', testRecords, true);
  const sA = stats(rA, gt);

  // Model B: Qwen WITHOUT format schema (it hangs with format)
  const rB = await runModel('qwen3.5:9b', testRecords, false);
  const sB = stats(rB, gt);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ model_a: { name: 'gemma4:e2b', stats: sA, results: rA }, model_b: { name: 'qwen3.5:9b', stats: sB, results: rB } }, null, 2));

  console.log('\n' + '='.repeat(55));
  console.log('                    Gemma 4 E2B    Qwen 3.5 9B');
  console.log('-'.repeat(55));
  console.log(`Domain accuracy     ${sA.domain_accuracy.padEnd(15)}${sB.domain_accuracy}`);
  console.log(`Format compliance   ${sA.format_compliance.padEnd(15)}${sB.format_compliance}`);
  console.log(`Median latency      ${(sA.median_ms + 'ms').padEnd(15)}${sB.median_ms}ms`);
  console.log(`P95 latency         ${(sA.p95_ms + 'ms').padEnd(15)}${sB.p95_ms}ms`);
  console.log(`Total time          ${(sA.total_s + 's').padEnd(15)}${sB.total_s}s`);
  console.log(`200K estimate       ${(sA.extrapolated_200k_hrs + 'h').padEnd(15)}${sB.extrapolated_200k_hrs}h`);
  console.log('='.repeat(55));
}

main().catch(err => { console.error(err); process.exit(1); });
