// LLM-based enrichment using local Ollama (Qwen 3 8B or gemma4:e2b)
// Runs on local GPU — free, no API key needed
// Usage: node llm-enrich-ollama.mjs [start] [count] [model]
import fs from 'fs';

const INPUT = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-sample.jsonl';
const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-output.jsonl';
const COST_LOG = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-costs.json';

const startIdx = parseInt(process.argv[2] || '0');
const count = parseInt(process.argv[3] || '500');
const model = process.argv[4] || 'qwen3:8b';

const OLLAMA_URL = 'http://localhost:11434/api/generate';

const VALID_DOMAINS = ['health', 'education', 'transportation', 'environment', 'finance', 'public_safety', 'elections', 'labor', 'demographics', 'natural_resources', 'technology', 'legal', 'energy', 'agriculture', 'housing'];

function buildPrompt(record) {
  const cols = (record.columns || []).slice(0, 12).map(c => {
    let s = c.name;
    if (c.description) s += `: ${c.description.slice(0, 40)}`;
    return s;
  }).join(', ');

  const parts = [`Name: ${record.name || 'Unknown'}`];
  if (record.publisher_normalized) parts.push(`Publisher: ${record.publisher_normalized}`);
  if (record.description && record.description.length > 10) parts.push(`Description: ${record.description.slice(0, 200)}`);
  if (cols) parts.push(`Columns: ${cols}`);
  if (record.tags?.length) parts.push(`Tags: ${record.tags.slice(0, 6).join(', ')}`);

  return `Classify this dataset. Return JSON only: {"domain":"<one of: ${VALID_DOMAINS.join('|')}>","summary":"<1-2 sentence description>"}\n\n${parts.join('\n')}`;
}

async function callOllama(prompt) {
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.1, num_predict: 150 },
        // Use think:false for Qwen3 to avoid thinking tokens
        ...(model.startsWith('qwen3') ? { options: { temperature: 0.1, num_predict: 150 }, think: false } : {}),
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    const data = await res.json();
    const text = data.response || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[^{}]*"domain"[^{}]*"summary"[^{}]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Try to parse the whole response
    try { return JSON.parse(text.trim()); } catch (e) {}

    return { domain: 'unknown', summary: '' };
  } catch (e) {
    return { domain: 'unknown', summary: '', error: e.message };
  }
}

async function main() {
  // Check Ollama is running
  try {
    const check = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(5000) });
    const data = await check.json();
    const models = (data.models || []).map(m => m.name);
    console.log(`Ollama models available: ${models.join(', ')}`);
    if (!models.some(m => m.startsWith(model.split(':')[0]))) {
      console.log(`WARNING: Model ${model} not found. Available: ${models.join(', ')}`);
    }
  } catch (e) {
    console.error('Ollama is not running! Start it with: ollama serve');
    process.exit(1);
  }

  const allLines = fs.readFileSync(INPUT, 'utf8').trim().split('\n');
  const lines = allLines.slice(startIdx, startIdx + count);
  console.log(`Processing records ${startIdx} to ${startIdx + lines.length} of ${allLines.length} using ${model}`);

  let processed = 0;
  let successful = 0;
  const startTime = Date.now();
  const CONCURRENCY = 1; // Ollama is single-threaded on GPU

  const outputStream = fs.createWriteStream(OUTPUT, { flags: 'a' });

  for (let i = 0; i < lines.length; i++) {
    const record = JSON.parse(lines[i]);
    const prompt = buildPrompt(record);
    const result = await callOllama(prompt);

    if (result.domain && VALID_DOMAINS.includes(result.domain)) {
      record.domain = result.domain;
      record.hierarchy.continent = result.domain;
      const labels = { health: 'Health & Medicine', education: 'Education', transportation: 'Transportation', environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety', elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics', natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory', energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use' };
      record.hierarchy.continent_label = labels[result.domain] || result.domain;
      successful++;
    }

    if (result.summary && result.summary.length > 20) {
      record.semantic_description = result.summary;
      const parts = [result.summary, `Published by: ${record.hierarchy.planet_label}`, `Category: ${record.hierarchy.continent_label}`, `Geography: ${record.geographic_detail || record.geographic_scope || 'varies'}`];
      const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
      if (colNames.length) parts.push(`Columns: ${colNames.join(', ')}`);
      record.embedding_text = parts.join('\n');
    }

    record.llm_enriched = true;
    record.llm_model = model;
    outputStream.write(JSON.stringify(record) + '\n');
    processed++;

    if (processed % 50 === 0 || i === lines.length - 1) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = (lines.length - processed) / rate;
      console.log(`  ${processed}/${lines.length} | ${rate.toFixed(1)} rec/s | ${elapsed.toFixed(0)}s elapsed | ~${remaining.toFixed(0)}s remaining | ${successful} classified`);
    }
  }

  outputStream.end();

  const elapsed = (Date.now() - startTime) / 1000;
  console.log(`\n=== Ollama Enrichment Complete ===`);
  console.log(`Records: ${processed} in ${elapsed.toFixed(1)}s (${(processed/elapsed).toFixed(1)} rec/s)`);
  console.log(`Successfully classified: ${successful}/${processed}`);
  console.log(`Extrapolated 200K: ${((elapsed/processed) * 200000 / 3600).toFixed(1)} hours`);

  // Save timing data
  let costLog = [];
  try { costLog = JSON.parse(fs.readFileSync(COST_LOG, 'utf8')); } catch (e) {}
  costLog.push({
    model,
    records_processed: processed,
    successful_classifications: successful,
    elapsed_seconds: elapsed,
    records_per_second: processed / elapsed,
    extrapolated_200k_hours: (elapsed / processed) * 200000 / 3600,
    cost: 0,
    timestamp: new Date().toISOString(),
  });
  fs.writeFileSync(COST_LOG, JSON.stringify(costLog, null, 2));
}

main().catch(err => { console.error(err.message); process.exit(1); });