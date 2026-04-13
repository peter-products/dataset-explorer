// Extract JSON results from Sonnet agent output files and combine per source file
// Usage: node extract-agent-results.js <output-dir> <source-file-prefix>
// Scans agent output files for JSON arrays and combines them

const fs = require('fs');
const path = require('path');

const SCHEMAS_DIR = 'D:/Projects/wa-data-catalog/schemas';
const TEMP_DIR = 'C:/Users/PETERO~1/AppData/Local/Temp/claude/C--Users-Peter-Overman/019fe56b-4365-4a16-9439-77b48ff8edd9/tasks';

// Get list of all completed agent output files
const outputFiles = fs.readdirSync(TEMP_DIR).filter(f => f.endsWith('.output'));
console.log(`Found ${outputFiles.length} agent output files`);

// For each output file, try to extract JSON array results
const allResults = {};

for (const file of outputFiles) {
  const content = fs.readFileSync(path.join(TEMP_DIR, file), 'utf8');

  // Look for JSON arrays in the content
  const jsonMatches = content.match(/\[[\s\S]*?\{"id":\s*\d+[\s\S]*?\}\s*\]/g);
  if (!jsonMatches) continue;

  for (const match of jsonMatches) {
    try {
      const arr = JSON.parse(match);
      if (!Array.isArray(arr) || !arr[0]?.id === undefined || !arr[0]?.domain === undefined) continue;

      // Determine which source file this belongs to based on agent ID or content
      // For now, just collect all results by ID
      for (const item of arr) {
        if (item.id !== undefined && item.domain !== undefined) {
          // Store with the source file name
          if (!allResults[file]) allResults[file] = [];
          allResults[file].push(item);
        }
      }
    } catch (e) {
      // Try to fix common JSON issues
      try {
        const fixed = match.replace(/,\s*\]/, ']').replace(/domain:\s*([a-z_]+)/, 'domain: "$1"');
        const arr = JSON.parse(fixed);
        if (Array.isArray(arr)) {
          for (const item of arr) {
            if (item.id !== undefined) {
              if (!allResults[file]) allResults[file] = [];
              allResults[file].push(item);
            }
          }
        }
      } catch (e2) {}
    }
  }
}

// Report what we found
let totalRecords = 0;
for (const [file, results] of Object.entries(allResults)) {
  const ids = results.map(r => r.id).sort((a,b) => a-b);
  const min = ids[0], max = ids[ids.length-1];
  console.log(`${file}: ${results.length} records (IDs ${min}-${max})`);
  totalRecords += results.length;
}
console.log(`\nTotal extracted: ${totalRecords} records from ${Object.keys(allResults).length} files`);
