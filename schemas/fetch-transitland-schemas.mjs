// Fetches GTFS feed metadata from Transitland Atlas GitHub repo
// Each feed JSON file describes a transit agency and its data feeds
import fs from 'fs';

const files = fs.readFileSync('D:/Projects/wa-data-catalog/schemas/tl_feed_files.txt', 'utf8')
  .split('\n').filter(Boolean);
const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/gtfs-transitland.jsonl';
const BATCH = 20;

const gtfsCols = [
  { name: 'agency', field_name: 'agency.txt', type: 'text', description: 'Transit agency info' },
  { name: 'routes', field_name: 'routes.txt', type: 'text', description: 'Transit routes' },
  { name: 'trips', field_name: 'trips.txt', type: 'text', description: 'Trips for each route' },
  { name: 'stops', field_name: 'stops.txt', type: 'text', description: 'Stop locations' },
  { name: 'stop_times', field_name: 'stop_times.txt', type: 'text', description: 'Arrival/departure times at stops' },
  { name: 'calendar', field_name: 'calendar.txt', type: 'text', description: 'Service schedules' },
  { name: 'shapes', field_name: 'shapes.txt', type: 'text', description: 'Route geometries' },
];

async function fetchFeed(path) {
  const url = `https://raw.githubusercontent.com/transitland/transitland-atlas/main/${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

function buildRecord(data, path) {
  const slug = path.replace('feeds/', '').replace('.json', '');
  const feeds = data.feeds || [];
  const operators = data.operators || [];
  const opName = operators[0]?.name || operators[0]?.short_name || slug;
  const opWebsite = operators[0]?.website || '';
  const tags = operators[0]?.tags || {};

  // Find GTFS static feed
  const gtfsFeed = feeds.find(f => f.spec === 'gtfs') || feeds[0] || {};
  const gtfsRt = feeds.filter(f => f.spec === 'gtfs-rt');

  // Guess geography
  let geo = 'varies';
  let geoDetail = null;
  const places = (operators[0]?.associated_feeds || []).concat(tags?.us_ntd_id ? ['US'] : []);
  if (opWebsite.includes('.wa.') || opName.match(/washington|seattle|king county|pierce|spokane|tacoma/i)) {
    geo = 'wa_state'; geoDetail = 'Washington State';
  } else if (tags?.us_ntd_id || opWebsite.match(/\.gov|\.us|\.org/) && !opWebsite.match(/\.ca\.|\.uk\.|\.au\./)) {
    geo = 'us_national';
  }

  return {
    id: `gtfs:${slug}`,
    name: opName,
    provider: opName,
    source_portal: 'transit.land',
    source_platform: 'gtfs',
    url: gtfsFeed.url || opWebsite || `https://transit.land/feeds/${slug}`,
    api_endpoint: gtfsFeed.url || null,
    documentation_url: opWebsite || 'https://gtfs.org/documentation/schedule/reference/',
    access_method: 'download',
    format: ['csv', 'zip', ...(gtfsRt.length ? ['protobuf'] : [])],
    geographic_scope: geo,
    geographic_detail: geoDetail,
    domain: 'transportation',
    category: 'transit_schedules',
    update_frequency: 'weekly',
    row_count: null,
    column_count: 7,
    columns: gtfsCols,
    tags: ['gtfs', 'transit', 'public-transportation', ...(gtfsRt.length ? ['gtfs-rt', 'realtime'] : [])],
    description: `GTFS transit schedule data for ${opName}.${gtfsRt.length ? ' Includes ' + gtfsRt.length + ' real-time feeds.' : ''} Contains routes, trips, stops, stop_times, calendar, and shapes.`,
    has_realtime: gtfsRt.length > 0,
    feed_count: feeds.length,
    last_updated: null,
    created_at: null,
    collected_at: new Date().toISOString(),
  };
}

async function main() {
  console.log(`Processing ${files.length} Transitland feed files...`);
  fs.writeFileSync(OUTPUT, '');
  let written = 0;

  for (let i = 0; i < files.length; i += BATCH) {
    const batch = files.slice(i, i + BATCH);
    const results = await Promise.all(batch.map(f => fetchFeed(f)));

    const records = [];
    for (let j = 0; j < batch.length; j++) {
      if (results[j]) records.push(buildRecord(results[j], batch[j]));
    }

    if (records.length) {
      fs.appendFileSync(OUTPUT, records.map(r => JSON.stringify(r)).join('\n') + '\n');
      written += records.length;
    }

    if ((i + BATCH) % 100 === 0 || i + BATCH >= files.length) {
      console.log(`  ${Math.min(i + BATCH, files.length)}/${files.length} processed (${written} written)`);
    }
  }

  console.log(`Done. Wrote ${written} GTFS transit feed records`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
