// Dataset Explorer — Search API
// Portable: uses @xenova/transformers for embeddings (no Ollama/GPU needed)

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
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

// Community submissions (separate from curated corpus)
let communityMetadata = [];
let communityEmbeddings = []; // array of Float32Array, one per record
let communityNorms = [];
const urlSet = new Set(); // normalized URLs across both corpora, for dedup
const COMMUNITY_META_PATH = () => path.join(DATA_DIR, 'community-metadata.jsonl');
const COMMUNITY_EMB_PATH = () => path.join(DATA_DIR, 'community-embeddings.bin');

const FACET_KEYS = ['domain', 'source_type', 'access', 'price_range', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform'];

// For these facet keys, records that don't have the field get a default value so
// curated records (which have no source_type / access field) still count correctly.
const FACET_DEFAULTS = { source_type: 'curated', access: 'open' };
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

  // Build URL set from curated records (for submission dedup)
  for (const m of metadata) {
    const n = normalizeUrl(m.url);
    if (n) urlSet.add(n);
  }

  console.log(`Index loaded: ${totalRecords} records`);
}

// ============ COMMUNITY INDEX ============

function normalizeUrl(u) {
  if (!u || typeof u !== 'string') return null;
  try {
    const url = new URL(u);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.replace(/\/+$/, '');
    return (host + path).toLowerCase();
  } catch { return null; }
}

function loadCommunityIndex() {
  const metaPath = COMMUNITY_META_PATH();
  const embPath = COMMUNITY_EMB_PATH();
  if (!fs.existsSync(metaPath) || !fs.existsSync(embPath)) {
    console.log('  Community: no existing submissions');
    return;
  }
  const lines = fs.readFileSync(metaPath, 'utf8').trim().split('\n').filter(Boolean);
  communityMetadata = lines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

  const buf = fs.readFileSync(embPath);
  if (buf.length !== communityMetadata.length * DIM * 4) {
    console.warn(`  Community: embedding file size mismatch (${buf.length} bytes, expected ${communityMetadata.length * DIM * 4}). Truncating to match.`);
    const n = Math.min(communityMetadata.length, Math.floor(buf.length / (DIM * 4)));
    communityMetadata = communityMetadata.slice(0, n);
  }
  const flat = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
  for (let i = 0; i < communityMetadata.length; i++) {
    const emb = new Float32Array(DIM);
    for (let j = 0; j < DIM; j++) emb[j] = flat[i * DIM + j];
    let sum = 0; for (let j = 0; j < DIM; j++) sum += emb[j] ** 2;
    communityEmbeddings.push(emb);
    communityNorms.push(Math.sqrt(sum));
    const n = normalizeUrl(communityMetadata[i].url);
    if (n) urlSet.add(n);
  }
  console.log(`  Community: ${communityMetadata.length} submissions loaded`);
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

// Collapse WA-specific geo values into their US-level equivalents. Legacy values
// stem from the site's WA-focused origin; the curated corpus will be re-classified
// over time. Until then, we treat wa_state as us_state (etc.) for filter + facet
// purposes so the sidebar doesn't over-index on Washington.
function normalizeFacetValue(key, value) {
  if (key !== 'geographic_scope' || !value) return value;
  if (value === 'wa_state') return 'us_state';
  if (value === 'wa_city') return 'us_city';
  if (value === 'wa_county') return 'us_county';
  return value;
}

function passesFilter(m, filters, skipKey) {
  for (const key of FACET_KEYS) {
    if (key === skipKey) continue;
    if (filters[key]) {
      const raw = m[key] ?? FACET_DEFAULTS[key];
      if (raw !== filters[key] && normalizeFacetValue(key, raw) !== filters[key]) return false;
    }
  }
  // Schema filter: if includeNoSchema is not set, only show records with columns
  if (!filters.includeNoSchema && (!m.columns || m.columns.length === 0)) return false;
  return true;
}

// Get record by combined index (curated occupy [0, totalRecords), community after)
function getRecordAt(i) {
  if (i < totalRecords) return metadata[i];
  return communityMetadata[i - totalRecords];
}

function communityIsVisible(c) {
  if (c.admin_status === 'rejected') return false;
  if ((c.flags_count || 0) >= 3 && c.admin_status !== 'approved') return false;
  return true;
}

function search(queryEmb, topK, filters, queryText) {
  let qNorm = 0;
  for (let j = 0; j < DIM; j++) qNorm += queryEmb[j] ** 2;
  qNorm = Math.sqrt(qNorm);

  const COMBINED = totalRecords + communityMetadata.length;
  const scores = new Float32Array(COMBINED);

  // Curated pass
  for (let i = 0; i < totalRecords; i++) {
    if (metadata[i].id && dedupIndex[metadata[i].id]?.duplicate_of) continue;
    let dot = 0;
    const offset = i * DIM;
    for (let j = 0; j < DIM; j++) dot += queryEmb[j] * embeddings[offset + j];
    let cosine = dot / (qNorm * global.norms[i] + 1e-10);
    if (queryText) cosine = cosine * 0.7 + keywordOverlap(queryText, metadata[i]) * 0.3;
    scores[i] = cosine;
  }

  // Community pass
  for (let k = 0; k < communityMetadata.length; k++) {
    const c = communityMetadata[k];
    if (!communityIsVisible(c)) continue;
    const emb = communityEmbeddings[k];
    let dot = 0;
    for (let j = 0; j < DIM; j++) dot += queryEmb[j] * emb[j];
    let cosine = dot / (qNorm * communityNorms[k] + 1e-10);
    if (queryText) cosine = cosine * 0.7 + keywordOverlap(queryText, c) * 0.3;
    scores[totalRecords + k] = cosine;
  }

  const matchingIndices = [];
  for (let i = 0; i < COMBINED; i++) {
    if (scores[i] >= SCORE_THRESHOLD) matchingIndices.push(i);
  }

  const facets = {};
  for (const key of FACET_KEYS) {
    const counts = {};
    for (const i of matchingIndices) {
      const rec = getRecordAt(i);
      if (!passesFilter(rec, filters, key)) continue;
      const raw = rec[key] ?? FACET_DEFAULTS[key];
      const val = normalizeFacetValue(key, raw) || 'unknown';
      if (val === 'unknown') continue;
      counts[val] = (counts[val] || 0) + 1;
    }
    facets[key] = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  }

  const filteredIndices = matchingIndices.filter(i => passesFilter(getRecordAt(i), filters));
  filteredIndices.sort((a, b) => scores[b] - scores[a]);

  const results = filteredIndices.slice(0, topK).map(i => {
    const rec = getRecordAt(i);
    const r = { score: scores[i], ...rec };
    const dedupInfo = dedupIndex[r.id];
    if (dedupInfo?.duplicates) {
      r.also_available = dedupInfo.duplicates.map(d => ({ source: d.source?.replace('.jsonl', ''), url: d.url }));
    }
    // Never leak private submitter_contact
    if (r.submitter_contact) delete r.submitter_contact;
    return r;
  });

  return { totalMatching: matchingIndices.length, totalFiltered: filteredIndices.length, results, facets };
}

function getFullRecord(id) {
  // Community records live in-memory
  if (id && typeof id === 'string' && id.startsWith('c-')) {
    const rec = communityMetadata.find(r => r.id === id);
    if (rec) {
      const { submitter_contact, ...publicRec } = rec;
      return publicRec;
    }
  }
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
      const raw = m[key] ?? FACET_DEFAULTS[key];
      const val = normalizeFacetValue(key, raw) || 'unknown';
      if (val === 'unknown') continue;
      counts[val] = (counts[val] || 0) + 1;
    }
    facets[key] = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  }
  return facets;
}

// ============ EXPRESS APP ============

const app = express();
// Caddy terminates HTTPS and proxies to Express. Trust its X-Forwarded-Proto /
// X-Forwarded-For headers so req.protocol returns "https" and req.ip reflects
// the real client IP (used by rate limits, flag IP hashing).
app.set('trust proxy', true);
app.use(cors());
app.use(express.json());

// Serve static React build (skip index.html — handled by SPA fallback with bot detection)
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { index: false }));
}

// --- Browse by category (curated) ---
let curatedBrowse = {};
try { curatedBrowse = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'curated-browse.json'), 'utf8')); } catch {}

app.get('/api/browse', rateLimit, (req, res) => {
  const { domain, limit = 200, includeNoSchema, ...filterParams } = req.query;
  if (!domain || !curatedBrowse[domain]) {
    return res.json({ domain, count: 0, results: [], facets: {}, available: Object.keys(curatedBrowse) });
  }

  const filters = {};
  for (const key of FACET_KEYS) { if (filterParams[key]) filters[key] = filterParams[key]; }
  if (includeNoSchema === 'true') filters.includeNoSchema = true;

  const all = curatedBrowse[domain].map(i => metadata[i]).filter(Boolean);

  const facets = {};
  for (const key of FACET_KEYS) {
    if (key === 'domain') { facets[key] = []; continue; }
    const counts = {};
    for (const m of all) {
      if (!passesFilter(m, filters, key)) continue;
      const raw = m[key] ?? FACET_DEFAULTS[key];
      const val = normalizeFacetValue(key, raw) || 'unknown';
      if (val === 'unknown') continue;
      counts[val] = (counts[val] || 0) + 1;
    }
    facets[key] = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([value, count]) => ({ value, count }));
  }

  const filtered = all.filter(m => passesFilter(m, filters));
  const results = filtered.slice(0, parseInt(limit) || 200).map(m => ({ ...m, score: 1.0 }));

  res.json({ domain, count: results.length, totalMatching: all.length, totalFiltered: filtered.length, results, facets });
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
  const { q, limit = 10, domain, format: formatType, geography, platform, access, source_type } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing query parameter q', usage: 'GET /api/v1/search?q=your+query' });
  try {
    const expanded = expandQuery(q);
    const queryEmb = await getQueryEmbedding([...expanded].join(' '));
    const filters = {};
    if (domain) filters.domain = domain;
    if (formatType) filters.formatType = formatType;
    if (geography) filters.geographic_scope = geography;
    if (platform) filters.source_platform = platform;
    if (access) filters.access = access;
    if (source_type) filters.source_type = source_type;

    const { totalMatching, totalFiltered, results } = search(queryEmb, Math.min(parseInt(limit) || 10, 50), filters, q);

    // Agent-friendly response: clean, flat, actionable
    const agentResults = results.map(r => ({
      id: r.id,
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
      source_type: r.source_type || 'curated',
      access: r.access || 'open',
      access_instructions: r.access_instructions || null,
      price_range: r.price_range || null,
      submitter: r.submitter?.display ? { name: r.submitter.name || null, url: r.submitter.url || null } : null,
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

// ============ SUBMISSIONS ============

const DOMAIN_ENUM = ['health', 'education', 'transportation', 'environment', 'finance', 'public_safety', 'elections', 'labor', 'demographics', 'natural_resources', 'technology', 'legal', 'energy', 'agriculture', 'housing'];
const FORMAT_ENUM = ['api', 'flat_file', 'structured', 'geospatial', 'document'];
// Accepted values for submission geographic_scope. Broader than the curated corpus's
// set; submitters from anywhere can pick what fits. `wa_*` intentionally omitted —
// it's a holdover from the WA-catalog era and shouldn't be promoted to new submitters.
const GEO_ENUM = ['global', 'us_national', 'us_state', 'us_city', 'international', 'varies', 'unknown'];
const ACCESS_ENUM = ['open', 'gated'];
const PRICE_ENUM = ['free-tier', 'paid', 'enterprise'];

const SUBMIT_LIMIT = { windowMs: 24 * 60 * 60 * 1000, max: 5 };
const submitRateStore = new Map();

function submitRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = submitRateStore.get(ip) || { count: 0, resetAt: now + SUBMIT_LIMIT.windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + SUBMIT_LIMIT.windowMs; }
  entry.count++;
  submitRateStore.set(ip, entry);
  if (entry.count > SUBMIT_LIMIT.max) {
    return res.status(429).json({ error: `Submission limit exceeded. Max ${SUBMIT_LIMIT.max} submissions per 24h per IP.`, retry_after_seconds: Math.ceil((entry.resetAt - now) / 1000) });
  }
  next();
}

// Serialize submissions so dedup + file append + in-memory update are atomic
let submitLock = Promise.resolve();
function withSubmitLock(fn) {
  const run = submitLock.then(fn, fn);
  submitLock = run.catch(() => {});
  return run;
}

function isValidUrl(u) { const n = normalizeUrl(u); return n !== null; }
function isNonEmptyString(v, min = 1, max = 10000) { return typeof v === 'string' && v.trim().length >= min && v.length <= max; }

function validateSubmission(body) {
  const errs = [];
  if (!body || typeof body !== 'object') return ['Body must be a JSON object'];

  // Honeypot
  if (body._hp) return ['Rejected'];

  if (!isNonEmptyString(body.name, 1, 200)) errs.push('name: required, 1-200 chars');
  if (!isValidUrl(body.url)) errs.push('url: required, valid http/https URL');
  if (!isNonEmptyString(body.description, 50, 500)) errs.push('description: required, 50-500 chars');
  if (!isNonEmptyString(body.publisher, 1, 200)) errs.push('publisher: required, 1-200 chars');
  if (!DOMAIN_ENUM.includes(body.domain)) errs.push(`domain: required, one of ${DOMAIN_ENUM.join(', ')}`);
  if (!FORMAT_ENUM.includes(body.format)) errs.push(`format: required, one of ${FORMAT_ENUM.join(', ')}`);
  if (!ACCESS_ENUM.includes(body.access)) errs.push(`access: required, one of ${ACCESS_ENUM.join(', ')}`);

  if (!Array.isArray(body.columns) || body.columns.length < 1) {
    errs.push('columns: required, non-empty array of {name, type, description?}');
  } else if (body.columns.length > 100) {
    errs.push('columns: max 100 per submission');
  } else {
    for (let i = 0; i < body.columns.length; i++) {
      const c = body.columns[i];
      if (!c || typeof c !== 'object') { errs.push(`columns[${i}]: must be object`); continue; }
      if (!isNonEmptyString(c.name, 1, 200)) errs.push(`columns[${i}].name: required`);
      if (!isNonEmptyString(c.type, 1, 50)) errs.push(`columns[${i}].type: required`);
      if (c.description !== undefined && !isNonEmptyString(c.description, 0, 500)) errs.push(`columns[${i}].description: string or omit`);
    }
  }

  if (body.access === 'gated' && !isNonEmptyString(body.access_instructions, 1, 1000)) {
    errs.push('access_instructions: required when access="gated", 1-1000 chars');
  }

  if (body.geographic_scope !== undefined && !GEO_ENUM.includes(body.geographic_scope)) errs.push(`geographic_scope: one of ${GEO_ENUM.join(', ')}`);
  if (body.price_range !== undefined && body.price_range !== null && !PRICE_ENUM.includes(body.price_range)) errs.push(`price_range: one of ${PRICE_ENUM.join(', ')}`);
  if (body.api_endpoint !== undefined && body.api_endpoint !== null && !isValidUrl(body.api_endpoint)) errs.push('api_endpoint: must be valid URL or omit');
  if (body.documentation_url !== undefined && body.documentation_url !== null && !isValidUrl(body.documentation_url)) errs.push('documentation_url: must be valid URL or omit');
  if (body.submitter_url !== undefined && body.submitter_url !== null && !isValidUrl(body.submitter_url)) errs.push('submitter_url: must be valid URL or omit');
  if (body.submitter_name !== undefined && body.submitter_name !== null && !isNonEmptyString(body.submitter_name, 0, 100)) errs.push('submitter_name: string or omit');
  if (body.submitter_contact !== undefined && body.submitter_contact !== null && !isNonEmptyString(body.submitter_contact, 3, 200)) errs.push('submitter_contact: string or omit');
  if (body.tags !== undefined && (!Array.isArray(body.tags) || body.tags.length > 50 || body.tags.some(t => typeof t !== 'string'))) errs.push('tags: array of strings, max 50');

  return errs;
}

async function checkUrlReachable(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const resp = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    // Accept 2xx, 3xx, 401/403 (gated), 405 (HEAD not allowed)
    return resp.status < 400 || [401, 403, 405].includes(resp.status);
  } catch (e) {
    clearTimeout(timer);
    return false;
  }
}

function generateSubmissionId() {
  const ts = Math.floor(Date.now() / 1000);
  const rand = Math.random().toString(36).slice(2, 8);
  return `c-${ts}-${rand}`;
}

function buildCommunityRecord(body) {
  const id = generateSubmissionId();
  const now = new Date().toISOString();
  const columns = body.columns.map(c => ({ name: c.name, type: c.type, ...(c.description ? { description: c.description } : {}) }));
  return {
    id,
    name: body.name.trim(),
    domain: body.domain,
    summary: body.description.trim(),
    publisher: body.publisher.trim(),
    url: body.url.trim(),
    source: 'community-submissions.jsonl',
    format: body.format,
    formatType: body.format,
    geographic_scope: body.geographic_scope || 'unknown',
    geographic_detail: null,
    update_frequency: body.update_frequency || 'unknown',
    freshness: 'unknown',
    last_updated: null,
    access_method: body.api_endpoint ? 'api' : 'download',
    source_platform: 'community',
    api_endpoint: body.api_endpoint || null,
    documentation_url: body.documentation_url || null,
    column_count: columns.length,
    columns,
    row_count: null,
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 50) : [],
    // Community-specific
    source_type: 'community',
    access: body.access,
    access_instructions: body.access_instructions || null,
    price_range: body.price_range || null,
    submitter: (body.submitter_name || body.submitter_url)
      ? { name: body.submitter_name || null, url: body.submitter_url || null, display: !!body.display_attribution }
      : { display: false },
    submitter_contact: body.submitter_contact || null,
    submitted_at: now,
    flags_count: 0,
    admin_status: 'auto',
  };
}

function embedTextForRecord(rec) {
  const cols = (rec.columns || []).map(c => c.name).filter(Boolean).join(', ');
  return [rec.name, rec.summary, rec.publisher, cols].filter(Boolean).join('. ').slice(0, 512);
}

async function appendCommunitySubmission(rec) {
  // Compute embedding
  const emb = await getQueryEmbedding(embedTextForRecord(rec));
  let sum = 0; for (let j = 0; j < DIM; j++) sum += emb[j] ** 2;
  const norm = Math.sqrt(sum);

  // Append to disk
  fs.appendFileSync(COMMUNITY_META_PATH(), JSON.stringify(rec) + '\n');
  fs.appendFileSync(COMMUNITY_EMB_PATH(), Buffer.from(emb.buffer, emb.byteOffset, DIM * 4));

  // Update in-memory
  communityMetadata.push(rec);
  communityEmbeddings.push(emb);
  communityNorms.push(norm);
  const n = normalizeUrl(rec.url);
  if (n) urlSet.add(n);
}

// ============ FLAGS ============

const FLAG_REASONS = ['broken-url', 'duplicate', 'misleading', 'spam', 'offensive', 'other'];
const FLAG_LIMIT = { windowMs: 24 * 60 * 60 * 1000, max: 10 };
const flagRateStore = new Map();
const COMMUNITY_FLAGS_PATH = () => path.join(DATA_DIR, 'community-flags.jsonl');

function flagRateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const entry = flagRateStore.get(ip) || { count: 0, resetAt: now + FLAG_LIMIT.windowMs };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + FLAG_LIMIT.windowMs; }
  entry.count++;
  flagRateStore.set(ip, entry);
  if (entry.count > FLAG_LIMIT.max) {
    return res.status(429).json({ error: `Flag limit exceeded. Max ${FLAG_LIMIT.max} flags per 24h per IP.` });
  }
  next();
}

function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || '')).digest('hex').slice(0, 16);
}

app.post('/api/v1/flag/:id', flagRateLimit, async (req, res) => {
  const id = req.params.id;
  const { reason, details } = req.body || {};
  if (!id || !id.startsWith('c-')) {
    return res.status(400).json({ error: 'Flagging is only supported for community submissions (ids start with c-).' });
  }
  if (!FLAG_REASONS.includes(reason)) {
    return res.status(400).json({ error: `Invalid reason. Must be one of: ${FLAG_REASONS.join(', ')}` });
  }
  if (details != null && (typeof details !== 'string' || details.length > 500)) {
    return res.status(400).json({ error: 'details must be a string, max 500 chars.' });
  }
  try {
    const rec = await withSubmitLock(async () => {
      const r = communityMetadata.find(x => x.id === id);
      if (!r) { const e = new Error('Not found'); e.status = 404; throw e; }
      r.flags_count = (r.flags_count || 0) + 1;

      const entry = {
        submission_id: id,
        reason,
        details: details ? details.trim() : null,
        ip_hash: hashIp(req.ip),
        ts: new Date().toISOString(),
      };
      fs.appendFileSync(COMMUNITY_FLAGS_PATH(), JSON.stringify(entry) + '\n');
      rewriteCommunityMetadata();
      return r;
    });
    const hidden = rec.flags_count >= 3 && rec.admin_status !== 'approved';
    res.json({ id: rec.id, flags_count: rec.flags_count, hidden });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message || 'Flag failed' });
  }
});

// ============ ADMIN ============

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;

function adminAuth(req, res, next) {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'Admin disabled: ADMIN_TOKEN env var not set on server' });
  const auth = req.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

function rewriteCommunityMetadata() {
  const target = COMMUNITY_META_PATH();
  const tmp = target + '.tmp';
  const body = communityMetadata.length ? communityMetadata.map(r => JSON.stringify(r)).join('\n') + '\n' : '';
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, target);
}

app.get('/api/admin/submissions', adminAuth, (req, res) => {
  const { filter = 'recent', limit = '50' } = req.query;
  const lim = Math.min(parseInt(limit) || 50, 500);
  let list = communityMetadata.slice();
  if (filter === 'flagged') list = list.filter(r => (r.flags_count || 0) > 0);
  else if (filter === 'hidden') list = list.filter(r => !communityIsVisible(r));
  else if (filter === 'approved') list = list.filter(r => r.admin_status === 'approved');
  else if (filter === 'rejected') list = list.filter(r => r.admin_status === 'rejected');
  else if (filter !== 'all' && filter !== 'recent') return res.status(400).json({ error: `Unknown filter "${filter}"` });
  list.sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''));
  const items = list.slice(0, lim).map(r => ({
    id: r.id, name: r.name, url: r.url, publisher: r.publisher,
    domain: r.domain, access: r.access, submitted_at: r.submitted_at,
    flags_count: r.flags_count || 0, admin_status: r.admin_status,
    submitter_contact: r.submitter_contact || null,
  }));
  res.json({ filter, count: items.length, total: list.length, items });
});

app.get('/api/admin/submissions/:id', adminAuth, (req, res) => {
  const rec = communityMetadata.find(r => r.id === req.params.id);
  if (!rec) return res.status(404).json({ error: 'Not found' });
  res.json(rec);
});

async function setAdminStatus(id, status) {
  return withSubmitLock(async () => {
    const rec = communityMetadata.find(r => r.id === id);
    if (!rec) { const e = new Error('Not found'); e.status = 404; throw e; }
    rec.admin_status = status;
    rewriteCommunityMetadata();
    return rec;
  });
}

app.post('/api/admin/submissions/:id/approve', adminAuth, async (req, res) => {
  try {
    const rec = await setAdminStatus(req.params.id, 'approved');
    res.json({ id: rec.id, admin_status: rec.admin_status });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

app.post('/api/admin/submissions/:id/reject', adminAuth, async (req, res) => {
  try {
    const rec = await setAdminStatus(req.params.id, 'rejected');
    res.json({ id: rec.id, admin_status: rec.admin_status });
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ============ SUBMIT ============

app.post('/api/v1/submit', submitRateLimit, async (req, res) => {
  const body = req.body;
  const errs = validateSubmission(body);
  if (errs.length) return res.status(400).json({ error: 'Validation failed', issues: errs });

  const normUrl = normalizeUrl(body.url);
  if (urlSet.has(normUrl)) {
    return res.status(409).json({ error: 'Duplicate: this URL is already in SchemaFinder. Search first before submitting.', url: body.url });
  }

  // URL reachability (off the lock — network I/O)
  const reachable = await checkUrlReachable(body.url);
  if (!reachable) {
    return res.status(400).json({ error: 'URL not reachable. Please verify the dataset URL returns a valid response.', url: body.url });
  }

  try {
    const result = await withSubmitLock(async () => {
      // Re-check dedup under lock
      if (urlSet.has(normUrl)) throw Object.assign(new Error('Duplicate'), { status: 409 });
      const rec = buildCommunityRecord(body);
      await appendCommunitySubmission(rec);
      return rec;
    });
    const host = req.get('host');
    const proto = req.protocol;
    res.status(201).json({
      id: result.id,
      status: 'live',
      source_type: 'community',
      dataset_url: `${proto}://${host}/dataset/${encodeURIComponent(result.id)}`,
      message: 'Submission is live. It will appear in search results immediately. Users can flag it; the maintainer reviews flagged submissions.',
    });
  } catch (e) {
    const status = e.status || 500;
    res.status(status).json({ error: e.message || 'Submission failed' });
  }
});

// --- OpenAPI spec for agents ---
app.get('/api/v1/openapi.json', (req, res) => {
  res.json({
    openapi: '3.0.3',
    info: {
      title: 'SchemaFinder API',
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
            { name: 'geography', in: 'query', schema: { type: 'string', enum: ['global', 'us_national', 'us_state', 'us_city', 'wa_state', 'wa_city', 'wa_county', 'international', 'varies', 'unknown'] }, description: 'Filter by geographic scope. wa_* values exist for historical WA-focused data; most non-US datasets fall into "global" or "varies".' },
            { name: 'platform', in: 'query', schema: { type: 'string', enum: ['socrata', 'ckan', 'arcgis', 'bigquery', 'aws', 'huggingface', 'kaggle', 'community'] }, description: 'Filter by source platform' },
            { name: 'access', in: 'query', schema: { type: 'string', enum: ['open', 'gated'] }, description: 'Filter by access type. "gated" = requires signup/payment (full schema still published).' },
            { name: 'source_type', in: 'query', schema: { type: 'string', enum: ['curated', 'community'] }, description: 'Filter by source: curated (scraped by maintainer) or community (submitted by users/agents).' },
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
      },
      '/api/v1/submit': {
        post: {
          operationId: 'submitDataset',
          summary: 'Submit a public dataset to SchemaFinder',
          description: 'Adds a dataset to SchemaFinder\'s community-submitted index. Goes live immediately with a "community" badge. SEARCH FIRST to avoid duplicates. Gated/paid datasets are allowed if full column schema is provided. Rate limit: 5 submissions per 24h per IP.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: {
              type: 'object',
              required: ['name', 'url', 'description', 'publisher', 'domain', 'format', 'access', 'columns'],
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 200 },
                url: { type: 'string', format: 'uri', description: 'Canonical source URL of the dataset' },
                description: { type: 'string', minLength: 50, maxLength: 500 },
                publisher: { type: 'string', minLength: 1, maxLength: 200 },
                domain: { type: 'string', enum: DOMAIN_ENUM },
                format: { type: 'string', enum: FORMAT_ENUM },
                access: { type: 'string', enum: ACCESS_ENUM, description: '"open" or "gated" (paywalled/login-required).' },
                access_instructions: { type: 'string', maxLength: 1000, description: 'Required when access="gated". How to get access (signup link, pricing).' },
                columns: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'object', required: ['name', 'type'], properties: { name: { type: 'string' }, type: { type: 'string' }, description: { type: 'string' } } } },
                api_endpoint: { type: 'string', format: 'uri', nullable: true },
                documentation_url: { type: 'string', format: 'uri', nullable: true },
                geographic_scope: { type: 'string', enum: GEO_ENUM },
                update_frequency: { type: 'string', description: 'e.g. daily, weekly, monthly, annually, unknown' },
                tags: { type: 'array', items: { type: 'string' }, maxItems: 50 },
                price_range: { type: 'string', enum: PRICE_ENUM, nullable: true, description: 'Only meaningful when access="gated".' },
                submitter_name: { type: 'string', maxLength: 100, description: 'Optional. Only shown if display_attribution=true.' },
                submitter_url: { type: 'string', format: 'uri', description: 'Optional profile/site link.' },
                submitter_contact: { type: 'string', description: 'Optional. Private. Used only by maintainer for follow-up.' },
                display_attribution: { type: 'boolean', default: false, description: 'If true, submitter_name and submitter_url are shown on the dataset page.' },
              },
            }}}
          },
          responses: {
            201: { description: 'Submission accepted and live', content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string' }, dataset_url: { type: 'string' } } } } } },
            400: { description: 'Validation error or unreachable URL' },
            409: { description: 'Duplicate URL already in corpus' },
            429: { description: 'Rate limit exceeded' },
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
// Allow rules intentionally precede Disallow for human readability. Per RFC /
// Google interpretation, the most-specific (longest) path wins, so /llms.txt
// and /api/v1/openapi.json stay reachable despite the blanket /api/ disallow.
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`# SchemaFinder robots.txt
# Submit data or integrate via the manifest at /llms.txt

User-agent: *

# Agent and crawler entry points
Allow: /llms.txt
Allow: /api/v1/openapi.json

# Search API is rate-limited (30/min) and not useful for generic crawlers.
# Agents should use the OpenAPI spec to discover endpoints.
Disallow: /api/

Sitemap: https://schemafinder.com/sitemap-index.xml
`);
});

// --- llms.txt (agent discoverability) ---
// See https://llmstxt.org — markdown-style manifest for LLM / agent consumers.
app.get('/llms.txt', (req, res) => {
  const host = req.get('host');
  const proto = req.protocol;
  const base = `${proto}://${host}`;
  res.type('text/plain').send(`# SchemaFinder

> Semantic search engine over 200,000+ public dataset schemas from government portals, cloud warehouses, and research platforms. Find datasets by natural language and get source URLs, API endpoints, and column schemas.

Use the JSON API at ${base}/api/v1/search before writing scrapers or asking users to browse manually.

## Search

- **GET ${base}/api/v1/search?q=QUERY** : natural language search. Returns name, description, url, api_endpoint, columns, access type, source_type, relevance_score.
- **GET ${base}/api/v1/openapi.json** : full OpenAPI 3.0 spec.
- Supports filters: domain, format, geography, platform, access (open|gated), source_type (curated|community).

## Submit a dataset

SchemaFinder accepts community submissions via **POST ${base}/api/v1/submit**. Submissions go live immediately with a "Community" badge. Users can flag; the maintainer reviews flagged submissions.

### Before submitting

1. **Search first.** Call \`/api/v1/search\` with the dataset's name or URL. If it already exists, don't resubmit.
2. **Confirm with the human user.** Especially when submitting on someone else's behalf.
3. **Provide real columns.** Required even for paid/gated datasets. Column schema visibility is the whole point; a submission without columns will be rejected or flagged.

### Required fields

- \`name\` (1-200 chars)
- \`url\` (must be reachable; HEAD check at submit time)
- \`description\` (50-500 chars; write for natural language search)
- \`publisher\` (organization name)
- \`domain\`: one of health, education, transportation, environment, finance, public_safety, elections, labor, demographics, natural_resources, technology, legal, energy, agriculture, housing
- \`format\`: one of api, flat_file, structured, geospatial, document
- \`access\`: \`open\` or \`gated\`
- \`columns\`: array of \`{name, type, description?}\`, at least 1, max 100

### Required when access="gated"

- \`access_instructions\`: how to get access (signup link, pricing, API-key steps)

### Optional

- \`api_endpoint\`, \`documentation_url\`, \`geographic_scope\`, \`update_frequency\`, \`tags\`
- \`price_range\`: \`free-tier | paid | enterprise\` (only meaningful if gated)
- \`submitter_name\`, \`submitter_url\`, \`display_attribution\` (bool, default false). Attribution is opt-in.
- \`submitter_contact\`: private, only used by maintainer for flag follow-ups

### Rules

- Rate limit: 5 submissions per 24h per IP.
- Duplicate URLs rejected (409).
- Unreachable URLs rejected (400).
- Schema max: 100 columns.

### MCP

A \`schemafinder\` MCP server exposes \`search_datasets\`, \`get_dataset_schema\`, and \`submit_dataset\` as native tools for Claude Code and other MCP clients. Install: \`npm install -g schemafinder-mcp\`.

## Contact

Issues, feature requests: https://github.com/peter-products/dataset-explorer
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
  const pages = ['', '/about', '/api-docs', '/submit'];
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
<title>${name} | SchemaFinder</title>
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
<p><a href="https://schemafinder.com">SchemaFinder</a>. Search 200,000+ public dataset schemas.</p>
</body></html>`;
}

function renderHomeHtml() {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SchemaFinder | Search 200,000+ Public Dataset Schemas</title>
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
    loadCommunityIndex();
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