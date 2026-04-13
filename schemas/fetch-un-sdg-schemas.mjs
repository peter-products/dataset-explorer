// Fetches UN SDG indicator metadata — all Sustainable Development Goal indicators
import fs from 'fs';

const OUTPUT = 'D:/Projects/wa-data-catalog/schemas/un-sdg.jsonl';

async function fetchGoals() {
  const res = await fetch('https://unstats.un.org/sdgapi/v1/sdg/Goal/List?includechildren=true');
  return res.json();
}

async function fetchIndicators() {
  const res = await fetch('https://unstats.un.org/sdgapi/v1/sdg/Indicator/List');
  return res.json();
}

function guessDomain(goal) {
  const goalDomains = {
    1: 'finance', 2: 'agriculture', 3: 'health', 4: 'education',
    5: 'demographics', 6: 'environment', 7: 'energy', 8: 'labor',
    9: 'transportation', 10: 'finance', 11: 'demographics', 12: 'environment',
    13: 'environment', 14: 'natural_resources', 15: 'natural_resources',
    16: 'public_safety', 17: 'finance',
  };
  return goalDomains[goal] || 'unknown';
}

async function main() {
  console.log('Fetching UN SDG indicators...');
  const [goals, indicators] = await Promise.all([fetchGoals(), fetchIndicators()]);
  console.log(`Goals: ${goals.length}, Indicators: ${indicators.length}`);

  const goalMap = {};
  goals.forEach(g => { goalMap[g.code] = g.title; });

  const records = indicators.map(ind => {
    const goalCode = parseInt(ind.goal);
    return {
      id: `un-sdg:${ind.code}`,
      name: ind.description || ind.code,
      provider: 'United Nations Statistics Division',
      source_portal: 'unstats.un.org',
      source_platform: 'api',
      url: `https://unstats.un.org/sdgs/indicators/database/?indicator=${ind.code}`,
      api_endpoint: `https://unstats.un.org/sdgapi/v1/sdg/Indicator/Data?indicator=${ind.code}`,
      documentation_url: `https://unstats.un.org/sdgs/metadata/?Text=&Goal=${ind.goal}&Target=${ind.target}`,
      access_method: 'api',
      format: ['json', 'csv'],
      geographic_scope: 'global',
      geographic_detail: null,
      domain: guessDomain(goalCode),
      category: `SDG ${ind.goal}: ${goalMap[String(ind.goal)] || ''}`,
      update_frequency: 'annual',
      row_count: null,
      column_count: 5,
      columns: [
        { name: 'geoAreaCode', field_name: 'geoAreaCode', type: 'text', description: 'Country/area code' },
        { name: 'geoAreaName', field_name: 'geoAreaName', type: 'text', description: 'Country/area name' },
        { name: 'timePeriodStart', field_name: 'timePeriodStart', type: 'date', description: 'Year' },
        { name: 'value', field_name: 'value', type: 'number', description: 'Indicator value' },
        { name: 'sex', field_name: 'sex', type: 'text', description: 'Sex disaggregation' },
      ],
      tags: [`SDG${ind.goal}`, `target-${ind.target}`],
      description: (ind.description || '').slice(0, 500),
      last_updated: null,
      created_at: null,
      collected_at: new Date().toISOString(),
    };
  });

  fs.writeFileSync(OUTPUT, records.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(`Wrote ${records.length} UN SDG indicator records`);
}

main().catch(err => { console.error(err.message); process.exit(1); });
