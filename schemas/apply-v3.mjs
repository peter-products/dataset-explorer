import fs from 'fs';
import path from 'path';
import readline from 'readline';

const SCHEMAS_DIR = 'D:/Projects/wa-data-catalog/schemas';
const ENRICHED = path.join(SCHEMAS_DIR, 'enriched');
const FINAL = path.join(SCHEMAS_DIR, 'final');
const BATCHES = path.join(SCHEMAS_DIR, 'sonnet-batches-v3');
const BACKFILL = path.join(SCHEMAS_DIR, 'backfill-columns.jsonl');

const LABELS = {
  health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
  environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
  elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics',
  natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
  energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use'
};

if (!fs.existsSync(FINAL)) fs.mkdirSync(FINAL, { recursive: true });

// 1. Build sonnet lookup: slug -> (lineId -> { domain, summary })
const sonnetBySlug = {};
for (const f of fs.readdirSync(BATCHES)) {
  const m = f.match(/^results-batch-\d+-(.+)\.json$/);
  if (!m) continue;
  const slug = m[1];
  const arr = JSON.parse(fs.readFileSync(path.join(BATCHES, f), 'utf8'));
  if (!sonnetBySlug[slug]) sonnetBySlug[slug] = {};
  for (const r of arr) {
    if (r.i != null && r.domain) sonnetBySlug[slug][r.i] = r;
  }
}
console.log('Sonnet slugs loaded:', Object.keys(sonnetBySlug).length);

// 2. Build canada backfill lookup: uuid -> { columns, source_url }
const canadaBackfill = {};
{
  const rl = readline.createInterface({ input: fs.createReadStream(BACKFILL) });
  for await (const line of rl) {
    if (!line.trim()) continue;
    const d = JSON.parse(line);
    if (d.uuid && d.columns?.length) canadaBackfill[d.uuid] = d;
  }
}
console.log('Canada backfill entries:', Object.keys(canadaBackfill).length);

// 3. Process each enriched file
const enrichedFiles = fs.readdirSync(ENRICHED).filter(f => f.endsWith('.jsonl'));
let totalApplied = 0, totalColsAdded = 0, totalFiles = 0;

for (const file of enrichedFiles) {
  const slug = file.replace(/\.jsonl$/, '');
  const sonnet = sonnetBySlug[slug] || {};
  const inPath = path.join(ENRICHED, file);
  const outPath = path.join(FINAL, file);

  const lines = fs.readFileSync(inPath, 'utf8').trim().split('\n');
  const out = [];
  let applied = 0, colsAdded = 0;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) { continue; }
    let record;
    try { record = JSON.parse(lines[i]); } catch (e) { console.warn(`  skip malformed line in ${file}:${i}`); continue; }
    const s = sonnet[i];

    if (s && s.domain) {
      record.domain = s.domain;
      record.hierarchy = record.hierarchy || {};
      record.hierarchy.continent = s.domain;
      record.hierarchy.continent_label = LABELS[s.domain] || s.domain;
      if (s.summary) {
        record.semantic_description = s.summary;
      }
      record.llm_enriched = true;
      record.enrichment_model = 'sonnet';
      applied++;
    }

    // Canada column backfill
    if ((!record.columns || record.columns.length === 0) && typeof record.id === 'string') {
      const idStr = record.id.startsWith('canada:') ? record.id.slice('canada:'.length) : record.id;
      const bf = canadaBackfill[idStr];
      if (bf && bf.columns?.length) {
        record.columns = bf.columns;
        record.column_count = bf.columns.length;
        if (bf.source_url) record.documentation_url = record.documentation_url || bf.source_url;
        record.columns_source = 'csv_header_peek';
        colsAdded++;
      }
    }

    // Rebuild embedding_text if sonnet summary present
    if (s?.summary) {
      const parts = [
        s.summary,
        'Published by: ' + (record.hierarchy?.planet_label || record.publisher_normalized || record.publisher || 'Unknown'),
        'Category: ' + (LABELS[record.domain] || record.domain || 'unknown'),
        'Geography: ' + (record.geographic_detail || record.geographic_scope || 'varies')
      ];
      const colNames = (record.columns || []).slice(0, 20).map(c => c.name);
      if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
      record.embedding_text = parts.join('\n');
    }

    out.push(JSON.stringify(record));
  }

  fs.writeFileSync(outPath, out.join('\n') + '\n');
  totalApplied += applied;
  totalColsAdded += colsAdded;
  totalFiles++;
  if (applied || colsAdded) console.log(`  ${file}: sonnet=${applied} cols+=${colsAdded} total=${lines.length}`);
}

console.log(`\nDone. Files: ${totalFiles}, sonnet applied: ${totalApplied}, columns added: ${totalColsAdded}`);
