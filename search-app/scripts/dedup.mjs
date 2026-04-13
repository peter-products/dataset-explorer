// Deduplication pass across all 200K records
// Strategy: group by (publisher_normalized + normalized_name + column_signature)
// Output: dedup-groups.json with canonical record and duplicate list

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const FINAL_DIR = '../../schemas/final';
const OUTPUT = '../data/dedup-groups.json';
const DEDUP_META = '../data/dedup-metadata.json';

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function columnSignature(columns) {
  if (!columns || !columns.length) return '';
  const names = columns.map(c => normalize(c.name || c.field_name || '')).filter(Boolean).sort();
  return crypto.createHash('md5').update(names.join(',')).digest('hex').slice(0, 12);
}

function dedupKey(r) {
  const pub = normalize(r.publisher_normalized || r.publisher_id || r.provider || '');
  const name = normalize(r.name || '');
  const colSig = columnSignature(r.columns);
  // Use publisher + name as primary key, column signature as tiebreaker
  return `${pub}::${name}::${colSig}`;
}

function nameOnly(r) {
  // Secondary grouping: just normalized name (catches cross-publisher dupes)
  return normalize(r.name || '');
}

console.log('Loading records...');
const files = fs.readdirSync(FINAL_DIR).filter(f => f.endsWith('.jsonl'));
const allRecords = [];

for (const f of files) {
  const lines = fs.readFileSync(path.join(FINAL_DIR, f), 'utf8').trim().split('\n').filter(l => l.trim());
  for (let i = 0; i < lines.length; i++) {
    try {
      const r = JSON.parse(lines[i]);
      allRecords.push({
        id: r.id,
        name: r.name,
        publisher: r.publisher_normalized || r.provider,
        source: f,
        url: r.url,
        domain: r.domain,
        colCount: (r.columns || []).length,
        descLen: String(r.description || '').length,
        key: dedupKey(r),
        nameKey: nameOnly(r),
      });
    } catch (e) {}
  }
}

console.log(`Loaded ${allRecords.length} records from ${files.length} files`);

// Group by dedup key
const groups = {};
for (const r of allRecords) {
  if (!groups[r.key]) groups[r.key] = [];
  groups[r.key].push(r);
}

// Find groups with >1 record (exact duplicates)
const exactDupes = Object.entries(groups).filter(([, g]) => g.length > 1);
let totalDupeRecords = exactDupes.reduce((s, [, g]) => s + g.length - 1, 0);

console.log(`\nExact duplicates (same publisher + name + columns):`);
console.log(`  ${exactDupes.length} groups with duplicates`);
console.log(`  ${totalDupeRecords} duplicate records (can be deduplicated)`);

// Show top duplicate groups
console.log('\n  Top 15 largest duplicate groups:');
exactDupes.sort((a, b) => b[1].length - a[1].length);
for (const [key, group] of exactDupes.slice(0, 15)) {
  const sources = [...new Set(group.map(r => r.source.replace('.jsonl', '')))];
  console.log(`    ${group.length}x: "${group[0].name?.slice(0, 50)}" [${sources.join(', ')}]`);
}

// Now check name-only duplicates (cross-publisher)
const nameGroups = {};
for (const r of allRecords) {
  if (!r.nameKey || r.nameKey.length < 5) continue;
  if (!nameGroups[r.nameKey]) nameGroups[r.nameKey] = [];
  nameGroups[r.nameKey].push(r);
}

const crossPubDupes = Object.entries(nameGroups)
  .filter(([, g]) => g.length > 1 && new Set(g.map(r => r.publisher)).size > 1);

console.log(`\nCross-publisher duplicates (same name, different publisher):`);
console.log(`  ${crossPubDupes.length} groups`);
console.log('\n  Top 10:');
crossPubDupes.sort((a, b) => b[1].length - a[1].length);
for (const [key, group] of crossPubDupes.slice(0, 10)) {
  const pubs = [...new Set(group.map(r => (r.publisher || '').slice(0, 25)))];
  console.log(`    ${group.length}x: "${group[0].name?.slice(0, 45)}" [${pubs.join(', ')}]`);
}

// Build dedup index: for each group, pick the canonical (richest metadata) and list dupes
const dedupIndex = {};
for (const [key, group] of exactDupes) {
  // Pick canonical: prefer the one with most columns, then longest description
  group.sort((a, b) => (b.colCount - a.colCount) || (b.descLen - a.descLen));
  const canonical = group[0];
  const dupes = group.slice(1);
  dedupIndex[canonical.id] = {
    canonical: canonical.id,
    duplicates: dupes.map(d => ({ id: d.id, source: d.source, url: d.url })),
  };
  // Mark duplicates
  for (const d of dupes) {
    dedupIndex[d.id] = { duplicate_of: canonical.id };
  }
}

// Save dedup data
fs.writeFileSync(OUTPUT, JSON.stringify({
  totalRecords: allRecords.length,
  exactDuplicateGroups: exactDupes.length,
  totalDuplicateRecords: totalDupeRecords,
  crossPublisherGroups: crossPubDupes.length,
  generated: new Date().toISOString(),
}, null, 2));

fs.writeFileSync(DEDUP_META, JSON.stringify(dedupIndex));

console.log(`\n=== Summary ===`);
console.log(`Total records: ${allRecords.length}`);
console.log(`Unique records: ${allRecords.length - totalDupeRecords}`);
console.log(`Duplicate records: ${totalDupeRecords} (${(totalDupeRecords/allRecords.length*100).toFixed(1)}%)`);
console.log(`\nSaved to: ${OUTPUT}`);
