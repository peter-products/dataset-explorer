// Rebuild metadata.jsonl with richer fields for filtering and detail views
// Preserves embedding order (same line number = same embedding vector)

import fs from 'fs';
import path from 'path';

const FINAL_DIR = '../../schemas/final';
const DATA_DIR = '../data';
const OLD_META = path.join(DATA_DIR, 'metadata.jsonl');
const NEW_META = path.join(DATA_DIR, 'metadata-v2.jsonl');

// Read old metadata to get file processing order
const oldLines = fs.readFileSync(OLD_META, 'utf8').trim().split('\n');
console.log(`Old metadata: ${oldLines.length} records`);

// Build a map: for each old metadata record, find its source file + line index
// We need to maintain exact same order as embeddings
const checkpoint = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'embedding-checkpoint.json'), 'utf8'));

// Rebuild from source files in checkpoint order
const output = [];
let recordIdx = 0;

for (const file of checkpoint.processedFiles) {
  const filepath = path.join(FINAL_DIR, file);
  if (!fs.existsSync(filepath)) continue;
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n').filter(l => l.trim());

  for (const line of lines) {
    try {
      const r = JSON.parse(line);

      // Normalize format to a simple string
      let formatStr = 'unknown';
      if (Array.isArray(r.format)) {
        formatStr = r.format.join(', ');
      } else if (typeof r.format === 'string') {
        formatStr = r.format;
      }

      // Classify format type
      let formatType = 'other';
      const fmtLower = formatStr.toLowerCase();
      if (fmtLower.includes('api') || r.access_method === 'api' || r.api_endpoint) formatType = 'api';
      else if (fmtLower.includes('csv') || fmtLower.includes('xlsx') || fmtLower.includes('tsv')) formatType = 'flat_file';
      else if (fmtLower.includes('json') || fmtLower.includes('xml')) formatType = 'structured';
      else if (fmtLower.includes('geojson') || fmtLower.includes('shapefile') || fmtLower.includes('kml') || fmtLower.includes('wms') || fmtLower.includes('wfs')) formatType = 'geospatial';
      else if (fmtLower.includes('pdf') || fmtLower.includes('doc') || fmtLower.includes('html')) formatType = 'document';
      else if (r.source_platform === 'socrata') formatType = 'api';
      else if (r.source_platform === 'arcgis') formatType = 'geospatial';

      const meta = {
        idx: recordIdx,
        id: r.id,
        name: r.name,
        domain: r.domain,
        summary: r.semantic_description,
        publisher: r.publisher_normalized || r.provider,
        url: r.url,
        source: file,
        format: formatStr,
        formatType,
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
        columns: (r.columns || []).slice(0, 50).map(c => ({ name: c.name, type: c.type || '' })),
        row_count: r.row_count || null,
        tags: (r.tags || []).slice(0, 10),
        hierarchy: r.hierarchy ? {
          galaxy: r.hierarchy.galaxy_label,
          system: r.hierarchy.solar_system_label,
          planet: r.hierarchy.planet_label,
          continent: r.hierarchy.continent_label,
        } : null,
      };

      output.push(JSON.stringify(meta));
      recordIdx++;
    } catch (e) {
      // Skip unparseable records
    }
  }
}

fs.writeFileSync(NEW_META, output.join('\n') + '\n');
console.log(`New metadata: ${output.length} records`);

if (output.length === oldLines.filter(l => l.trim()).length) {
  // Same count — safe to replace
  fs.copyFileSync(OLD_META, path.join(DATA_DIR, 'metadata-v1-backup.jsonl'));
  fs.renameSync(NEW_META, OLD_META);
  console.log('Replaced metadata.jsonl (backup saved as metadata-v1-backup.jsonl)');
} else {
  console.log(`WARNING: count mismatch (old: ${oldLines.length}, new: ${output.length}). Saved as metadata-v2.jsonl — review before replacing.`);
}

// Print filter value distributions
const distributions = { domain: {}, formatType: {}, geographic_scope: {}, update_frequency: {}, source_platform: {} };
for (const line of output) {
  const r = JSON.parse(line);
  for (const key of Object.keys(distributions)) {
    const val = r[key] || 'unknown';
    distributions[key][val] = (distributions[key][val] || 0) + 1;
  }
}

console.log('\nFilter distributions:');
for (const [key, dist] of Object.entries(distributions)) {
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  console.log(`\n  ${key}:`);
  sorted.slice(0, 10).forEach(([val, count]) => console.log(`    ${val}: ${count}`));
  if (sorted.length > 10) console.log(`    ... and ${sorted.length - 10} more`);
}
