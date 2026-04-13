// Data Catalog Search API

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve('../data');
const FINAL_DIR = path.resolve('../../schemas/final');
const PORT = 3001;

let metadata = [];
let embeddings = null;
let DIM = 0;
let totalRecords = 0;
let dedupIndex = {};
let idToFileIndex = {};

const FACET_KEYS = ['domain', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform'];
const SCORE_THRESHOLD = 0.58; // minimum cosine similarity to count as a "match"

function loadIndex() {
  console.log('Loading index...');

  const info = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index-info.json'), 'utf8'));
  DIM = info.dim;

  const metaLines = fs.readFileSync(path.join(DATA_DIR, 'metadata.jsonl'), 'utf8').trim().split('\n');
  metadata = metaLines.filter(l => l.trim()).map(l => {
    try { return JSON.parse(l); } catch { return null; }
  }).filter(Boolean);
  totalRecords = metadata.length;
  console.log(`  Metadata: ${totalRecords} records`);

  for (let i = 0; i < metadata.length; i++) {
    if (metadata[i].id) idToFileIndex[metadata[i].id] = { source: metadata[i].source, idx: i };
  }

  const embBuffer = fs.readFileSync(path.join(DATA_DIR, 'embeddings.bin'));
  if (embBuffer.length < totalRecords * DIM * 4) {
    totalRecords = Math.floor(embBuffer.length / (DIM * 4));
    metadata = metadata.slice(0, totalRecords);
  }

  embeddings = new Float32Array(embBuffer.buffer, embBuffer.byteOffset, totalRecords * DIM);
  console.log(`  Embeddings: ${totalRecords} x ${DIM} (${(embBuffer.length / 1024 / 1024).toFixed(1)} MB)`);

  global.norms = new Float32Array(totalRecords);
  for (let i = 0; i < totalRecords; i++) {
    let sum = 0;
    const offset = i * DIM;
    for (let j = 0; j < DIM; j++) sum += embeddings[offset + j] ** 2;
    global.norms[i] = Math.sqrt(sum);
  }

  const dedupPath = path.join(DATA_DIR, 'dedup-metadata.json');
  if (fs.existsSync(dedupPath)) {
    dedupIndex = JSON.parse(fs.readFileSync(dedupPath, 'utf8'));
    const dupeCount = Object.values(dedupIndex).filter(v => v.duplicate_of).length;
    console.log(`  Dedup: ${dupeCount} duplicates filtered`);
  }

  console.log(`Index loaded: ${totalRecords} records ready.`);
}

async function getQueryEmbedding(query) {
  const resp = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'nomic-embed-text', input: [query] }),
    signal: AbortSignal.timeout(10000),
  });
  if (!resp.ok) throw new Error('Ollama embedding failed');
  const data = await resp.json();
  return new Float32Array(data.embeddings[0]);
}

function passesFilter(m, filters, skipKey) {
  for (const key of FACET_KEYS) {
    if (key === skipKey) continue;
    if (filters[key] && m[key] !== filters[key]) return false;
  }
  return true;
}

function keywordOverlap(query, record) {
  const qWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (qWords.size === 0) return 0;
  const rText = ((record.name || '') + ' ' + (record.summary || '')).toLowerCase();
  let hits = 0;
  for (const w of qWords) {
    if (rText.includes(w)) hits++;
  }
  return hits / qWords.size;
}

function search(queryEmb, topK, filters, queryText) {
  let qNorm = 0;
  for (let j = 0; j < DIM; j++) qNorm += queryEmb[j] ** 2;
  qNorm = Math.sqrt(qNorm);

  // Step 1: Score all non-duplicate records
  const scores = new Float32Array(totalRecords);
  for (let i = 0; i < totalRecords; i++) {
    if (metadata[i].id && dedupIndex[metadata[i].id]?.duplicate_of) continue;
    let dot = 0;
    const offset = i * DIM;
    for (let j = 0; j < DIM; j++) dot += queryEmb[j] * embeddings[offset + j];
    let cosine = dot / (qNorm * global.norms[i] + 1e-10);

    // Boost score based on keyword overlap (30% weight)
    if (queryText) {
      const kwBoost = keywordOverlap(queryText, metadata[i]);
      cosine = cosine * 0.7 + kwBoost * 0.3;
    }

    scores[i] = cosine;
  }

  // Step 2: Get all records above threshold (the "matching" set)
  const matchingIndices = [];
  for (let i = 0; i < totalRecords; i++) {
    if (scores[i] >= SCORE_THRESHOLD) matchingIndices.push(i);
  }

  // Step 3: Compute facet counts from matching set
  // For each facet key, count values considering all OTHER active filters
  const facets = {};
  for (const key of FACET_KEYS) {
    const counts = {};
    for (const i of matchingIndices) {
      const m = metadata[i];
      if (!passesFilter(m, filters, key)) continue;
      const val = m[key] || 'unknown';
      if (val === 'unknown') continue;
      counts[val] = (counts[val] || 0) + 1;
    }
    facets[key] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }

  // Step 4: Apply ALL filters to get final result set
  const filteredIndices = matchingIndices.filter(i => passesFilter(metadata[i], filters));

  // Step 5: Sort by score and return top K
  filteredIndices.sort((a, b) => scores[b] - scores[a]);

  const results = filteredIndices.slice(0, topK).map(i => {
    const r = { score: scores[i], ...metadata[i] };
    const dedupInfo = dedupIndex[r.id];
    if (dedupInfo?.duplicates) {
      r.also_available = dedupInfo.duplicates.map(d => ({ source: d.source?.replace('.jsonl', ''), url: d.url }));
    }
    return r;
  });

  return {
    totalMatching: matchingIndices.length,
    totalFiltered: filteredIndices.length,
    results,
    facets,
  };
}

function getFullRecord(id) {
  const ref = idToFileIndex[id];
  if (!ref) return null;
  const filepath = path.join(FINAL_DIR, ref.source);
  if (!fs.existsSync(filepath)) return null;
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line);
      if (r.id === id) return r;
    } catch {}
  }
  return null;
}

// Compute global facet counts (no query, no filters) for the landing page
function getGlobalFacets() {
  const facets = {};
  for (const key of FACET_KEYS) {
    const counts = {};
    for (const m of metadata) {
      if (m.id && dedupIndex[m.id]?.duplicate_of) continue;
      const val = m[key] || 'unknown';
      if (val === 'unknown') continue;
      counts[val] = (counts[val] || 0) + 1;
    }
    facets[key] = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([value, count]) => ({ value, count }));
  }
  return facets;
}

let cachedGlobalFacets = null;

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/search', async (req, res) => {
  const { q, limit = 40, ...filterParams } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });

  try {
    const queryEmb = await getQueryEmbedding(q);
    const filters = {};
    for (const key of FACET_KEYS) {
      if (filterParams[key]) filters[key] = filterParams[key];
    }

    const { totalMatching, totalFiltered, results, facets } = search(queryEmb, Math.min(parseInt(limit) || 40, 200), filters, q);
    res.json({ query: q, totalMatching, totalFiltered, count: results.length, results, facets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/filters', (req, res) => {
  if (!cachedGlobalFacets) cachedGlobalFacets = getGlobalFacets();
  res.json(cachedGlobalFacets);
});

app.get('/api/dataset/:id', (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const full = getFullRecord(id);
  if (!full) return res.status(404).json({ error: 'Dataset not found' });
  const dedupInfo = dedupIndex[id];
  const also_available = dedupInfo?.duplicates?.map(d => ({ source: d.source?.replace('.jsonl', ''), url: d.url })) || [];
  res.json({ ...full, also_available });
});

app.get('/api/stats', (req, res) => {
  const dupeCount = Object.values(dedupIndex).filter(v => v.duplicate_of).length;
  res.json({ totalRecords, uniqueRecords: totalRecords - dupeCount, duplicatesFiltered: dupeCount });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', records: totalRecords });
});

try {
  loadIndex();
  app.listen(PORT, () => console.log(`Search API at http://localhost:${PORT}`));
} catch (e) {
  console.error('Failed:', e.message);
  process.exit(1);
}
