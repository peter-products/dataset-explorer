// LLM-based enrichment using Claude API via Anthropic SDK
// Processes records in batches, generating semantic descriptions and fixing domain classification
// Usage: node llm-enrich.mjs [start] [count]
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const INPUT = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-sample.jsonl';
const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-output.jsonl';
const COST_LOG = 'D:/Projects/wa-data-catalog/schemas/llm-enrichment-costs.json';

const startIdx = parseInt(process.argv[2] || '0');
const count = parseInt(process.argv[3] || '500');

const client = new Anthropic();

const VALID_DOMAINS = ['health', 'education', 'transportation', 'environment', 'finance', 'public_safety', 'elections', 'labor', 'demographics', 'natural_resources', 'technology', 'legal', 'energy', 'agriculture', 'housing'];

const SYSTEM_PROMPT = `You are a data catalog enrichment assistant. For each dataset schema, you produce a JSON response with:
1. "domain": one of: ${VALID_DOMAINS.join(', ')}
2. "summary": 1-2 sentence description of what this dataset contains and who would use it

Be specific about the actual data content, not generic. If columns are listed, mention what they measure.
Respond with ONLY valid JSON, no markdown or explanation.`;

function buildPrompt(record) {
  const cols = (record.columns || []).slice(0, 15).map(c => {
    let s = c.name;
    if (c.type && c.type !== 'text') s += ` (${c.type})`;
    if (c.description) s += `: ${c.description.slice(0, 60)}`;
    return s;
  }).join(', ');

  const parts = [`Name: ${record.name || 'Unknown'}`];
  if (record.provider) parts.push(`Publisher: ${record.publisher_normalized || record.provider}`);
  if (record.description && record.description.length > 10) parts.push(`Description: ${record.description.slice(0, 300)}`);
  if (cols) parts.push(`Columns: ${cols}`);
  if (record.tags?.length) parts.push(`Tags: ${record.tags.slice(0, 8).join(', ')}`);
  if (record.geographic_detail) parts.push(`Geography: ${record.geographic_detail}`);

  return parts.join('\n');
}

async function enrichBatch(records) {
  // Batch up to 10 records in a single prompt to reduce API calls
  const prompts = records.map((r, i) => `[${i}]\n${buildPrompt(r)}`);
  const batchPrompt = `Classify and describe each dataset. Return a JSON array with one object per dataset, in order.\n\n${prompts.join('\n\n---\n\n')}`;

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: batchPrompt }],
    });

    const text = response.content[0].text;
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;

    // Parse JSON response
    let results;
    try {
      results = JSON.parse(text);
      if (!Array.isArray(results)) results = [results];
    } catch (e) {
      // Try to extract JSON from response
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        results = JSON.parse(match[0]);
      } else {
        console.log('  Parse error, falling back to individual parsing');
        results = records.map(() => ({ domain: 'unknown', summary: '' }));
      }
    }

    return { results, inputTokens, outputTokens };
  } catch (e) {
    console.log('  API error:', e.message);
    return { results: records.map(() => ({ domain: 'unknown', summary: '' })), inputTokens: 0, outputTokens: 0 };
  }
}

async function main() {
  const allLines = fs.readFileSync(INPUT, 'utf8').trim().split('\n');
  const lines = allLines.slice(startIdx, startIdx + count);
  console.log(`Processing records ${startIdx} to ${startIdx + lines.length} of ${allLines.length}`);

  let totalInput = 0;
  let totalOutput = 0;
  let processed = 0;
  const BATCH_SIZE = 10;
  const startTime = Date.now();

  // Append mode
  const outputStream = fs.createWriteStream(OUTPUT, { flags: 'a' });

  for (let i = 0; i < lines.length; i += BATCH_SIZE) {
    const batch = lines.slice(i, i + BATCH_SIZE).map(l => JSON.parse(l));
    const { results, inputTokens, outputTokens } = await enrichBatch(batch);

    totalInput += inputTokens;
    totalOutput += outputTokens;

    // Apply results back to records
    for (let j = 0; j < batch.length; j++) {
      const r = batch[j];
      const enrichment = results[j] || {};

      if (enrichment.domain && VALID_DOMAINS.includes(enrichment.domain)) {
        r.domain = enrichment.domain;
        r.hierarchy.continent = enrichment.domain;
        const labels = { health: 'Health & Medicine', education: 'Education', transportation: 'Transportation', environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety', elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics', natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory', energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use' };
        r.hierarchy.continent_label = labels[enrichment.domain] || enrichment.domain;
      }

      if (enrichment.summary && enrichment.summary.length > 20) {
        r.semantic_description = enrichment.summary;
        // Rebuild embedding text with new description
        const parts = [enrichment.summary, `Published by: ${r.hierarchy.planet_label}`, `Category: ${r.hierarchy.continent_label}`, `Geography: ${r.geographic_detail || r.geographic_scope || 'varies'}`];
        const colNames = (r.columns || []).slice(0, 20).map(c => c.name);
        if (colNames.length) parts.push(`Columns: ${colNames.join(', ')}`);
        r.embedding_text = parts.join('\n');
      }

      r.llm_enriched = true;
      outputStream.write(JSON.stringify(r) + '\n');
    }

    processed += batch.length;

    if (processed % 100 === 0 || i + BATCH_SIZE >= lines.length) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = processed / elapsed;
      const remaining = (lines.length - processed) / rate;
      const costInput = totalInput / 1000000 * 0.80;  // Haiku input price
      const costOutput = totalOutput / 1000000 * 4.00; // Haiku output price
      const totalCost = costInput + costOutput;
      console.log(`  ${processed}/${lines.length} | ${rate.toFixed(1)} rec/s | ${elapsed.toFixed(0)}s elapsed | ~${remaining.toFixed(0)}s remaining | tokens: ${totalInput}in/${totalOutput}out | cost: $${totalCost.toFixed(4)}`);
    }
  }

  outputStream.end();

  const elapsed = (Date.now() - startTime) / 1000;
  const costInput = totalInput / 1000000 * 0.80;
  const costOutput = totalOutput / 1000000 * 4.00;
  const totalCost = costInput + costOutput;

  const costData = {
    records_processed: processed,
    total_input_tokens: totalInput,
    total_output_tokens: totalOutput,
    cost_input: costInput,
    cost_output: costOutput,
    total_cost: totalCost,
    elapsed_seconds: elapsed,
    records_per_second: processed / elapsed,
    cost_per_record: totalCost / processed,
    extrapolated_200k_cost: (totalCost / processed) * 200000,
    timestamp: new Date().toISOString(),
  };

  // Append cost data
  let costLog = [];
  try { costLog = JSON.parse(fs.readFileSync(COST_LOG, 'utf8')); } catch (e) {}
  costLog.push(costData);
  fs.writeFileSync(COST_LOG, JSON.stringify(costLog, null, 2));

  console.log(`\n=== LLM Enrichment Complete ===`);
  console.log(`Records: ${processed} in ${elapsed.toFixed(1)}s`);
  console.log(`Tokens: ${totalInput.toLocaleString()} input, ${totalOutput.toLocaleString()} output`);
  console.log(`Cost: $${totalCost.toFixed(4)} ($${costData.cost_per_record.toFixed(6)}/record)`);
  console.log(`Extrapolated 200K: $${costData.extrapolated_200k_cost.toFixed(2)}`);
}

main().catch(err => { console.error(err.message); process.exit(1); });