#!/usr/bin/env node
// Generate search_keywords for every record in final/
// Extracts meaningful terms from name, description, columns, tags, and domain
// Then adds related terms a human would search for
// Output: adds search_keywords field to each record and rebuilds embedding_text

const fs = require('fs');
const path = require('path');

const FINAL_DIR = path.join(__dirname, 'final');

const LABELS = {
  health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
  environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
  elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics',
  natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
  energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use'
};

// Domain → related search terms people would use
const DOMAIN_KEYWORDS = {
  health: ['health', 'medical', 'disease', 'hospital', 'mortality', 'death', 'patient', 'clinical', 'vaccine', 'immunization', 'nutrition', 'mental health', 'public health'],
  education: ['education', 'school', 'student', 'enrollment', 'graduation', 'teacher', 'university', 'college', 'academic', 'literacy', 'curriculum'],
  transportation: ['transportation', 'road', 'traffic', 'transit', 'bus', 'rail', 'highway', 'bridge', 'vehicle', 'commute', 'pedestrian', 'bicycle', 'parking'],
  environment: ['environment', 'pollution', 'climate', 'weather', 'water quality', 'air quality', 'emissions', 'waste', 'conservation', 'ecosystem', 'stormwater', 'watershed'],
  finance: ['finance', 'budget', 'revenue', 'expenditure', 'tax', 'income', 'economic', 'GDP', 'trade', 'debt', 'investment', 'fiscal'],
  public_safety: ['public safety', 'crime', 'police', 'fire', 'emergency', 'disaster', 'accident', '911', 'law enforcement', 'incident'],
  elections: ['election', 'voting', 'ballot', 'precinct', 'candidate', 'voter', 'turnout', 'campaign', 'political'],
  labor: ['labor', 'employment', 'unemployment', 'wage', 'salary', 'workforce', 'occupation', 'job', 'worker', 'hiring'],
  demographics: ['demographics', 'population', 'census', 'age', 'gender', 'race', 'ethnicity', 'household', 'migration', 'birth', 'death'],
  natural_resources: ['natural resources', 'forest', 'wildlife', 'fish', 'salmon', 'habitat', 'mineral', 'geology', 'timber', 'hunting', 'conservation'],
  technology: ['technology', 'software', 'internet', 'broadband', 'digital', 'data', 'IT', 'computer', 'network', 'cybersecurity'],
  legal: ['legal', 'court', 'regulation', 'law', 'ordinance', 'license', 'permit', 'compliance', 'enforcement', 'statute'],
  energy: ['energy', 'electricity', 'power', 'renewable', 'solar', 'wind', 'oil', 'gas', 'fuel', 'utility', 'grid'],
  agriculture: ['agriculture', 'farm', 'crop', 'livestock', 'food', 'dairy', 'grain', 'soil', 'irrigation', 'harvest'],
  housing: ['housing', 'property', 'parcel', 'zoning', 'building permit', 'real estate', 'rental', 'mortgage', 'construction', 'land use', 'development'],
};

// Common abbreviation expansions
const ABBREV = {
  'covid': 'COVID-19 coronavirus pandemic',
  'acs': 'American Community Survey census',
  'bls': 'Bureau of Labor Statistics',
  'epa': 'Environmental Protection Agency',
  'fema': 'Federal Emergency Management Agency',
  'noaa': 'National Oceanic Atmospheric weather climate',
  'usda': 'agriculture food farming',
  'hud': 'housing urban development',
  'dot': 'transportation department',
  'fda': 'Food Drug Administration',
  'cdc': 'Centers Disease Control health',
  'fcc': 'Federal Communications Commission telecom',
  'sec': 'Securities Exchange Commission financial',
  'irs': 'Internal Revenue Service tax',
  'nasa': 'space aeronautics',
  'nps': 'National Park Service parks',
  'doh': 'Department of Health',
  'dnr': 'Department Natural Resources forest',
  'wsdot': 'Washington State transportation roads highway',
  'ospi': 'education schools superintendent',
  'gtfs': 'transit schedule bus train route stop',
  'arcgis': 'geographic geospatial GIS mapping',
  'socrata': 'open data portal government',
};

// Stop words to exclude from keyword extraction
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one',
  'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old',
  'see', 'way', 'who', 'did', 'let', 'say', 'she', 'too', 'use', 'with', 'this', 'that',
  'from', 'have', 'been', 'some', 'than', 'them', 'then', 'these', 'they', 'were', 'will',
  'each', 'make', 'like', 'long', 'look', 'many', 'most', 'over', 'such', 'take', 'into',
  'year', 'back', 'also', 'well', 'just', 'only', 'come', 'made', 'know', 'data', 'dataset',
  'table', 'view', 'list', 'file', 'type', 'name', 'code', 'date', 'number', 'total',
  'value', 'description', 'information', 'based', 'used', 'using', 'includes', 'including',
  'provides', 'contains', 'available', 'more', 'about', 'other', 'what', 'when', 'where',
  'which', 'there', 'their', 'would', 'could', 'should', 'being', 'between', 'after',
  'before', 'during', 'through', 'within', 'under', 'above', 'below', 'published',
  'none', 'null', 'unknown', 'test', 'example', 'sample',
]);

function extractKeywords(record) {
  const keywords = new Set();
  const name = String(record.name || '').toLowerCase();
  const desc = String(record.description || '').toLowerCase();
  const domain = record.domain || '';

  // 1. Extract meaningful words from name (most important signal)
  name.split(/[\s\-_,.()\[\]\/]+/).forEach(w => {
    w = w.replace(/[^a-z0-9]/g, '');
    if (w.length > 2 && !STOP_WORDS.has(w)) keywords.add(w);
  });

  // 2. Extract meaningful words from description (first 200 chars)
  desc.slice(0, 200).split(/[\s\-_,.()\[\]\/]+/).forEach(w => {
    w = w.replace(/[^a-z0-9]/g, '');
    if (w.length > 3 && !STOP_WORDS.has(w)) keywords.add(w);
  });

  // 3. Add column names (very high signal)
  (record.columns || []).forEach(c => {
    const colName = String(c.name || c.field_name || '').toLowerCase();
    colName.split(/[\s\-_]+/).forEach(w => {
      w = w.replace(/[^a-z0-9]/g, '');
      if (w.length > 2 && !STOP_WORDS.has(w)) keywords.add(w);
    });
  });

  // 4. Add existing tags
  (record.tags || []).forEach(t => {
    String(t || '').toLowerCase().split(/[\s,]+/).forEach(w => {
      w = w.replace(/[^a-z0-9]/g, '');
      if (w.length > 2 && !STOP_WORDS.has(w)) keywords.add(w);
    });
  });

  // 5. Add domain-related search terms
  if (DOMAIN_KEYWORDS[domain]) {
    DOMAIN_KEYWORDS[domain].forEach(kw => keywords.add(kw));
  }

  // 6. Expand abbreviations found in the text
  const allText = name + ' ' + desc + ' ' + (record.source_portal || '') + ' ' + (record.publisher_normalized || '');
  for (const [abbrev, expansion] of Object.entries(ABBREV)) {
    if (allText.includes(abbrev)) {
      expansion.split(/\s+/).forEach(w => keywords.add(w.toLowerCase()));
    }
  }

  // 7. Add publisher as keyword
  const pub = String(record.publisher_normalized || record.provider || '').toLowerCase();
  pub.split(/[\s\-_,]+/).forEach(w => {
    w = w.replace(/[^a-z0-9]/g, '');
    if (w.length > 3 && !STOP_WORDS.has(w)) keywords.add(w);
  });

  return [...keywords].slice(0, 50); // cap at 50 keywords
}

// Process all final files
const files = fs.readdirSync(FINAL_DIR).filter(f => f.endsWith('.jsonl'));
let totalProcessed = 0;
let totalKeywords = 0;

for (const file of files) {
  const filepath = path.join(FINAL_DIR, file);
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
  const output = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);

    // Generate search keywords
    const keywords = extractKeywords(r);
    r.search_keywords = keywords;
    totalKeywords += keywords.length;

    // Rebuild embedding_text with keywords included
    const parts = [
      r.semantic_description || r.name || '',
      'Published by: ' + (r.publisher_normalized || r.provider || 'Unknown'),
      'Category: ' + (LABELS[r.domain] || r.domain || 'unknown'),
      'Geography: ' + (r.geographic_detail || r.geographic_scope || 'varies'),
    ];
    const colNames = (r.columns || []).slice(0, 20).map(c => c.name || c.field_name || '').filter(Boolean);
    if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
    parts.push('Keywords: ' + keywords.slice(0, 20).join(', '));
    r.embedding_text = parts.join('\n');

    output.push(JSON.stringify(r));
    totalProcessed++;
  }

  fs.writeFileSync(filepath, output.join('\n') + '\n');
  process.stdout.write(`\r✓ ${file.padEnd(40)} (${totalProcessed} total)`);
}

console.log(`\n\nDone! ${totalProcessed} records tagged`);
console.log(`Average keywords per record: ${(totalKeywords / totalProcessed).toFixed(1)}`);
