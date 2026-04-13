// Add column names and tags to metadata.jsonl for keyword search
// Reads from schemas/final/ and updates metadata in-place

import fs from 'fs';
import path from 'path';

const FINAL_DIR = path.resolve('../../schemas/final');
const META_FILE = path.resolve('../data/metadata.jsonl');

console.log('Loading metadata...');
const lines = fs.readFileSync(META_FILE, 'utf8').trim().split('\n');
console.log(`${lines.length} metadata records`);

// Group metadata indices by source file
const bySource = {};
lines.forEach((l, i) => {
  if (!l.trim()) return;
  const m = JSON.parse(l);
  if (!bySource[m.source]) bySource[m.source] = [];
  bySource[m.source].push({ idx: i, id: m.id });
});

console.log(`${Object.keys(bySource).length} source files`);

// For each source file, load all records and extract columns/tags
let enriched = 0;
const parsed = lines.map(l => l.trim() ? JSON.parse(l) : null);

for (const [source, refs] of Object.entries(bySource)) {
  const filepath = path.join(FINAL_DIR, source);
  if (!fs.existsSync(filepath)) continue;

  // Build id → record lookup for this file
  const lookup = {};
  const slines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
  for (const sl of slines) {
    if (!sl.trim()) continue;
    try {
      const r = JSON.parse(sl);
      lookup[r.id] = r;
    } catch {}
  }

  // Update metadata entries
  for (const ref of refs) {
    const m = parsed[ref.idx];
    if (!m) continue;
    const full = lookup[ref.id];
    if (!full) continue;

    // Add column names (just the names, not full column objects)
    const cols = (full.columns || []).slice(0, 30).map(c => c.name || c.field_name || '').filter(Boolean);
    if (cols.length > 0) m.columns = cols;

    // Add tags
    if (full.tags && full.tags.length > 0) m.tags = full.tags.slice(0, 15);

    enriched++;
  }

  process.stdout.write(`\r${source.padEnd(40)} (${enriched} enriched)`);
}

// Write back
const output = parsed.map(m => m ? JSON.stringify(m) : '').filter(Boolean);
fs.writeFileSync(META_FILE, output.join('\n') + '\n');

console.log(`\n\nDone! Enriched ${enriched} records with column names and tags`);
console.log(`Output: ${output.length} records`);
