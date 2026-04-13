// Fetches French open data portal (data.gouv.fr) dataset metadata
// Uses their custom API (not CKAN)
import fs from 'fs';

const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/france.jsonl';
const API = 'https://www.data.gouv.fr/api/1/datasets/';
const PER_PAGE = 100;
const MAX_PAGES = 50; // 5000 datasets

async function fetchPage(page) {
  const url = `${API}?page=${page}&page_size=${PER_PAGE}&sort=-created`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function guessDomain(tags, title) {
  const text = [...(tags || []), title || ''].join(' ').toLowerCase();
  if (text.match(/santé|health|hôpital|médic|covid/)) return 'health';
  if (text.match(/éducation|education|école|school|universit/)) return 'education';
  if (text.match(/transport|mobilit|route|ferroviaire|train/)) return 'transportation';
  if (text.match(/environnement|écolog|climat|pollution|eau|water/)) return 'environment';
  if (text.match(/énergie|energy|électric/)) return 'energy';
  if (text.match(/emploi|travail|chômage|labor|employment/)) return 'labor';
  if (text.match(/budget|finance|impôt|tax|économi|commerce/)) return 'finance';
  if (text.match(/population|démograph|census|logement|housing/)) return 'demographics';
  if (text.match(/agriculture|alimenta|farm/)) return 'agriculture';
  if (text.match(/justice|police|sécurité|crime|délinqu/)) return 'public_safety';
  if (text.match(/élection|vote|electoral/)) return 'elections';
  return 'unknown';
}

async function main() {
  console.log('Fetching data.gouv.fr datasets...');
  fs.writeFileSync(OUTPUT, '');
  let total = 0;

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const data = await fetchPage(page);
      if (!data.data || !data.data.length) { console.log('No more results at page', page); break; }

      const records = data.data.map(d => {
        const tags = (d.tags || []);
        const resources = d.resources || [];
        const formats = [...new Set(resources.map(r => (r.format || '').toLowerCase()).filter(Boolean))];
        return {
          id: 'france:' + d.id,
          name: d.title || d.slug,
          provider: d.organization?.name || 'Unknown',
          source_portal: 'data.gouv.fr',
          source_platform: 'custom',
          url: d.page || 'https://www.data.gouv.fr/fr/datasets/' + d.slug,
          api_endpoint: d.resources?.[0]?.url || null,
          documentation_url: d.page || null,
          access_method: 'download',
          format: formats.length ? formats : ['unknown'],
          geographic_scope: 'global',
          geographic_detail: 'France',
          domain: guessDomain(tags, d.title),
          category: tags[0] || null,
          update_frequency: d.frequency === 'daily' ? 'daily' : d.frequency === 'weekly' ? 'weekly' : d.frequency === 'monthly' ? 'monthly' : d.frequency === 'quarterly' ? 'quarterly' : d.frequency === 'annual' ? 'annual' : 'unknown',
          row_count: null,
          column_count: null,
          columns: [],
          tags,
          description: (d.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
          last_updated: d.last_modified || d.last_update || null,
          created_at: d.created_at || null,
          collected_at: new Date().toISOString(),
        };
      });

      fs.appendFileSync(OUTPUT, records.map(r => JSON.stringify(r)).join('\n') + '\n');
      total += records.length;
      console.log(`  Page ${page}: ${records.length} datasets (${total} total)`);
    } catch (e) {
      console.log(`  Page ${page} error:`, e.message);
      break;
    }
  }

  console.log(`Done. Wrote ${total} French open data records`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
