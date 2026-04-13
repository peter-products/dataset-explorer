// Sonnet Enrichment Pipeline
// Prepares batch inputs from enriched files for Sonnet classification
// Usage: node sonnet-enrichment.js prepare <filename> [batchSize]
// Usage: node sonnet-enrichment.js apply <filename> <resultsFile>
// Usage: node sonnet-enrichment.js status

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = '.';
const ENRICHED_DIR = path.join(SCHEMAS_DIR, 'enriched');
const FINAL_DIR = path.join(SCHEMAS_DIR, 'final');
const BATCHES_DIR = path.join(SCHEMAS_DIR, 'sonnet-batches');
const CHECKPOINT_FILE = path.join(SCHEMAS_DIR, 'sonnet-checkpoint.json');

const LABELS = {
  health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
  environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
  elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics',
  natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
  energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use'
};

if (!fs.existsSync(FINAL_DIR)) fs.mkdirSync(FINAL_DIR, { recursive: true });
if (!fs.existsSync(BATCHES_DIR)) fs.mkdirSync(BATCHES_DIR, { recursive: true });

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')); }
  catch { return { completed: {}, inProgress: {} }; }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp, null, 2));
}

function formatRecord(r, idx) {
  const name = (r.name || 'Untitled').slice(0, 100);
  const pub = (r.publisher_normalized || r.provider || '').slice(0, 50);
  const desc = (r.description || '').slice(0, 200);
  const cols = (r.columns || []).slice(0, 10).map(c => c.name).join(', ');
  const tags = (r.tags || []).slice(0, 6).join(', ');
  const cat = (r.category || '').slice(0, 50);
  let line = `[${idx}] ${name} | pub=${pub}`;
  if (desc && desc !== 'None' && desc !== 'not_specified') line += ` | desc: ${desc}`;
  if (cols) line += ` | cols: ${cols}`;
  if (tags) line += ` | tags: ${tags}`;
  if (cat) line += ` | cat: ${cat}`;
  return line;
}

function prepare(filename, batchSize = 100) {
  const inputPath = path.join(ENRICHED_DIR, filename);
  if (!fs.existsSync(inputPath)) { console.error('File not found:', inputPath); return; }

  const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n');
  const baseName = filename.replace('.jsonl', '');
  const batches = [];

  for (let i = 0; i < lines.length; i += batchSize) {
    const batch = lines.slice(i, i + batchSize);
    const formatted = batch.map((line, j) => {
      const r = JSON.parse(line);
      return formatRecord(r, i + j);
    });
    const batchFile = path.join(BATCHES_DIR, `${baseName}-batch-${Math.floor(i / batchSize)}.txt`);
    fs.writeFileSync(batchFile, formatted.join('\n'));
    batches.push({ file: batchFile, start: i, end: Math.min(i + batchSize, lines.length), count: formatted.length });
  }

  console.log(`Prepared ${batches.length} batches for ${filename} (${lines.length} records, batch size ${batchSize})`);
  batches.forEach(b => console.log(`  ${path.basename(b.file)}: records ${b.start}-${b.end - 1}`));

  const cp = loadCheckpoint();
  cp.inProgress[filename] = { totalRecords: lines.length, batches: batches.length, batchSize, prepared: new Date().toISOString() };
  saveCheckpoint(cp);
}

function apply(filename, resultsJson) {
  const inputPath = path.join(ENRICHED_DIR, filename);
  const outputPath = path.join(FINAL_DIR, filename);

  const lines = fs.readFileSync(inputPath, 'utf8').trim().split('\n');
  let results;

  // resultsJson can be a file path or inline JSON
  if (fs.existsSync(resultsJson)) {
    results = JSON.parse(fs.readFileSync(resultsJson, 'utf8'));
  } else {
    results = JSON.parse(resultsJson);
  }

  // Build lookup by ID
  const lookup = {};
  for (const r of results) lookup[r.id] = r;

  const output = [];
  let applied = 0, unchanged = 0;

  for (let i = 0; i < lines.length; i++) {
    const record = JSON.parse(lines[i]);
    const enrichment = lookup[i];

    if (enrichment && enrichment.domain) {
      record.domain = enrichment.domain;
      record.hierarchy = record.hierarchy || {};
      record.hierarchy.continent = enrichment.domain;
      record.hierarchy.continent_label = LABELS[enrichment.domain] || enrichment.domain;

      if (enrichment.summary) {
        record.semantic_description = enrichment.summary;
        const parts = [
          enrichment.summary,
          'Published by: ' + (record.hierarchy?.planet_label || record.publisher_normalized || 'Unknown'),
          'Category: ' + (LABELS[enrichment.domain] || enrichment.domain),
          'Geography: ' + (record.geographic_detail || record.geographic_scope || 'varies')
        ];
        const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
        if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
        record.embedding_text = parts.join('\n');
      }

      record.llm_enriched = true;
      record.enrichment_model = 'sonnet';
      applied++;
    } else {
      unchanged++;
    }

    output.push(JSON.stringify(record));
  }

  fs.writeFileSync(outputPath, output.join('\n') + '\n');
  console.log(`✓ ${filename}: ${applied} enriched, ${unchanged} unchanged, ${output.length} total → ${outputPath}`);

  const cp = loadCheckpoint();
  cp.completed[filename] = { records: output.length, enriched: applied, date: new Date().toISOString() };
  delete cp.inProgress[filename];
  saveCheckpoint(cp);
}

function status() {
  const cp = loadCheckpoint();
  const enrichedFiles = fs.readdirSync(ENRICHED_DIR).filter(f => f.endsWith('.jsonl'));
  const finalFiles = new Set(fs.readdirSync(FINAL_DIR).filter(f => f.endsWith('.jsonl')));

  let totalEnriched = 0, totalRemaining = 0, filesRemaining = 0;
  for (const f of enrichedFiles) {
    const count = fs.readFileSync(path.join(ENRICHED_DIR, f), 'utf8').trim().split('\n').length;
    if (cp.completed[f]) {
      totalEnriched += count;
    } else {
      totalRemaining += count;
      filesRemaining++;
    }
  }

  console.log('=== Sonnet Enrichment Status ===');
  console.log(`Completed: ${Object.keys(cp.completed).length} files (${totalEnriched} records)`);
  console.log(`Remaining: ${filesRemaining} files (${totalRemaining} records)`);
  console.log(`In progress: ${Object.keys(cp.inProgress).length} files`);

  if (Object.keys(cp.completed).length > 0) {
    console.log('\nCompleted files:');
    for (const [f, info] of Object.entries(cp.completed)) {
      console.log(`  ✓ ${f}: ${info.records} records (${info.date.slice(0, 10)})`);
    }
  }
  if (Object.keys(cp.inProgress).length > 0) {
    console.log('\nIn progress:');
    for (const [f, info] of Object.entries(cp.inProgress)) {
      console.log(`  ⟳ ${f}: ${info.totalRecords} records, ${info.batches} batches`);
    }
  }
}

const cmd = process.argv[2];
if (cmd === 'prepare') prepare(process.argv[3], parseInt(process.argv[4]) || 100);
else if (cmd === 'apply') apply(process.argv[3], process.argv[4]);
else if (cmd === 'status') status();
else console.log('Usage: node sonnet-enrichment.js [prepare|apply|status] ...');
