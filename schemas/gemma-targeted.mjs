// Gemma enrichment on targeted records from sonnet-candidates-all.jsonl
// Skips top 10K (reserved for Sonnet), processes next 13K.
// Updates final/ in place. Never touches sonnet-enriched records.

import fs from 'fs';
import path from 'path';

const OLLAMA_URL = 'http://localhost:11434/api/generate';
const MODEL = 'gemma4:e2b';
const FINAL = 'D:/Projects/wa-data-catalog/schemas/final';
const CANDIDATES = 'D:/Projects/wa-data-catalog/schemas/sonnet-candidates-all.jsonl';
const CHECKPOINT = 'D:/Projects/wa-data-catalog/schemas/gemma-targeted-checkpoint.json';
const SKIP_TOP = 10000;
const TARGET_COUNT = 13000;

const VALID_DOMAINS = ['health','education','transportation','environment','finance','public_safety','elections','labor','demographics','natural_resources','technology','legal','energy','agriculture','housing'];

const FORMAT_SCHEMA = {
  type: 'object',
  properties: {
    domain: { type: ['string','null'], enum: [...VALID_DOMAINS, null] },
    summary: { type: 'string' }
  },
  required: ['domain','summary']
};

const LABELS = {
  health:'Health & Medicine', education:'Education', transportation:'Transportation',
  environment:'Environment & Climate', finance:'Finance & Economics', public_safety:'Public Safety',
  elections:'Elections & Politics', labor:'Labor & Employment', demographics:'Demographics',
  natural_resources:'Natural Resources', technology:'Technology', legal:'Legal & Regulatory',
  energy:'Energy', agriculture:'Agriculture & Food', housing:'Housing & Land Use'
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

async function callOllama(prompt) {
  try {
    const resp = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL, prompt, stream: false, think: false,
        format: FORMAT_SCHEMA,
        options: { temperature: 0.1, num_predict: 300, top_p: 0.9, repeat_penalty: 1.1 }
      }),
      signal: AbortSignal.timeout(60000)
    });
    const data = await resp.json();
    return JSON.parse(data.response || '{}');
  } catch { return null; }
}

function buildPrompt(r) {
  const cols = (r.columns || []).slice(0, 12).map(c => c.name).join(', ');
  return PROMPT
    .replace('{name}', (r.name || 'Untitled').slice(0, 100))
    .replace('{publisher}', (r.publisher_normalized || r.provider || 'Unknown').slice(0, 60))
    .replace('{description}', (r.description || 'None').slice(0, 250))
    .replace('{columns}', cols || 'None')
    .replace('{tags}', (r.tags || []).slice(0, 8).join(', ') || 'None');
}

function apply(record, result) {
  if (result?.domain && VALID_DOMAINS.includes(result.domain)) {
    record.domain = result.domain;
    record.hierarchy = record.hierarchy || {};
    record.hierarchy.continent = result.domain;
    record.hierarchy.continent_label = LABELS[result.domain] || result.domain;
  }
  if (result?.summary && result.summary.length > 20) {
    record.semantic_description = result.summary;
    const parts = [
      result.summary,
      'Published by: ' + (record.hierarchy?.planet_label || record.publisher_normalized || 'Unknown'),
      'Category: ' + (LABELS[record.domain] || record.domain || 'unknown'),
      'Geography: ' + (record.geographic_detail || record.geographic_scope || 'varies')
    ];
    const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
    if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
    record.embedding_text = parts.join('\n');
  }
  record.llm_enriched = true;
  record.enrichment_model = 'gemma';
  record.llm_model = MODEL;
  return record;
}

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')); }
  catch { return { processed: 0, by_file: {} }; }
}
function saveCheckpoint(c) { fs.writeFileSync(CHECKPOINT, JSON.stringify(c, null, 2)); }

(async () => {
  // Load candidates, skip top 10K, take next 13K
  const all = fs.readFileSync(CANDIDATES, 'utf8').trim().split('\n').map(l => JSON.parse(l));
  const targets = all.slice(SKIP_TOP, SKIP_TOP + TARGET_COUNT);
  console.log(`Targets: ${targets.length} (skipped top ${SKIP_TOP})`);

  // Group by file
  const byFile = {};
  for (const t of targets) {
    if (!byFile[t.file]) byFile[t.file] = new Set();
    byFile[t.file].add(t.line_idx);
  }
  console.log(`Files to modify: ${Object.keys(byFile).length}`);

  const cp = loadCheckpoint();
  console.log(`Resuming from checkpoint: ${cp.processed} already processed`);

  // Warmup
  console.log('Warming up Gemma...');
  await callOllama('Return {"domain": null, "summary": "warmup"}');
  await callOllama('Return {"domain": "health", "summary": "test"}');
  console.log('Ready.');

  const start = Date.now();
  let total = 0, ok = 0, fail = 0;

  for (const [file, lineSet] of Object.entries(byFile)) {
    const fpath = path.join(FINAL, file);
    const lines = fs.readFileSync(fpath, 'utf8').split('\n');
    const fileKey = file;
    const startIdx = cp.by_file[fileKey] || 0;
    const sortedLines = [...lineSet].sort((a, b) => a - b);

    for (const li of sortedLines) {
      total++;
      if (total <= cp.processed) continue; // skip already done
      const line = lines[li];
      if (!line?.trim()) continue;
      let r; try { r = JSON.parse(line); } catch { continue; }
      if (r.enrichment_model === 'sonnet') continue; // never overwrite sonnet

      const result = await callOllama(buildPrompt(r));
      if (result) { r = apply(r, result); ok++; } else { fail++; }
      lines[li] = JSON.stringify(r);

      if ((ok + fail) % 25 === 0) {
        // persist this file + checkpoint
        fs.writeFileSync(fpath, lines.join('\n'));
        cp.processed = total;
        cp.by_file[fileKey] = li + 1;
        saveCheckpoint(cp);
        const elapsed = (Date.now() - start) / 1000;
        const rate = (ok + fail) / elapsed;
        const eta = (targets.length - total) / rate;
        console.log(`  ${total}/${targets.length} ok=${ok} fail=${fail} rate=${rate.toFixed(2)}/s ETA=${(eta/60).toFixed(0)}m file=${file}`);
      }
    }

    fs.writeFileSync(fpath, lines.join('\n'));
    cp.processed = total;
    cp.by_file[fileKey] = 99999999;
    saveCheckpoint(cp);
  }

  const elapsed = (Date.now() - start) / 1000;
  console.log(`Done. Total ${total}, ok ${ok}, fail ${fail}, ${(elapsed/60).toFixed(1)} min, ${(total/elapsed).toFixed(2)}/s`);
})();
