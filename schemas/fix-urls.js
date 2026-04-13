// Fix URL and hierarchy issues in Canada and Italy records
const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = '.';

function fixFile(filename, fixFn) {
  for (const dir of ['enriched', 'final']) {
    const filepath = path.join(SCHEMAS_DIR, dir, filename);
    if (!fs.existsSync(filepath)) continue;

    const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
    let fixed = 0;
    const output = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      if (fixFn(r)) fixed++;
      output.push(JSON.stringify(r));
    }

    fs.writeFileSync(filepath, output.join('\n') + '\n');
    console.log(`  ${dir}/${filename}: ${fixed}/${output.length} records fixed`);
  }
}

// Fix Canada: URLs and hierarchy
console.log('Fixing Canada...');
fixFile('canada.jsonl', r => {
  let changed = false;

  // Fix URL: data.gov UUID → open.canada.ca
  if (r.url && r.url.includes('catalog.data.gov/dataset/')) {
    const uuid = r.url.split('/dataset/')[1]?.split('?')[0];
    if (uuid) {
      r.url = `https://open.canada.ca/data/en/dataset/${uuid}`;
      r.documentation_url = r.url;
      changed = true;
    }
  }

  // Fix source_portal
  if (r.source_portal === 'catalog.data.gov') {
    r.source_portal = 'open.canada.ca';
    changed = true;
  }

  // Fix hierarchy: should be international_government, not us_government
  if (r.hierarchy) {
    if (r.hierarchy.galaxy === 'us_government') {
      r.hierarchy.galaxy = 'international_government';
      r.hierarchy.galaxy_label = 'International Government';
      changed = true;
    }
    if (r.hierarchy.solar_system === 'us_other' || !r.hierarchy.solar_system?.includes('canada')) {
      r.hierarchy.solar_system = 'canada';
      r.hierarchy.solar_system_label = 'Canada';
      changed = true;
    }
  }

  // Fix ID prefix
  if (r.id && r.id.startsWith('datagov:')) {
    r.id = 'canada:' + r.id.slice(8);
    changed = true;
  }

  return changed;
});

// Fix Italy: URLs and source_portal
console.log('Fixing Italy...');
fixFile('italy.jsonl', r => {
  let changed = false;

  // Fix URL: data.gov slug → dati.gov.it search
  if (r.url && r.url.includes('catalog.data.gov/dataset/')) {
    const slug = r.url.split('/dataset/')[1]?.split('?')[0];
    if (slug) {
      // Can't reconstruct exact dati.gov.it URLs, but fix to point to the Italian portal
      r.url = `https://dati.gov.it/view-dataset/dataset?id=${slug}`;
      r.documentation_url = r.url;
      changed = true;
    }
  }

  // Fix source_portal
  if (r.source_portal === 'catalog.data.gov') {
    r.source_portal = 'dati.gov.it';
    changed = true;
  }

  // Fix ID prefix
  if (r.id && r.id.startsWith('datagov:')) {
    r.id = 'italy:' + r.id.slice(8);
    changed = true;
  }

  return changed;
});

// Broader audit: check for other URL issues
console.log('\nBroader URL audit...');
const files = fs.readdirSync(path.join(SCHEMAS_DIR, 'final')).filter(f => f.endsWith('.jsonl'));
let totalIssues = 0;

for (const f of files) {
  const lines = fs.readFileSync(path.join(SCHEMAS_DIR, 'final', f), 'utf8').trim().split('\n').filter(l => l.trim());
  let noUrl = 0, emptyUrl = 0, templateUrl = 0;

  for (const l of lines) {
    const r = JSON.parse(l);
    if (!r.url) noUrl++;
    else if (r.url === 'None' || r.url === 'null' || r.url === '') emptyUrl++;
    else if (r.url.includes('{{') || r.url.includes('__')) templateUrl++;
  }

  const issues = noUrl + emptyUrl + templateUrl;
  if (issues > 0 && issues > lines.length * 0.1) {
    console.log(`  ${f}: ${lines.length} records, noUrl=${noUrl} empty=${emptyUrl} template=${templateUrl}`);
    totalIssues += issues;
  }
}

console.log(`\nTotal records with URL issues after fix: ${totalIssues}`);
