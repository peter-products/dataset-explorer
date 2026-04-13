// Generate embeddings for all 200K records using Ollama nomic-embed-text
// Outputs a binary file of float32 vectors + a metadata JSON index
// Usage: node generate-embeddings.mjs

import fs from 'fs';
import path from 'path';

const FINAL_DIR = '../../schemas/final';
const OUTPUT_DIR = '../data';
const OLLAMA_URL = 'http://localhost:11434/api/embed';
const MODEL = 'nomic-embed-text';
const BATCH_SIZE = 50; // Ollama supports batch embedding
const CHECKPOINT_FILE = path.join(OUTPUT_DIR, 'embedding-checkpoint.json');

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')); }
  catch { return { processedFiles: [], totalRecords: 0 }; }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp));
}

async function getEmbeddings(texts) {
  const resp = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, input: texts }),
    signal: AbortSignal.timeout(120000),
  });
  if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);
  const data = await resp.json();
  return data.embeddings;
}

async function main() {
  // Check Ollama is running
  try {
    await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(3000) });
  } catch {
    console.error('Ollama not running. Start it first.');
    process.exit(1);
  }

  // Get dimension size from a test embedding
  console.log('Testing embedding model...');
  const testEmb = await getEmbeddings(['test']);
  const DIM = testEmb[0].length;
  console.log(`Model: ${MODEL}, dimensions: ${DIM}`);

  const cp = loadCheckpoint();
  const doneFiles = new Set(cp.processedFiles);

  // Collect all records from final files
  const files = fs.readdirSync(FINAL_DIR).filter(f => f.endsWith('.jsonl')).sort();
  const pendingFiles = files.filter(f => !doneFiles.has(f));

  console.log(`Files: ${files.length} total, ${pendingFiles.length} pending`);

  // Open output files in append mode
  const metaPath = path.join(OUTPUT_DIR, 'metadata.jsonl');
  const embPath = path.join(OUTPUT_DIR, 'embeddings.bin');

  // If starting fresh, create files
  if (cp.totalRecords === 0) {
    fs.writeFileSync(metaPath, '');
    fs.writeFileSync(embPath, Buffer.alloc(0));
    // Write header with dimension info
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index-info.json'), JSON.stringify({ dim: DIM, model: MODEL, created: new Date().toISOString() }));
  }

  const metaFd = fs.openSync(metaPath, 'a');
  const embFd = fs.openSync(embPath, 'a');

  let totalProcessed = cp.totalRecords;
  const startTime = Date.now();

  for (const file of pendingFiles) {
    const lines = fs.readFileSync(path.join(FINAL_DIR, file), 'utf8').trim().split('\n').filter(l => l.trim());
    const records = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    // Process in batches
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const texts = batch.map(r => {
        // Use embedding_text if available, otherwise construct one
        if (r.embedding_text && r.embedding_text.length > 20) return r.embedding_text.slice(0, 2000);
        const parts = [r.name || '', r.semantic_description || '', r.publisher_normalized || r.provider || ''];
        return parts.filter(Boolean).join('. ').slice(0, 2000);
      });

      try {
        const embeddings = await getEmbeddings(texts);

        for (let j = 0; j < batch.length; j++) {
          const r = batch[j];
          // Write metadata line
          const meta = {
            id: r.id,
            name: r.name,
            domain: r.domain,
            summary: r.semantic_description,
            publisher: r.publisher_normalized || r.provider,
            url: r.url,
            source: file,
            format: r.format,
            geographic_scope: r.geographic_scope,
            hierarchy: r.hierarchy ? { galaxy: r.hierarchy.galaxy_label, system: r.hierarchy.solar_system_label, planet: r.hierarchy.planet_label } : null,
          };
          fs.writeSync(metaFd, JSON.stringify(meta) + '\n');

          // Write embedding as float32 binary
          const buf = Buffer.alloc(DIM * 4);
          for (let k = 0; k < DIM; k++) {
            buf.writeFloatLE(embeddings[j][k], k * 4);
          }
          fs.writeSync(embFd, buf);
          totalProcessed++;
        }
      } catch (e) {
        console.error(`\n  Error in ${file} batch ${i}: ${e.message}`);
        // Skip this batch, continue
        continue;
      }
    }

    cp.processedFiles.push(file);
    cp.totalRecords = totalProcessed;
    saveCheckpoint(cp);

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = totalProcessed / elapsed;
    const remaining = pendingFiles.length - cp.processedFiles.length;
    process.stdout.write(`\r✓ ${file} | ${totalProcessed} records | ${rate.toFixed(0)}/s | ~${remaining} files left    `);
  }

  fs.closeSync(metaFd);
  fs.closeSync(embFd);

  console.log(`\n\nDone! ${totalProcessed} records embedded.`);
  console.log(`  Metadata: ${metaPath}`);
  console.log(`  Embeddings: ${embPath} (${(fs.statSync(embPath).size / 1024 / 1024).toFixed(1)} MB)`);

  // Update index info
  const info = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'index-info.json'), 'utf8'));
  info.totalRecords = totalProcessed;
  info.files = files.length;
  info.completed = new Date().toISOString();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index-info.json'), JSON.stringify(info, null, 2));
}

main().catch(e => { console.error(e.message); process.exit(1); });
