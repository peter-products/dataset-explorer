// Fetches complete BigQuery public dataset schemas via authenticated API
// Prerequisites: gcloud auth application-default login
// Usage: node fetch-bigquery-schemas-auth.mjs

import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';

const PROJECT = 'bigquery-public-data';
const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/bigquery.jsonl';
const CONCURRENCY = 5;

const bqTypeMap = {
  'STRING': 'text',
  'BYTES': 'blob',
  'INTEGER': 'number',
  'INT64': 'number',
  'FLOAT': 'number',
  'FLOAT64': 'number',
  'NUMERIC': 'number',
  'BIGNUMERIC': 'number',
  'BOOLEAN': 'boolean',
  'BOOL': 'boolean',
  'TIMESTAMP': 'date',
  'DATE': 'date',
  'TIME': 'date',
  'DATETIME': 'date',
  'GEOGRAPHY': 'geometry',
  'RECORD': 'text',
  'STRUCT': 'text',
  'JSON': 'text',
};

function guessDomain(datasetId, description) {
  const text = (datasetId + ' ' + (description || '')).toLowerCase();
  if (text.match(/crypto|bitcoin|ethereum|blockchain/)) return 'finance';
  if (text.match(/census|population|name|demographic/)) return 'demographics';
  if (text.match(/noaa|weather|climate|ghcn|gsod|goes|hurricane|lightning/)) return 'environment';
  if (text.match(/epa|air.quality|openaq|tree|breathe/)) return 'environment';
  if (text.match(/taxi|bike|citibike|nhtsa|traffic|transport/)) return 'transportation';
  if (text.match(/crime|police|sfpd|fbi|nics|311/)) return 'public_safety';
  if (text.match(/health|medicare|cms|fda|rxnorm|disease|covid|genome|cancer|idc/)) return 'health';
  if (text.match(/bls|world.bank|iowa.liquor|sec|fdic|econom/)) return 'finance';
  if (text.match(/github|stackoverflow|hacker.news|wikipedia|google.trend|analytic|deps.dev/)) return 'technology';
  if (text.match(/patent/)) return 'legal';
  if (text.match(/election|politic/)) return 'elections';
  if (text.match(/geo|openstreetmap|overture|boundary|natural.earth|port/)) return 'demographics';
  if (text.match(/solar|sunroof|energy|utility/)) return 'energy';
  if (text.match(/baseball|ncaa|basketball/)) return 'demographics';
  if (text.match(/bbc|gdelt|film/)) return 'technology';
  if (text.match(/ml.dataset|sample|thelook/)) return 'technology';
  return 'unknown';
}

function guessGeo(datasetId) {
  const id = datasetId.toLowerCase();
  if (id.match(/new.york|nyc|chicago|austin|san.francisco|london/)) return 'us_city';
  if (id.match(/usa|census|iowa|fbi|nhtsa|bls|sec|fdic/)) return 'us_national';
  if (id.match(/world|international|global|gdelt/)) return 'global';
  return 'varies';
}

async function getTableMeta(bq, datasetId, tableId) {
  try {
    const [meta] = await bq.dataset(datasetId, { projectId: PROJECT })
      .table(tableId).getMetadata();
    return meta;
  } catch (e) {
    return null;
  }
}

async function processInBatches(items, fn, concurrency) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
  }
  return results;
}

async function main() {
  const bq = new BigQuery({ projectId: PROJECT });

  // Step 1: List all datasets
  console.log(`Listing datasets in ${PROJECT}...`);
  const [datasets] = await bq.getDatasets({ projectId: PROJECT, maxResults: 1000 });
  console.log(`Found ${datasets.length} datasets`);

  // Clear output file
  fs.writeFileSync(OUTPUT, '');

  let totalTables = 0;
  let totalColumns = 0;

  for (let di = 0; di < datasets.length; di++) {
    const ds = datasets[di];
    const dsId = ds.id;
    const dsMeta = ds.metadata || {};

    // Step 2: List tables in dataset
    let tables;
    try {
      const [t] = await ds.getTables({ maxResults: 500 });
      tables = t;
    } catch (e) {
      console.log(`  [${di + 1}/${datasets.length}] ${dsId}: ERROR listing tables - ${e.message}`);
      // Write minimal record
      const record = {
        id: `bigquery-public-data.${dsId}`,
        name: dsId,
        provider: 'Google (BigQuery Public Datasets Program)',
        source_portal: 'bigquery-public-data',
        source_platform: 'bigquery',
        url: `https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=${dsId}&page=dataset`,
        api_endpoint: `bigquery-public-data.${dsId}`,
        documentation_url: `https://console.cloud.google.com/marketplace/browse?filter=solution-type:dataset&q=${dsId}`,
        access_method: 'sql',
        format: ['sql', 'csv', 'json'],
        geographic_scope: guessGeo(dsId),
        geographic_detail: null,
        domain: guessDomain(dsId, ''),
        category: null,
        update_frequency: 'unknown',
        row_count: null,
        column_count: null,
        columns: [],
        tables: [],
        tags: ['bigquery', 'public-data'],
        description: dsMeta.description || '',
        last_updated: null,
        created_at: null,
        collected_at: new Date().toISOString(),
      };
      fs.appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
      continue;
    }

    // Step 3: Get metadata for each table (batched)
    const tableMetas = await processInBatches(
      tables,
      async (t) => {
        const meta = await getTableMeta(bq, dsId, t.id);
        return { id: t.id, meta };
      },
      CONCURRENCY
    );

    // Build columns from all tables combined
    const allColumns = [];
    const tableList = [];
    let totalRows = 0;

    for (const { id: tableId, meta } of tableMetas) {
      if (!meta) {
        tableList.push({ name: tableId, row_count: null, column_count: null });
        continue;
      }

      const schema = meta.schema || {};
      const fields = schema.fields || [];
      const numRows = parseInt(meta.numRows || '0');
      totalRows += numRows;

      tableList.push({
        name: tableId,
        row_count: numRows || null,
        column_count: fields.length,
      });

      for (const f of fields) {
        allColumns.push({
          name: f.name,
          field_name: `${tableId}.${f.name}`,
          type: bqTypeMap[f.type] || 'text',
          description: f.description || null,
          table: tableId,
        });
      }
    }

    totalTables += tables.length;
    totalColumns += allColumns.length;

    const description = dsMeta.description || '';
    const record = {
      id: `bigquery-public-data.${dsId}`,
      name: dsId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      provider: 'Google (BigQuery Public Datasets Program)',
      source_portal: 'bigquery-public-data',
      source_platform: 'bigquery',
      url: `https://console.cloud.google.com/bigquery?p=bigquery-public-data&d=${dsId}&page=dataset`,
      api_endpoint: `bigquery-public-data.${dsId}`,
      documentation_url: `https://console.cloud.google.com/marketplace/browse?filter=solution-type:dataset&q=${dsId}`,
      access_method: 'sql',
      format: ['sql', 'csv', 'json'],
      geographic_scope: guessGeo(dsId),
      geographic_detail: null,
      domain: guessDomain(dsId, description),
      category: null,
      update_frequency: 'unknown',
      row_count: totalRows || null,
      column_count: allColumns.length,
      columns: allColumns,
      tables: tableList,
      tags: ['bigquery', 'public-data'],
      description: description.slice(0, 500),
      last_updated: dsMeta.lastModifiedTime ? new Date(parseInt(dsMeta.lastModifiedTime)).toISOString() : null,
      created_at: dsMeta.creationTime ? new Date(parseInt(dsMeta.creationTime)).toISOString() : null,
      collected_at: new Date().toISOString(),
    };

    fs.appendFileSync(OUTPUT, JSON.stringify(record) + '\n');
    console.log(`  [${di + 1}/${datasets.length}] ${dsId}: ${tables.length} tables, ${allColumns.length} columns, ${totalRows.toLocaleString()} rows`);
  }

  console.log(`\nDone. Wrote ${datasets.length} dataset records to bigquery.jsonl`);
  console.log(`Total: ${totalTables} tables, ${totalColumns} columns`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
