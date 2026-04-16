// Dataset Explorer — Search API
// Portable: uses @xenova/transformers for embeddings (no Ollama/GPU needed)

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');

// Simple in-memory rate limiter — no external deps
const RATE_LIMIT = { windowMs: 60_000, maxRequests: 30 }; // 30 requests per minute per IP
const rateLimitStore = new Map();

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = rateLimitStore.get(ip) || { count: 0, resetAt: now + RATE_LIMIT.windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT.windowMs;
  }

  entry.count++;
  rateLimitStore.set(ip, entry);

  res.set('X-RateLimit-Limit', String(RATE_LIMIT.maxRequests));
  res.set('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT.maxRequests - entry.count)));

  if (entry.count > RATE_LIMIT.maxRequests) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 30 requests per minute.' });
  }
  next();
}

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now > entry.resetAt + 60_000) rateLimitStore.delete(ip);
  }
}, 300_000);
const FINAL_DIR = path.resolve(__dirname, '../../schemas/final');
const CLIENT_DIST = path.resolve(__dirname, '../client/dist');
const PORT = process.env.PORT || 3001;

let metadata = [];
let embeddings = null;
let DIM = 0;
let totalRecords = 0;
let dedupIndex = {};
let idToFileIndex = {};
let embedder = null;

const FACET_KEYS = ['domain', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform'];
const SCORE_THRESHOLD = 0.35; // MiniLM has different score range than nomic

// ============ SYNONYM EXPANSION ============

const SYNONYM_GROUPS = [
  ['death', 'mortality', 'fatality', 'decedent', 'deceased', 'dying'],
  ['income', 'revenue', 'earnings', 'salary', 'wages', 'compensation', 'pay'],
  ['housing', 'home', 'residence', 'dwelling', 'apartment', 'rental'],
  ['permit', 'license', 'licence', 'approval', 'authorization'],
  ['crime', 'offense', 'offence', 'criminal', 'felony', 'misdemeanor', 'arrest'],
  ['school', 'education', 'student', 'academic', 'enrollment', 'enrolment'],
  ['hospital', 'clinic', 'medical', 'healthcare', 'health care'],
  ['pollution', 'contamination', 'emission', 'pollutant'],
  ['road', 'street', 'highway', 'roadway', 'pavement'],
  ['job', 'employment', 'occupation', 'workforce', 'worker'],
  ['unemployment', 'jobless', 'unemployed'],
  ['tax', 'taxation', 'levy', 'assessment', 'excise'],
  ['property', 'parcel', 'real estate', 'land'],
  ['water', 'aquatic', 'hydro', 'watershed', 'stream', 'river'],
  ['forest', 'timber', 'woodland', 'forestry', 'silviculture'],
  ['fish', 'salmon', 'fishery', 'fisheries', 'aquaculture'],
  ['election', 'voting', 'ballot', 'voter', 'precinct'],
  ['budget', 'expenditure', 'spending', 'appropriation'],
  ['poverty', 'low-income', 'disadvantaged', 'indigent'],
  ['child', 'children', 'youth', 'juvenile', 'minor', 'kid'],
  ['elderly', 'senior', 'aging', 'aged', 'older adult'],
  ['vehicle', 'car', 'automobile', 'traffic', 'motor'],
  ['bridge', 'overpass', 'crossing', 'span'],
  ['fire', 'wildfire', 'blaze', 'burn', 'arson'],
  ['flood', 'inundation', 'floodplain', 'deluge'],
  ['earthquake', 'seismic', 'quake', 'tremor'],
  ['vaccine', 'vaccination', 'immunization', 'immunisation'],
  ['disease', 'illness', 'infection', 'pathology', 'morbidity'],
  ['agriculture', 'farming', 'crop', 'livestock', 'agricultural'],
  ['energy', 'electricity', 'power', 'electric', 'utility'],
  ['transit', 'bus', 'train', 'subway', 'metro', 'rail'],
  ['park', 'recreation', 'trail', 'open space', 'greenspace'],
  ['waste', 'garbage', 'refuse', 'recycling', 'landfill', 'trash'],
  ['sewer', 'wastewater', 'sewage', 'sanitary'],
  ['zoning', 'land use', 'comprehensive plan', 'urban planning'],
  ['demographic', 'population', 'census', 'headcount'],
  ['airport', 'aviation', 'flight', 'airline'],
  ['bicycle', 'bike', 'cycling', 'cyclist', 'biking'],
];

const synonymLookup = {};
for (const group of SYNONYM_GROUPS) {
  for (const word of group) {
    if (!synonymLookup[word]) synonymLookup[word] = new Set();
    for (const w of group) synonymLookup[word].add(w);
  }
}

function expandQuery(query) {
  const words = query.toLowerCase().split(/\s+/);
  const expanded = new Set(words);
  for (const w of words) {
    if (synonymLookup[w]) for (const syn of synonymLookup[w]) expanded.add(syn);
  }
  return expanded;
}

function keywordOverlap(query, record) {
  const originalWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  if (originalWords.length === 0) return 0;
  const colNames = (record.columns || []).map(c => typeof c === 'string' ? c : (c.name || '')).join(' ');
  const tagStr = (record.tags || []).map(t => typeof t === 'string' ? t : '').join(' ');
  const rText = ((record.name || '') + ' ' + (record.summary || '') + ' ' + colNames + ' ' + tagStr).toLowerCase();
  let hits = 0;
  for (const w of originalWords) {
    if (rText.includes(w)) { hits++; }
    else if (synonymLookup[w]) {
      for (const syn of synonymLookup[w]) { if (rText.includes(syn)) { hits++; break; } }
    }
  }
  return hits / originalWords.length;
}

// ============ INDEX LOADING ============

function loadIndex() {
  console.log('Loading index...');
  const info = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'index-info.json'), 'utf8'));
  DIM = info.dim;
  console.log(`  Model: ${info.model}, dim: ${DIM}`);

  const metaLines = fs.readFileSync(path.join(DATA_DIR, 'metadata.jsonl'), 'utf8').trim().split('\n');
  metadata = metaLines.filter(l => l.trim()).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  totalRecords = metadata.length;

  for (let i = 0; i < metadata.length; i++) {
    if (metadata[i].id) idToFileIndex[metadata[i].id] = { source: metadata[i].source, idx: i };
  }

  const embBuffer = fs.readFileSync(path.join(DATA_DIR, 'embeddings.bin'));
  if (embBuffer.length < totalRecords * DIM * 4) {
    totalRecords = Math.floor(embBuffer.length / (DIM * 4));
    metadata = metadata.slice(0, totalRecords);
  }
  embeddings = new Float32Array(embBuffer.buffer, embBuffer.byteOffset, totalRecords * DIM);
  console.log(`  Embeddings: ${totalRecords} x ${DIM} (${(embBuffer.length / 1024 / 1024).toFixed(0)} MB)`);

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
    console.log(`  Dedup: ${Object.values(dedupIndex).filter(v => v.duplicate_of).length} duplicates filtered`);
  }

  console.log(`Index loaded: ${totalRecords} records`);
}

// ============ EMBEDDING ============

async function initEmbedder() {
  console.log('Loading embedding model...');
  const start = Date.now();
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });
  console.log(`  Embedder ready (${((Date.now()-start)/1000).toFixed(1)}s)`);
}

async function getQueryEmbedding(query) {
  const result = await embedder(query, { pooling: 'mean', normalize: true });
  return new Float32Array(result.data);
}

// ============ SEARCH ============

function passesFilter(m, filters, skipKey) {
  for (const key of FACET_KEYS) {
    if (key === skipKey) continue;
    if (filters[key] && m[key] !== filters[key]) return false;
  }
  // Schema filter: if includeNoSchema is not set, only show records with columns
  if (!filters.includeNoSchema && (!m.columns || m.columns.length === 0)) return false;
  return true;
}

function search(queryEmb, topK, filters, queryText) {
  let qNorm = 0;
  for (let j = 0; j < DIM; j++) qNorm += queryEmb[j] ** 2;
  qNorm = Math.sqrt(qNorm);

  const scores = new Float32Array(totalRecords);
  for (let i = 0; i < totalRecords; i++) {
    if (metadata[i].id && dedupIndex[metadata[i].id]?.duplicate_of) continue;
    let dot = 0;
    const offset = i * DIM;
    for (let j = 0; j < DIM; j++) dot += queryEmb[j] * embeddings[offset + j];
    let cosine = dot / (qNorm * global.norms[i] + 1e-10);
    if (queryText) {
      cosine = cosine * 0.7 + keywordOverlap(queryText, metadata[i]) * 0.3;
    }
    scores[i] = cosine;
  }

  const matchingIndices = [];
  for (let i = 0; i < totalRecords; i++) {
    if (scores[i] >= SCORE_THRESHOLD) matchingIndices.push(i);
  }

  const facets = {};
  for (const key of FACET_KEYS) {
    const counts = {};
    for (const i of matchingIndices) {
      if (!passesFilter(metadata[i], filters, key)) continue;
      const val = metadata[i][key] || 'unknown';
      if (val === 'unknown') continue;
      counts[val] = (counts[val] || 0) + 1;
    }
    facets[key] = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  }

  const filteredIndices = matchingIndices.filter(i => passesFilter(metadata[i], filters));
  filteredIndices.sort((a, b) => scores[b] - scores[a]);

  const results = filteredIndices.slice(0, topK).map(i => {
    const r = { score: scores[i], ...metadata[i] };
    const dedupInfo = dedupIndex[r.id];
    if (dedupInfo?.duplicates) {
      r.also_available = dedupInfo.duplicates.map(d => ({ source: d.source?.replace('.jsonl', ''), url: d.url }));
    }
    return r;
  });

  return { totalMatching: matchingIndices.length, totalFiltered: filteredIndices.length, results, facets };
}

function getFullRecord(id) {
  const ref = idToFileIndex[id];
  if (!ref) return null;
  const filepath = path.join(FINAL_DIR, ref.source);
  if (!fs.existsSync(filepath)) return null;
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try { const r = JSON.parse(line); if (r.id === id) return r; } catch {}
  }
  return null;
}

function getGlobalFacets() {
  const facets = {};
  for (const key of FACET_KEYS) {
    const counts = {};
    for (const m of metadata) {
      if (m.id && dedupIndex[m.id]?.duplicate_of) continue;
      if (!m.columns || m.columns.length === 0) continue; // default: only with schema
      const val = m[key] || 'unknown';
      if (val === 'unknown') continue;
      counts[val] = (counts[val] || 0) + 1;
    }
    facets[key] = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  }
  return facets;
}

// ============ EXPRESS APP ============

const app = express();
app.use(cors());
app.use(express.json());

// Serve static React build if it exists
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
}

// --- Browse by category (curated) ---
let curatedBrowse = {};
try { curatedBrowse = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'curated-browse.json'), 'utf8')); } catch {}

app.get('/api/browse', rateLimit, (req, res) => {
  const { domain, limit = 200 } = req.query;
  if (!domain || !curatedBrowse[domain]) {
    return res.json({ domain, count: 0, results: [], available: Object.keys(curatedBrowse) });
  }
  const indices = curatedBrowse[domain].slice(0, parseInt(limit) || 200);
  const results = indices.map(i => metadata[i]).filter(Boolean).map(m => ({
    ...m,
    score: 1.0,
  }));
  res.json({ domain, count: results.length, results });
});

// --- Human search endpoint ---
app.get('/api/search', rateLimit, async (req, res) => {
  const { q, limit = 40, includeNoSchema, ...filterParams } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter q' });
  try {
    const expanded = expandQuery(q);
    const queryEmb = await getQueryEmbedding([...expanded].join(' '));
    const filters = {};
    for (const key of FACET_KEYS) { if (filterParams[key]) filters[key] = filterParams[key]; }
    if (includeNoSchema === 'true') filters.includeNoSchema = true;
    const { totalMatching, totalFiltered, results, facets } = search(queryEmb, Math.min(parseInt(limit) || 40, 200), filters, q);
    res.json({ query: q, totalMatching, totalFiltered, count: results.length, results, facets });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Agent API (v1) ---
app.get('/api/v1/search', rateLimit, async (req, res) => {
  const { q, limit = 10, domain, format: formatType, geography, platform } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter q', usage: 'GET /api/v1/search?q=your+query' });
  try {
    const expanded = expandQuery(q);
    const queryEmb = await getQueryEmbedding([...expanded].join(' '));
    const filters = {};
    if (domain) filters.domain = domain;
    if (formatType) filters.formatType = formatType;
    if (geography) filters.geographic_scope = geography;
    if (platform) filters.source_platform = platform;

    const { totalMatching, totalFiltered, results } = search(queryEmb, Math.min(parseInt(limit) || 10, 50), filters, q);

    // Agent-friendly response: clean, flat, actionable
    const agentResults = results.map(r => ({
      name: r.name,
      description: r.summary,
      domain: r.domain,
      publisher: r.publisher,
      url: r.url,
      api_endpoint: r.api_endpoint || null,
      format: r.format,
      columns: r.columns || [],
      geographic_scope: r.geographic_scope,
      update_frequency: r.update_frequency,
      relevance_score: Math.round(r.score * 100) / 100,
    }));

    res.json({
      query: q,
      total_matching: totalMatching,
      total_filtered: totalFiltered,
      count: agentResults.length,
      results: agentResults,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- OpenAPI spec for agents ---
app.get('/api/v1/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'Dataset Explorer API',
      description: 'Semantic search across 200K+ public dataset schemas. Find datasets by natural language query.',
      version: '1.0.0',
    },
    servers: [{ url: req.protocol + '://' + req.get('host') }],
    paths: {
      '/api/v1/search': {
        get: {
          operationId: 'searchDatasets',
          summary: 'Search for public datasets using natural language',
          description: 'Returns datasets matching the query, ranked by relevance. Supports filtering by domain, format, geography, and platform.',
          parameters: [
            { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Natural language search query (e.g. "COVID hospitalizations by county")' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 50 }, description: 'Max results to return' },
            { name: 'domain', in: 'query', schema: { type: 'string', enum: ['health', 'education', 'transportation', 'environment', 'finance', 'public_safety', 'elections', 'labor', 'demographics', 'natural_resources', 'technology', 'legal', 'energy', 'agriculture', 'housing'] }, description: 'Filter by domain category' },
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['api', 'flat_file', 'structured', 'geospatial', 'document'] }, description: 'Filter by data format type' },
            { name: 'geography', in: 'query', schema: { type: 'string', enum: ['global', 'us_national', 'wa_state', 'wa_city', 'wa_county'] }, description: 'Filter by geographic scope' },
            { name: 'platform', in: 'query', schema: { type: 'string', enum: ['socrata', 'ckan', 'arcgis', 'bigquery', 'aws', 'huggingface', 'kaggle'] }, description: 'Filter by source platform' },
          ],
          responses: {
            200: {
              description: 'Search results',
              content: { 'application/json': { schema: {
                type: 'object',
                properties: {
                  query: { type: 'string' },
                  total_matching: { type: 'integer' },
                  count: { type: 'integer' },
                  results: { type: 'array', items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      description: { type: 'string' },
                      domain: { type: 'string' },
                      publisher: { type: 'string' },
                      url: { type: 'string', description: 'Link to dataset on source portal' },
                      api_endpoint: { type: 'string', nullable: true, description: 'Direct API URL to query data (if available)' },
                      format: { type: 'string' },
                      columns: { type: 'array', items: { type: 'string' }, description: 'Column names in the dataset schema' },
                      geographic_scope: { type: 'string' },
                      update_frequency: { type: 'string' },
                      relevance_score: { type: 'number' },
                    }
                  }}
                }
              }}}
            }
          }
        }
      }
    }
  });
});

// --- Other endpoints ---
app.get('/api/dataset/:id', (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const full = getFullRecord(id);
  if (!full) return res.status(404).json({ error: 'Dataset not found' });
  const dedupInfo = dedupIndex[id];
  res.json({ ...full, also_available: dedupInfo?.duplicates?.map(d => ({ source: d.source?.replace('.jsonl', ''), url: d.url })) || [] });
});

app.get('/api/filters', (req, res) => {
  res.json(getGlobalFacets());
});

app.get('/api/stats', (req, res) => {
  const dupeCount = Object.values(dedupIndex).filter(v => v.duplicate_of).length;
  res.json({ totalRecords, uniqueRecords: totalRecords - dupeCount, duplicatesFiltered: dupeCount });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', records: totalRecords, model: embedder ? 'loaded' : 'loading' });
});

// --- robots.txt ---
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *
Allow: /
Disallow: /api/
Sitemap: https://schemafinder.com/sitemap-index.xml
`);
});

// --- Sitemap ---
const SITEMAP_LIMIT = 50000;
app.get('/sitemap-index.xml', (req, res) => {
  const count = Math.ceil(totalRecords / SITEMAP_LIMIT);
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (let i = 0; i < count; i++) {
    xml += `  <sitemap><loc>https://schemafinder.com/sitemap-${i}.xml</loc></sitemap>\n`;
  }
  xml += '  <sitemap><loc>https://schemafinder.com/sitemap-pages.xml</loc></sitemap>\n';
  xml += '</sitemapindex>';
  res.type('application/xml').send(xml);
});

app.get('/sitemap-pages.xml', (req, res) => {
  const pages = ['', '/about', '/api-docs'];
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const p of pages) {
    xml += `  <url><loc>https://schemafinder.com${p}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n`;
  }
  xml += '</urlset>';
  res.type('application/xml').send(xml);
});

app.get('/sitemap-:n.xml', (req, res) => {
  const n = parseInt(req.params.n);
  if (isNaN(n)) return res.status(404).send('Not found');
  const start = n * SITEMAP_LIMIT;
  const end = Math.min(start + SITEMAP_LIMIT, totalRecords);
  if (start >= totalRecords) return res.status(404).send('Not found');
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (let i = start; i < end; i++) {
    const m = metadata[i];
    if (!m?.id) continue;
    xml += `  <url><loc>https://schemafinder.com/dataset/${encodeURIComponent(m.id)}</loc><changefreq>monthly</changefreq></url>\n`;
  }
  xml += '</urlset>';
  res.type('application/xml').send(xml);
});

// --- JSON-LD for dataset pages (bot-friendly) ---
app.get('/dataset-jsonld/:id', (req, res) => {
  const id = decodeURIComponent(req.params.id);
  const record = getFullRecord(id);
  if (!record) return res.status(404).json({});
  const jsonld = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: record.name,
    description: record.semantic_description || record.description || record.summary || '',
    url: `https://schemafinder.com/dataset/${encodeURIComponent(id)}`,
    keywords: (record.tags || []).slice(0, 10),
    provider: { '@type': 'Organization', name: record.publisher_normalized || record.publisher || record.provider || 'Unknown' },
    ...(record.geographic_detail || record.geographic_scope ? { spatialCoverage: record.geographic_detail || record.geographic_scope } : {}),
  };
  if (record.url) {
    jsonld.distribution = { '@type': 'DataDownload', contentUrl: record.url };
    if (record.format) jsonld.distribution.encodingFormat = typeof record.format === 'string' ? record.format : record.format.join(', ');
  }
  res.json(jsonld);
});

// Bot detection
const BOT_UA = /Googlebot|bingbot|Baiduspider|yandex|DuckDuckBot|Slurp|Twitterbot|facebookexternalhit|LinkedInBot|Discordbot|Applebot|Pinterestbot/i;

function isBot(req) {
  return BOT_UA.test(req.get('user-agent') || '');
}

function escHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderDatasetHtml(record, id) {
  const name = escHtml(record.name);
  const desc = escHtml((record.semantic_description || record.description || record.summary || '').slice(0, 300));
  const publisher = escHtml(record.publisher_normalized || record.publisher || record.provider || '');
  const domain = escHtml(record.domain || '');
  const url = `https://schemafinder.com/dataset/${encodeURIComponent(id)}`;
  const cols = (record.columns || []).slice(0, 30).map(c => escHtml(c.name)).filter(Boolean);

  const jsonld = {
    '@context': 'https://schema.org', '@type': 'Dataset',
    name: record.name, description: record.semantic_description || record.description || record.summary || '',
    url, keywords: (record.tags || []).slice(0, 10),
    provider: { '@type': 'Organization', name: record.publisher_normalized || record.publisher || record.provider || 'Unknown' },
  };
  if (record.geographic_detail || record.geographic_scope) jsonld.spatialCoverage = record.geographic_detail || record.geographic_scope;
  if (record.url) {
    jsonld.distribution = { '@type': 'DataDownload', contentUrl: record.url };
    if (record.format) jsonld.distribution.encodingFormat = typeof record.format === 'string' ? record.format : record.format.join(', ');
  }

  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} — SchemaFinder</title>
<meta name="description" content="${escHtml(desc)}">
<meta property="og:title" content="${name}"><meta property="og:description" content="${escHtml(desc)}">
<meta property="og:url" content="${escHtml(url)}"><meta property="og:type" content="website">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="${name}">
<meta name="twitter:description" content="${escHtml(desc)}">
<link rel="canonical" href="${escHtml(url)}">
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
</head><body>
<h1>${name}</h1>
<p>${desc}</p>
<p>Publisher: ${publisher}</p>
<p>Category: ${domain}</p>
${cols.length ? `<h2>Schema (${cols.length} columns)</h2><ul>${cols.map(c => `<li>${c}</li>`).join('')}</ul>` : ''}
${record.url ? `<p><a href="${escHtml(record.url)}">View on source portal</a></p>` : ''}
<p><a href="https://schemafinder.com">SchemaFinder</a> — Search 200,000+ public dataset schemas</p>
</body></html>`;
}

function renderHomeHtml() {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SchemaFinder — Search 200,000+ Public Dataset Schemas</title>
<meta name="description" content="Find schemas, APIs, and download links from 200,000+ public datasets across government portals, cloud warehouses, and research platforms.">
<meta property="og:title" content="SchemaFinder"><meta property="og:description" content="Search 200,000+ public dataset schemas from 17+ platforms.">
<meta property="og:url" content="https://schemafinder.com"><meta property="og:type" content="website">
<link rel="canonical" href="https://schemafinder.com">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'WebSite', name: 'SchemaFinder',
  url: 'https://schemafinder.com',
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: 'https://schemafinder.com/?q={search_term_string}' }, 'query-input': 'required name=search_term_string' }
})}</script>
</head><body>
<h1>SchemaFinder</h1>
<p>Search 200,000+ public dataset schemas from government portals, cloud warehouses, and research platforms.</p>
<h2>Browse by Category</h2>
<ul><li>Health &amp; Medicine</li><li>Education</li><li>Finance &amp; Economics</li><li>Environment</li><li>Transportation</li><li>Demographics</li></ul>
<p>Free API available at <a href="https://schemafinder.com/api-docs">schemafinder.com/api-docs</a></p>
</body></html>`;
}

// SPA fallback with bot-aware rendering
if (fs.existsSync(CLIENT_DIST)) {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();

    if (isBot(req)) {
      const datasetMatch = req.path.match(/^\/dataset\/(.+)/);
      if (datasetMatch) {
        const id = decodeURIComponent(datasetMatch[1]);
        const record = getFullRecord(id);
        if (record) return res.send(renderDatasetHtml(record, id));
      }
      if (req.path === '/' || req.path === '') {
        return res.send(renderHomeHtml());
      }
    }

    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

// ============ START ============

async function start() {
  try {
    loadIndex();
    await initEmbedder();
    app.listen(PORT, () => {
      console.log(`\nDataset Explorer running at http://localhost:${PORT}`);
      console.log(`  Search: /api/search?q=...`);
      console.log(`  Agent API: /api/v1/search?q=...`);
      console.log(`  OpenAPI spec: /api/v1/openapi.json`);
    });
  } catch (e) {
    console.error('Failed to start:', e.message);
    process.exit(1);
  }
}

start();