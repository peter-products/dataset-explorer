# LLM Enrichment Guide — 200K Dataset Schemas

## What This Is

We have 200,291 dataset schema records in `D:\Projects\wa-data-catalog\schemas\enriched\` (183 JSONL files). Each record has been through deterministic enrichment (publisher normalization, hierarchy assignment, size/freshness categories). What's missing is **LLM-quality domain classification and semantic descriptions** for every record.

A 10% sample (20,101 records) is at `D:\Projects\wa-data-catalog\schemas\llm-enrichment-sample.jsonl`.

## What the LLM Needs to Produce

For each record, generate exactly two fields:

1. **`domain`** — one of these 15 values (no others):
   `health`, `education`, `transportation`, `environment`, `finance`, `public_safety`, `elections`, `labor`, `demographics`, `natural_resources`, `technology`, `legal`, `energy`, `agriculture`, `housing`

2. **`summary`** — 1-2 sentences describing what the dataset actually contains and who would use it. Be specific to the data, not generic.

## Input Format

Each record in the JSONL files has these relevant fields:
- `name` — dataset name
- `publisher_normalized` — who published it
- `description` — original description (may be empty, truncated, or HTML-stripped)
- `columns` — array of `{name, field_name, type, description}` (the most useful signal)
- `tags` — array of keyword strings
- `category` — original category from source portal
- `domain` — current classification (may be "unknown" or wrong — this is what you're fixing)
- `geographic_detail` — geography if known

## Processing Instructions

### Step 1: Read a batch of records

Read 50-100 records at a time from the JSONL file. For each record, extract a compact representation:

```
[index] name | publisher | current_domain
  desc: first 150 chars of description
  cols: first 8 column names
  tags: first 5 tags
```

Use this bash command to extract a batch:
```bash
cd D:/Projects/wa-data-catalog/schemas
node -e "
const lines = require('fs').readFileSync('llm-enrichment-sample.jsonl', 'utf8').trim().split('\n').slice(START, END);
lines.forEach((l, i) => {
  try {
    const r = JSON.parse(l);
    const cols = (r.columns || []).slice(0, 8).map(c => c.name).join(', ');
    console.log('[' + (START + i) + '] ' + (r.name||'').slice(0,60) + ' | ' + (r.publisher_normalized||r.provider||'').slice(0,30) + ' | dom=' + r.domain);
    if (r.description) console.log('  d: ' + r.description.slice(0, 150));
    if (cols) console.log('  c: ' + cols);
    if (r.tags?.length) console.log('  t: ' + r.tags.slice(0, 5).join(', '));
    console.log('');
  } catch(e) {}
});
"
```

Replace `START` and `END` with the batch range (e.g., 0/50, 50/100, 100/150...).

### Step 2: Generate enrichments

For each record in the batch, produce a JSON array entry:

```json
{"i": 0, "domain": "transportation", "summary": "Location coordinates and types of traffic enforcement cameras across the ACT, useful for road safety analysis."}
```

**Rules for domain classification:**
- Choose based on what the DATA contains, not who published it. A health department publishing parking data → `transportation`, not `health`.
- Column names are the strongest signal. If columns include `latitude, longitude, route_id, stop_name` → `transportation`.
- When ambiguous, prefer the more specific domain. Government spending → `finance`. School enrollment → `education`. Hospital locations → `health` (not `demographics`).
- `demographics` is for population/census/survey data that doesn't fit a more specific category.
- `technology` is for software/code/ML/internet data.
- `housing` covers parcels, zoning, permits, property, real estate, and homelessness.
- `legal` covers courts, regulations, patents, trademarks, and professional licensing.

**Rules for summaries:**
- Be specific about what's IN the data. "Monthly counts of building permits by type and neighborhood" not "Data about building permits."
- Mention column-level detail when it adds value. "Includes contractor name, valuation, square footage, and permit status."
- Say who would use it when it's not obvious. "Used by transit planners for service optimization."
- Don't repeat the dataset name verbatim as the first words.
- Don't say "This dataset contains" — just describe what it is.
- 1-2 sentences max. No filler.

### Step 3: Write enrichment batch to file

Save each batch as `llm-batch-{N}.json`:

```json
[
  {"i": 0, "domain": "transportation", "summary": "..."},
  {"i": 1, "domain": "finance", "summary": "..."},
  ...
]
```

### Step 4: Apply enrichments to records

After generating a batch, apply it:

```bash
cd D:/Projects/wa-data-catalog/schemas
node -e "
const fs = require('fs');
const BATCH_FILE = 'llm-batch-N.json';  // Change N
const START = 0;  // Change to match batch start
const END = 50;   // Change to match batch end

const enrichments = JSON.parse(fs.readFileSync(BATCH_FILE, 'utf8'));
const allLines = fs.readFileSync('llm-enrichment-sample.jsonl', 'utf8').trim().split('\n');
const lines = allLines.slice(START, END);

const LABELS = { health: 'Health & Medicine', education: 'Education', transportation: 'Transportation', environment: 'Environment & Climate', finance: 'Finance & Economics', public_safety: 'Public Safety', elections: 'Elections & Politics', labor: 'Labor & Employment', demographics: 'Demographics', natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory', energy: 'Energy', agriculture: 'Agriculture & Food', housing: 'Housing & Land Use' };
const VALID = Object.keys(LABELS);

let changed = 0;
const output = [];

for (let i = 0; i < lines.length; i++) {
  const r = JSON.parse(lines[i]);
  const e = enrichments.find(x => x.i === i) || {};

  if (e.domain && VALID.includes(e.domain)) {
    if (e.domain !== r.domain) changed++;
    r.domain = e.domain;
    r.hierarchy.continent = e.domain;
    r.hierarchy.continent_label = LABELS[e.domain];
  }

  if (e.summary && e.summary.length > 20) {
    r.semantic_description = e.summary;
    const parts = [e.summary, 'Published by: ' + r.hierarchy.planet_label, 'Category: ' + LABELS[r.domain], 'Geography: ' + (r.geographic_detail || r.geographic_scope || 'varies')];
    const colNames = (r.columns || []).slice(0, 20).map(c => c.name);
    if (colNames.length) parts.push('Columns: ' + colNames.join(', '));
    r.embedding_text = parts.join('\\n');
  }

  r.llm_enriched = true;
  output.push(JSON.stringify(r));
}

fs.appendFileSync('llm-enrichment-output.jsonl', output.join('\\n') + '\\n');
console.log('Applied ' + output.length + ' enrichments (' + changed + ' domain changes). Total output: ' + fs.readFileSync('llm-enrichment-output.jsonl','utf8').trim().split('\\n').length);
"
```

### Step 5: Repeat for all batches

Process the full 20,101 records in the sample file in batches of 50. That's ~402 batches.

Track progress:
```bash
wc -l D:/Projects/wa-data-catalog/schemas/llm-enrichment-output.jsonl
```

When complete, the output file should have 20,101 lines.

---

## Processing the Remaining 184K

After the 10% sample is done, process the full enriched files the same way.

### Input files

All 183 files in `D:\Projects\wa-data-catalog\schemas\enriched\*.jsonl`.

### Process file by file

For each file:
1. Read the records in batches of 50-100
2. Generate domain + summary for each
3. Write enriched records to `D:\Projects\wa-data-catalog\schemas\final\{filename}`

Use the same extract → enrich → apply loop, but read from `enriched/{file}` and write to `final/{file}`.

```bash
# Create output directory
mkdir -p D:/Projects/wa-data-catalog/schemas/final

# Check progress
ls D:/Projects/wa-data-catalog/schemas/final/ | wc -l  # files done
cat D:/Projects/wa-data-catalog/schemas/final/*.jsonl 2>/dev/null | wc -l  # records done
```

### Prioritization

Process files in this order (highest impact first):

1. **WA state files** — `wa-gov.jsonl`, `wa-geo.jsonl`, `wa-*-arcgis.jsonl`, `seattle*.jsonl`, `king-county*.jsonl`, `pierce-county*.jsonl` (these matter most for the proof of concept)
2. **Large "unknown" files** — `utah.jsonl` (1,809 unknowns), `france.jsonl` (2,594), `italy.jsonl` (1,237), `canada.jsonl` (1,882), `colombia.jsonl` (4,250), `seattle.jsonl` (522), `eurostat.jsonl` (999)
3. **US federal** — `datagov-*.jsonl`, `us-federal-*.jsonl`
4. **Everything else**

### Quality Checks

After each file is complete:
```bash
# Check for remaining unknowns
grep -c '"domain":"unknown"' D:/Projects/wa-data-catalog/schemas/final/{filename}

# Verify record count matches
wc -l D:/Projects/wa-data-catalog/schemas/enriched/{filename}
wc -l D:/Projects/wa-data-catalog/schemas/final/{filename}
```

Target: <2% unknown domain across all files (currently 8.2%).

---

## What NOT to Do

- **Don't invent new domain categories.** Stick to the 15 listed. If something doesn't fit, use the closest match — `demographics` for general/survey data, `technology` for software/internet/ML, `finance` for government spending/economics.
- **Don't hallucinate column names or data content.** If the record has no description and no columns, write a summary based only on what's there (name + publisher + tags). Say "Details unavailable" rather than guessing.
- **Don't add extra fields** beyond `domain` and `summary`. The apply script handles `hierarchy.continent`, `hierarchy.continent_label`, `semantic_description`, `embedding_text`, and `llm_enriched` automatically.
- **Don't rewrite the original `description` field.** The `summary` goes into `semantic_description` — a new field. The original stays untouched.
- **Don't skip records.** Every record in the batch needs an entry in the output JSON, even if you can only produce `{"i": N, "domain": "unknown", "summary": "Insufficient metadata to classify."}`.

---

## Verification After All Processing

```bash
cd D:/Projects/wa-data-catalog/schemas

# Total record count should match
echo "Enriched:" && cat enriched/*.jsonl | wc -l
echo "Final:" && cat final/*.jsonl | wc -l

# Unknown domain count
echo "Unknowns remaining:" && grep -c '"domain":"unknown"' final/*.jsonl | grep -v ':0$'

# Spot check summaries
node -e "
const fs = require('fs');
const files = fs.readdirSync('final').filter(f => f.endsWith('.jsonl'));
const samples = [];
for (const f of files.slice(0, 10)) {
  const lines = fs.readFileSync('final/' + f, 'utf8').trim().split('\n');
  const r = JSON.parse(lines[Math.floor(lines.length / 2)]);
  samples.push({ file: f, name: r.name?.slice(0, 40), domain: r.domain, summary: r.semantic_description?.slice(0, 100) });
}
samples.forEach(s => console.log(s.file + ': [' + s.domain + '] ' + s.name + ' — ' + s.summary));
"
```

---

## Session Management

Each Claude Code session has a context window limit. For a long enrichment run:

- **Track your position**: Note which file and line offset you're on before the session ends.
- **Resume from where you left off**: Start the next session with "Continue LLM enrichment from file X, offset Y. Guide is at D:\Projects\wa-data-catalog\LLM-ENRICHMENT-GUIDE.md"
- **Save frequently**: The apply script appends to the output file, so progress isn't lost if a session ends.
- **One file at a time**: Complete each JSONL file before moving to the next. This makes it easy to track which files are done.