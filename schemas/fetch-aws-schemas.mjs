// Fetches AWS Open Data Registry dataset metadata from GitHub YAML files
// Converts each YAML to our JSONL schema format
// Usage: node fetch-aws-schemas.mjs [batch-start] [batch-size]

import fs from 'fs';

const batchStart = parseInt(process.argv[2] || '0');
const batchSize = parseInt(process.argv[3] || '100');

const files = fs.readFileSync('D:/Projects/wa-data-catalog/schemas/aws-dataset-files.txt', 'utf8')
  .split('\n').filter(Boolean);

console.log(`Total YAML files: ${files.length}`);
console.log(`Processing batch: ${batchStart} to ${batchStart + batchSize}`);

const batch = files.slice(batchStart, batchStart + batchSize);

// Simple YAML parser for AWS Open Data format (flat structure, no nested objects needed)
function parseYaml(text) {
  const result = {};
  let currentKey = null;
  let currentList = null;
  const lines = text.split('\n');

  for (const line of lines) {
    // Skip comments and empty
    if (line.trim().startsWith('#') || !line.trim()) continue;

    // Top-level key
    const keyMatch = line.match(/^(\w[\w\s]*):\s*(.*)/);
    if (keyMatch && !line.startsWith(' ') && !line.startsWith('\t')) {
      currentKey = keyMatch[1].trim();
      const val = keyMatch[2].trim();
      if (val && val !== '|' && val !== '>') {
        result[currentKey] = val.replace(/^["']|["']$/g, '');
        currentList = null;
      } else if (val === '|' || val === '>') {
        result[currentKey] = '';
        currentList = null;
      } else {
        result[currentKey] = [];
        currentList = currentKey;
      }
      continue;
    }

    // List item
    const listMatch = line.match(/^\s+-\s+(.*)/);
    if (listMatch && currentList) {
      if (!Array.isArray(result[currentList])) result[currentList] = [];
      result[currentList].push(listMatch[1].trim().replace(/^["']|["']$/g, ''));
      continue;
    }

    // Continuation of multi-line value
    if (currentKey && typeof result[currentKey] === 'string' && line.startsWith('  ')) {
      result[currentKey] += (result[currentKey] ? ' ' : '') + line.trim();
    }
  }

  return result;
}

function guessDomain(tags, name, desc) {
  const text = [...(tags || []), name || '', desc || ''].join(' ').toLowerCase();
  if (text.match(/genom|bioinformatics|transcriptom|protein|cell biology/)) return 'health';
  if (text.match(/satellite|earth observation|geospatial|lidar|elevation|imagery/)) return 'environment';
  if (text.match(/weather|climate|meteorolog|atmosphere|ocean/)) return 'environment';
  if (text.match(/health|medical|disease|cancer|pharma|clinical/)) return 'health';
  if (text.match(/transport|traffic|logistics|vehicle|routing/)) return 'transportation';
  if (text.match(/nlp|language|text|web crawl|encycloped/)) return 'technology';
  if (text.match(/machine learning|computer vision|deep learning/)) return 'technology';
  if (text.match(/agriculture|crop|food|farm/)) return 'agriculture';
  if (text.match(/energy|solar|wind|power/)) return 'energy';
  if (text.match(/census|population|demographic/)) return 'demographics';
  if (text.match(/financial|economic|market/)) return 'finance';
  return 'unknown';
}

async function fetchAndParse(filePath) {
  const rawUrl = `https://raw.githubusercontent.com/awslabs/open-data-registry/main/${filePath}`;
  try {
    const res = await fetch(rawUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    return parseYaml(text);
  } catch {
    return null;
  }
}

function buildRecord(parsed, filePath) {
  const slug = filePath.replace('datasets/', '').replace('.yaml', '');
  const tags = Array.isArray(parsed.Tags) ? parsed.Tags : (parsed.Tags || '').split(',').map(t => t.trim()).filter(Boolean);
  const name = parsed.Name || slug;
  const desc = (parsed.Description || '').slice(0, 500);

  return {
    id: `aws-opendata:${slug}`,
    name,
    provider: parsed.ManagedBy || parsed['Contact'] || 'Unknown',
    source_portal: 'registry.opendata.aws',
    source_platform: 'aws',
    url: `https://registry.opendata.aws/${slug}`,
    api_endpoint: null,
    documentation_url: parsed.Documentation || `https://registry.opendata.aws/${slug}`,
    access_method: 'download',
    format: guessFormats(parsed),
    geographic_scope: 'varies',
    geographic_detail: null,
    domain: guessDomain(tags, name, desc),
    category: tags[0] || null,
    update_frequency: guessFrequency(parsed.UpdateFrequency),
    row_count: null,
    column_count: null,
    columns: [],
    tags,
    description: desc,
    last_updated: null,
    created_at: null,
    license: parsed.License || null,
    collected_at: new Date().toISOString(),
  };
}

function guessFormats(parsed) {
  const text = JSON.stringify(parsed).toLowerCase();
  const formats = [];
  if (text.includes('parquet')) formats.push('parquet');
  if (text.includes('csv')) formats.push('csv');
  if (text.includes('json')) formats.push('json');
  if (text.includes('geotiff') || text.includes('cog')) formats.push('geotiff');
  if (text.includes('netcdf')) formats.push('netcdf');
  if (text.includes('zarr')) formats.push('zarr');
  if (text.includes('hdf5') || text.includes('hdf')) formats.push('hdf5');
  if (text.includes('vcf')) formats.push('vcf');
  if (text.includes('bam') || text.includes('cram')) formats.push('bam');
  if (text.includes('fastq') || text.includes('fasta')) formats.push('fasta');
  if (text.includes('grib')) formats.push('grib');
  if (text.includes('shapefile')) formats.push('shapefile');
  if (text.includes('xml')) formats.push('xml');
  if (formats.length === 0) formats.push('unknown');
  return formats;
}

function guessFrequency(val) {
  if (!val) return 'unknown';
  const v = String(val).toLowerCase();
  if (v.includes('daily') || v.includes('continuously') || v.includes('real-time') || v.includes('hourly')) return 'daily';
  if (v.includes('weekly')) return 'weekly';
  if (v.includes('monthly')) return 'monthly';
  if (v.includes('quarterly')) return 'quarterly';
  if (v.includes('annually') || v.includes('yearly')) return 'annual';
  if (v.includes('not') || v.includes('irregular') || v.includes('one-time')) return 'one_time';
  return 'unknown';
}

async function main() {
  const PARALLEL = 10;
  const outputPath = 'D:/Projects/wa-data-catalog/schemas/aws-opendata.jsonl';
  let written = 0;

  for (let i = 0; i < batch.length; i += PARALLEL) {
    const chunk = batch.slice(i, i + PARALLEL);
    const results = await Promise.all(chunk.map(f => fetchAndParse(f)));

    const records = [];
    for (let j = 0; j < chunk.length; j++) {
      if (results[j]) {
        records.push(buildRecord(results[j], chunk[j]));
      }
    }

    if (records.length > 0) {
      const lines = records.map(r => JSON.stringify(r)).join('\n') + '\n';
      fs.appendFileSync(outputPath, lines);
      written += records.length;
    }

    if ((i + PARALLEL) % 50 === 0 || i + PARALLEL >= batch.length) {
      console.log(`  Processed ${Math.min(i + PARALLEL, batch.length)}/${batch.length} (${written} written)`);
    }
  }

  console.log(`Done. Wrote ${written} records. Next batch: ${batchStart + batchSize}`);
  if (batchStart + batchSize < files.length) {
    console.log(`Run again with: node fetch-aws-schemas.mjs ${batchStart + batchSize} ${batchSize}`);
  } else {
    console.log('ALL DONE — all AWS datasets processed.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
