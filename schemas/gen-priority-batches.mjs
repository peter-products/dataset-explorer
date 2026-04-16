import fs from 'fs';
import path from 'path';

const FINAL = 'D:/Projects/wa-data-catalog/schemas/final';
const PRIORITY = 'D:/Projects/wa-data-catalog/schemas/sonnet-priority-10k.jsonl';
const OUT_DIR = 'D:/Projects/wa-data-catalog/schemas/sonnet-batches-priority';
const PER_BATCH = 100;

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const targets = fs.readFileSync(PRIORITY, 'utf8').trim().split('\n').map(l => JSON.parse(l));
console.log('Priority targets:', targets.length);

// Cache files (we'll read each once)
const fileCache = {};
function getFile(f) {
  if (!fileCache[f]) fileCache[f] = fs.readFileSync(path.join(FINAL, f), 'utf8').split('\n');
  return fileCache[f];
}

function formatLine(globalIdx, rec) {
  const name = (rec.name || 'Untitled').slice(0, 100);
  const pub = (rec.publisher_normalized || rec.provider || rec.publisher || '').slice(0, 50);
  const desc = (rec.description || '').slice(0, 200);
  const cols = (rec.columns || []).slice(0, 10).map(c => c.name).join(', ');
  const tags = (rec.tags || []).slice(0, 6).join(', ');
  let line = `[${globalIdx}] ${name} | pub=${pub}`;
  if (desc && desc !== 'None') line += ` | desc: ${desc}`;
  if (cols) line += ` | cols: ${cols}`;
  if (tags) line += ` | tags: ${tags}`;
  return line;
}

let batchIdx = 0;
for (let i = 0; i < targets.length; i += PER_BATCH) {
  const chunk = targets.slice(i, i + PER_BATCH);
  const formatted = [];
  for (let j = 0; j < chunk.length; j++) {
    const t = chunk[j];
    const lines = getFile(t.file);
    let rec;
    try { rec = JSON.parse(lines[t.line_idx] || '{}'); } catch { continue; }
    formatted.push(formatLine(i + j, rec));
  }
  const num = String(batchIdx).padStart(4, '0');
  fs.writeFileSync(path.join(OUT_DIR, `batch-${num}.txt`), formatted.join('\n'));
  batchIdx++;
}
console.log(`Wrote ${batchIdx} batches to ${OUT_DIR}`);
