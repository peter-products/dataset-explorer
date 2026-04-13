// Generate embeddings using @xenova/transformers (no Ollama needed)
// Uses all-MiniLM-L6-v2 (384-dim, runs on CPU, ~50 embeddings/sec)

import fs from 'fs';
import path from 'path';
import { pipeline } from '@xenova/transformers';

const FINAL_DIR = path.resolve('../../schemas/final');
const OUTPUT_DIR = path.resolve('../data');
const CHECKPOINT_FILE = path.join(OUTPUT_DIR, 'embedding-checkpoint.json');
const BATCH_SIZE = 64;
const MODEL = 'Xenova/all-MiniLM-L6-v2';

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')); }
  catch { return { processedFiles: [], totalRecords: 0 }; }
}

function saveCheckpoint(cp) {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(cp));
}

async function main() {
  console.log('Loading embedding model...');
  const embedder = await pipeline('feature-extraction', MODEL, { quantized: true });

  // Get dimension
  const testResult = await embedder('test', { pooling: 'mean', normalize: true });
  const DIM = testResult.dims[1];
  console.log(`Model: ${MODEL}, dim: ${DIM}`);

  const cp = loadCheckpoint();
  const doneFiles = new Set(cp.processedFiles);
  const files = fs.readdirSync(FINAL_DIR).filter(f => f.endsWith('.jsonl')).sort();
  const pendingFiles = files.filter(f => !doneFiles.has(f));

  console.log(`Files: ${files.length} total, ${pendingFiles.length} pending`);

  const metaPath = path.join(OUTPUT_DIR, 'metadata.jsonl');
  const embPath = path.join(OUTPUT_DIR, 'embeddings.bin');

  if (cp.totalRecords === 0) {
    fs.writeFileSync(metaPath, '');
    fs.writeFileSync(embPath, Buffer.alloc(0));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'index-info.json'), JSON.stringify({
      dim: DIM, model: MODEL, created: new Date().toISOString()
    }));
  }

  const metaFd = fs.openSync(metaPath, 'a');
  const embFd = fs.openSync(embPath, 'a');

  let totalProcessed = cp.totalRecords;
  const startTime = Date.now();

  for (const file of pendingFiles) {
    const lines = fs.readFileSync(path.join(FINAL_DIR, file), 'utf8').trim().split('\n').filter(l => l.trim());
    const records = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const texts = batch.map(r => {
        if (r.embedding_text && r.embedding_text.length > 20) return r.embedding_text.slice(0, 512);
        return [r.name || '', r.semantic_description || '', r.publisher_normalized || r.provider || ''].filter(Boolean).join('. ').slice(0, 512);
      });

      try {
        const results = await embedder(texts, { pooling: 'mean', normalize: true });

        for (let j = 0; j < batch.length; j++) {
          const r = batch[j];
          const meta = {
            idx: totalProcessed,
            id: r.id, name: r.name, domain: r.domain,
            summary: r.semantic_description,
            publisher: r.publisher_normalized || r.provider,
            url: r.url, source: file,
            format: Array.isArray(r.format) ? r.format.join(', ') : (r.format || 'unknown'),
            formatType: r.access_method === 'api' || r.source_platform === 'socrata' ? 'api' :
              (r.format || '').toString().toLowerCase().includes('csv') ? 'flat_file' :
              (r.source_platform === 'arcgis' ? 'geospatial' : 'other'),
            geographic_scope: r.geographic_scope || 'unknown',
            geographic_detail: r.geographic_detail || null,
            update_frequency: r.update_frequency || 'unknown',
            freshness: r.freshness || 'unknown',
            last_updated: r.last_updated || null,
            access_method: r.access_method || 'unknown',
            source_platform: r.source_platform || 'unknown',
            api_endpoint: r.api_endpoint || null,
            documentation_url: r.documentation_url || null,
            column_count: r.column_count || (r.columns || []).length || 0,
            columns: (r.columns || []).slice(0, 30).map(c => c.name || c.field_name || '').filter(Boolean),
            tags: (r.tags || []).slice(0, 15),
            hierarchy: r.hierarchy ? {
              galaxy: r.hierarchy.galaxy_label, system: r.hierarchy.solar_system_label,
              planet: r.hierarchy.planet_label, continent: r.hierarchy.continent_label,
            } : null,
          };
          fs.writeSync(metaFd, JSON.stringify(meta) + '\n');

          // Write embedding
          const emb = results[j].data;
          const buf = Buffer.alloc(DIM * 4);
          for (let k = 0; k < DIM; k++) buf.writeFloatLE(emb[k], k * 4);
          fs.writeSync(embFd, buf);
          totalProcessed++;
        }
      } catch (e) {
        console.error(`\n  Error in ${file} batch ${i}: ${e.message}`);
        continue;
      }
    }

    cp.processedFiles.push(file);
    cp.totalRecords = totalProcessed;
    saveCheckpoint(cp);

    const elapsed = (Date.now() - startTime) / 1000;
    const rate = totalProcessed / elapsed;
    process.stdout.write(`\r✓ ${file.padEnd(40)} ${totalProcessed} records | ${rate.toFixed(0)}/s    `);
  }

  fs.closeSync(metaFd);
  fs.closeSync(embFd);

  const info = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'index-info.json'), 'utf8'));
  info.totalRecords = totalProcessed;
  info.completed = new Date().toISOString();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index-info.json'), JSON.stringify(info, null, 2));

  console.log(`\n\nDone! ${totalProcessed} records embedded in ${((Date.now()-startTime)/60000).toFixed(1)} min`);
}

main().catch(e => { console.error(e); process.exit(1); });