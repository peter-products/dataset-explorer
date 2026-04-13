// Fix common domain misclassifications
// Targets specific patterns where the heuristic was systematically wrong

const fs = require('fs');
const path = require('path');

const FINAL_DIR = './final';
const LABELS = {
  health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
  environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety',
  elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics',
  natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
  energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use'
};

const fixes = [
  // Building permits, zoning, land use → housing (not education, finance, public_safety, etc)
  {
    test: r => {
      const all = (String(r.name||'') + ' ' + String(r.description||'')).toLowerCase();
      return (all.includes('building permit') || all.includes('zoning') || (all.includes('land use') && all.includes('permit'))
        || all.includes('construction permit') || all.includes('demolition permit'))
        && r.domain !== 'housing';
    },
    fix: 'housing',
    label: 'building permits → housing',
  },
  // Plat/subdivision → housing
  {
    test: r => {
      const all = (String(r.name||'') + ' ' + String(r.description||'')).toLowerCase();
      return (all.includes('plat') && (all.includes('subdivision') || all.includes('lot')) || all.includes('preliminary plat'))
        && r.domain !== 'housing';
    },
    fix: 'housing',
    label: 'plats/subdivisions → housing',
  },
  // Property/parcel/assessment → housing (not finance)
  {
    test: r => {
      const name = String(r.name||'').toLowerCase();
      return (name.includes('parcel') || name.includes('property assessment') || name.includes('property valuation'))
        && r.domain === 'finance';
    },
    fix: 'housing',
    label: 'property assessment → housing',
  },
  // School/student/enrollment/graduation mislabeled as non-education
  {
    test: r => {
      const name = String(r.name||'').toLowerCase();
      return (name.includes('school') && (name.includes('enrollment') || name.includes('graduation') || name.includes('student')))
        && r.domain !== 'education';
    },
    fix: 'education',
    label: 'school enrollment → education',
  },
  // Crime/offense/arrest/911 calls → public_safety (not demographics or finance)
  {
    test: r => {
      const name = String(r.name||'').toLowerCase();
      return (name.includes('crime') || name.includes('offense') || name.includes('arrest') || name.includes('911 call'))
        && !['public_safety', 'legal'].includes(r.domain);
    },
    fix: 'public_safety',
    label: 'crime/arrest → public_safety',
  },
  // Hospital/clinic/health center → health
  {
    test: r => {
      const name = String(r.name||'').toLowerCase();
      return (name.includes('hospital') || name.includes('health center') || name.includes('health clinic'))
        && r.domain !== 'health';
    },
    fix: 'health',
    label: 'hospital/clinic → health',
  },
  // Road/street/pavement/bridge → transportation (not housing or demographics)
  {
    test: r => {
      const name = String(r.name||'').toLowerCase();
      return (name.includes('road') && (name.includes('condition') || name.includes('pavement') || name.includes('surface'))
        || name.includes('bridge') && name.includes('inspection'))
        && !['transportation', 'environment'].includes(r.domain);
    },
    fix: 'transportation',
    label: 'road/bridge → transportation',
  },
  // Voter/ballot/precinct result → elections
  {
    test: r => {
      const name = String(r.name||'').toLowerCase();
      return (name.includes('voter') && name.includes('turnout') || name.includes('ballot') && name.includes('result')
        || name.includes('precinct') && name.includes('result'))
        && r.domain !== 'elections';
    },
    fix: 'elections',
    label: 'voter/ballot results → elections',
  },
];

const files = fs.readdirSync(FINAL_DIR).filter(f => f.endsWith('.jsonl'));
let totalFixed = 0;
const fixCounts = {};

for (const f of files) {
  const filepath = path.join(FINAL_DIR, f);
  const lines = fs.readFileSync(filepath, 'utf8').trim().split('\n');
  let fileFixed = 0;
  const output = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const r = JSON.parse(line);
    let fixed = false;

    for (const rule of fixes) {
      try {
        if (rule.test(r)) {
          r.domain = rule.fix;
          r.hierarchy = r.hierarchy || {};
          r.hierarchy.continent = rule.fix;
          r.hierarchy.continent_label = LABELS[rule.fix];
          fixCounts[rule.label] = (fixCounts[rule.label] || 0) + 1;
          fixed = true;
          fileFixed++;
          break;
        }
      } catch (e) {}
    }

    output.push(JSON.stringify(r));
  }

  if (fileFixed > 0) {
    fs.writeFileSync(filepath, output.join('\n') + '\n');
    totalFixed += fileFixed;
  }
}

console.log('=== Domain Fix Results ===');
for (const [label, count] of Object.entries(fixCounts).sort((a,b) => b[1] - a[1])) {
  console.log(`  ${label}: ${count}`);
}
console.log(`\nTotal records fixed: ${totalFixed}`);
