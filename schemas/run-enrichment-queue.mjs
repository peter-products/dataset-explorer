// Runs enrich-ollama-production.mjs on a specific queue of files in order
// Usage: node run-enrichment-queue.mjs

import { execSync } from 'child_process';
import fs from 'fs';

const SCRIPT = 'D:/Projects/wa-data-catalog/schemas/enrich-ollama-production.mjs';
const CHECKPOINT = 'D:/Projects/wa-data-catalog/schemas/enrichment-checkpoint.json';

// Peter's requested order:
// 1) Washington state + counties + cities
// 2) All datagov files
// 3) HuggingFace, AWS, BigQuery
const QUEUE = [
  // === WA STATE ===
  'wa-gov.jsonl',
  'seattle.jsonl',
  'seattle-cos.jsonl',
  'seattle-arcgis.jsonl',
  'wa-geo.jsonl',
  'king-county.jsonl',
  'king-county-arcgis.jsonl',
  'pierce-county.jsonl',
  'pierce-county-arcgis.jsonl',
  'wsdot-arcgis.jsonl',
  'wa-dnr-arcgis.jsonl',
  'wa-wdfw-arcgis.jsonl',
  'auburn.jsonl',
  'bellevue-arcgis.jsonl',
  'renton-arcgis.jsonl',
  'federal-way-arcgis.jsonl',
  'vancouver-arcgis.jsonl',
  'spokane-city-arcgis.jsonl',
  'spokane-county-arcgis.jsonl',
  'snohomish-arcgis.jsonl',
  'clark-county-arcgis.jsonl',
  'thurston-county-arcgis.jsonl',
  'kitsap-county-arcgis.jsonl',
  'benton-county-arcgis.jsonl',
  'chelan-county-arcgis.jsonl',
  'grant-county-arcgis.jsonl',
  'island-county-arcgis.jsonl',
  'jefferson-county-arcgis.jsonl',
  'kittitas-county-arcgis.jsonl',
  'skamania-county-arcgis.jsonl',
  'skagit-county-arcgis.jsonl',
  'walla-walla-county-arcgis.jsonl',
  'yakima-county-arcgis.jsonl',
  'marysville-arcgis.jsonl',
  'kent-arcgis.jsonl',

  // === DATA.GOV (all datagov-* files) ===
  'datagov-washington.jsonl',
  'datagov-epa.jsonl',
  'datagov-noaa.jsonl',
  'datagov-nasa.jsonl',
  'datagov-hhs.jsonl',
  'datagov-census.jsonl',
  'datagov-usda.jsonl',
  'datagov-geospatial.jsonl',
  'datagov-doi.jsonl',
  'datagov-dot.jsonl',
  'datagov-water.jsonl',
  'datagov-va.jsonl',
  'datagov-ssa.jsonl',
  'datagov-sba.jsonl',
  'datagov-nws.jsonl',
  'datagov-nps.jsonl',
  'datagov-nist.jsonl',
  'datagov-gsa.jsonl',
  'datagov-doe.jsonl',
  'datagov-dhs.jsonl',
  'datagov-corps.jsonl',
  'datagov-bls.jsonl',
  'datagov-blm.jsonl',
  'datagov-bia.jsonl',
  'datagov-ftc.jsonl',
  'datagov-ed.jsonl',
  'datagov-bea.jsonl',
  'datagov-fda.jsonl',
  'datagov-fcc.jsonl',
  'datagov-air.jsonl',
  'datagov-hud.jsonl',
  'datagov-nrc.jsonl',
  'datagov-broadband.jsonl',
  'datagov-spending.jsonl',
  'datagov-treasury.jsonl',
  'datagov-arlington.jsonl',
  'datagov-fed-reserve.jsonl',
  'datagov-fbi.jsonl',
  'datagov-dod.jsonl',
  'datagov-opm.jsonl',
  'datagov-sec.jsonl',
  'datagov-irs.jsonl',
  'datagov-disaster.jsonl',
  'datagov-usgs.jsonl',
  'datagov-fema.jsonl',

  // === HUGGINGFACE, AWS, BIGQUERY ===
  'huggingface-top1000.jsonl',
  'aws-opendata.jsonl',
  'bigquery.jsonl',
];

function getCompleted() {
  try {
    return JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8')).completed_files || [];
  } catch (e) {
    return [];
  }
}

const completed = new Set(getCompleted());
const remaining = QUEUE.filter(f => !completed.has(f));

console.log(`Queue: ${QUEUE.length} files`);
console.log(`Already completed: ${completed.size}`);
console.log(`Remaining: ${remaining.length}`);

let totalRecords = 0;
for (const file of remaining) {
  try {
    const count = fs.readFileSync(`D:/Projects/wa-data-catalog/schemas/enriched/${file}`, 'utf8').trim().split('\n').length;
    totalRecords += count;
  } catch (e) {}
}
console.log(`Total records to process: ~${totalRecords.toLocaleString()}`);
console.log(`Estimated time: ~${(totalRecords * 4 / 3600).toFixed(1)} hours\n`);

for (const file of remaining) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Starting: ${file}`);
  console.log(`${'='.repeat(50)}`);

  try {
    execSync(`node "${SCRIPT}" "${file}"`, {
      cwd: 'D:/Projects/wa-data-catalog/schemas',
      stdio: 'inherit',
      timeout: 24 * 60 * 60 * 1000, // 24 hour max per file
    });
  } catch (e) {
    console.error(`\nERROR on ${file}: ${e.message}`);
    console.log('Continuing to next file...');
  }
}

console.log('\n' + '='.repeat(50));
console.log('QUEUE COMPLETE');
const finalCompleted = getCompleted();
console.log(`Files completed: ${finalCompleted.length}`);
