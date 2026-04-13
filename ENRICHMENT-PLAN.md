# Schema Enrichment Plan

## Purpose

Transform the raw JSONL schema records into vector-store-ready documents with explicit hierarchy, normalized publishers, size metrics, and thematic clustering. This runs **after** all raw schema collection is complete.

---

## Phase 1: Add Missing Raw Fields

These fields exist in the source APIs but aren't captured by the current fetch scripts.

### Task 1.1 — Row Counts and Last Updated (Socrata)

The Socrata metadata API exposes `row_count` and `data_updated_at` per dataset. The Discovery API response already includes `data_updated_at` — the fetch script reads it for frequency estimation but doesn't store it.

**Action**: Update `fetch-socrata-schemas.mjs` to store:
- `row_count` (from dataset metadata endpoint: `https://{domain}/api/views/{id}.json`)
- `column_count` (derive from `columns.length` — already available)
- `last_updated` (from `resource.data_updated_at` — already in API response)
- `created_at` (from `resource.createdAt`)
- `download_count` (from `resource.download_count` — already in API response)
- `page_views_total` (from `resource.page_views.page_views_total`)

Then re-run or patch all 79 existing JSONL files.

### Task 1.2 — Row Counts for Non-Socrata Sources

- **ArcGIS**: Feature layer metadata includes `recordCount` or can be queried via `?where=1=1&returnCountOnly=true`
- **BigQuery**: `INFORMATION_SCHEMA.TABLE_STORAGE` gives row counts
- **AWS Open Data**: No standard row count — estimate from file sizes where available

---

## Phase 2: Publisher Normalization

The `provider` field is inconsistent. "WA Dept of Health", "Washington State Department of Health", "DOH", "Willc13" all refer to the same agency.

### Task 2.1 — Extract Unique Publishers

From all JSONL files, extract every unique `provider` value and count how many datasets use each.

### Task 2.2 — Build Publisher Lookup Table

Create `publisher-lookup.json`:
```json
{
  "Washington State Department of Health": {
    "id": "wa-doh",
    "canonical_name": "Washington Department of Health",
    "short_name": "DOH",
    "parent": "wa-state",
    "type": "state_agency",
    "aliases": ["WA Dept of Health", "DOH", "Willc13", "doh.wa.gov"]
  }
}
```

**Method**: 
1. Extract all unique provider strings
2. Use an LLM to cluster aliases and assign canonical names
3. Manual review of the top 50 publishers (covers 90%+ of records)
4. Assign stable IDs

### Task 2.3 — Apply to All Records

Add `publisher_normalized` and `publisher_id` fields to every JSONL record using the lookup table.

---

## Phase 3: Hierarchy Assignment

Each record needs an explicit navigation path for the data explorer viz.

### Task 3.1 — Define Galaxy Taxonomy

```
Galaxy (Level 1)
├── us_government         # All US government data (federal, state, local)
├── international_government  # Non-US government data
├── cloud_warehouses      # BigQuery, AWS, Snowflake, Azure
├── research_academic     # Kaggle, HuggingFace, Zenodo, ICPSR
└── domain_specific       # Health-specific, transport-specific portals
```

### Task 3.2 — Define Solar System Rules

```
Solar System (Level 2) — within each galaxy
us_government:
├── federal               # CDC, DOT, NASA, etc.
├── washington_state       # data.wa.gov + WA agency portals
├── new_york              # NY state + NYC
├── california            # CA portals
├── texas                 # TX portals
├── (one per state that has data)
├── multi_state_counties  # Counties outside their state grouping
└── multi_state_cities    # Cities outside their state grouping

cloud_warehouses:
├── bigquery
├── aws_open_data
├── snowflake
└── azure
```

### Task 3.3 — Define Planet Rules

```
Planet (Level 3) — within each solar system
washington_state:
├── dept_of_health
├── ospi_education
├── fish_and_wildlife
├── dept_of_ecology
├── dept_of_licensing
├── public_disclosure_commission
├── king_county
├── seattle
├── pierce_county
├── (one per agency/jurisdiction with data)
└── other_wa
```

Planets are derived from `publisher_normalized` after Phase 2.

### Task 3.4 — Define Continent Rules (Thematic Clusters)

```
Continent (Level 4) — within each planet
dept_of_health:
├── vital_statistics       # Births, deaths
├── disease_surveillance   # Communicable disease tracking
├── provider_credentials   # Licensed health providers
├── environmental_health   # Lead testing, water quality
├── facility_data          # Hospitals, clinics
└── immunization           # Vaccination data by school
```

**Method**: Use an LLM to cluster datasets within each planet:
1. For each planet (publisher), collect all dataset names + descriptions + column names
2. Prompt: "Group these datasets into 3-8 thematic clusters. Name each cluster."
3. Store the cluster assignment per record

### Task 3.5 — Write Hierarchy to Records

Add to every JSONL record:
```json
{
  "hierarchy": {
    "galaxy": "us_government",
    "galaxy_label": "US Government",
    "solar_system": "washington_state",
    "solar_system_label": "Washington State",
    "planet": "wa-doh",
    "planet_label": "Department of Health",
    "continent": "environmental_health",
    "continent_label": "Environmental Health"
  }
}
```

---

## Phase 4: Deduplication

Many datasets appear on multiple portals (e.g., a DOH dataset on both doh.wa.gov and data.wa.gov).

### Task 4.1 — Generate Dedup Keys

For each record, create a dedup key from: `publisher_id + normalized_name + column_signature`

Column signature = sorted hash of column field names — two datasets with the same columns from the same publisher are likely the same data.

### Task 4.2 — Flag Duplicates

Don't delete — flag with `dedup_group` ID so the viz can show one canonical instance and note "also available on X portal."

---

## Phase 5: Size and Importance Scoring

For the viz, objects need relative sizing.

### Task 5.1 — Compute Size Category

Based on `row_count`:
- `tiny`: < 100 rows
- `small`: 100 - 10K
- `medium`: 10K - 1M
- `large`: 1M - 100M
- `massive`: > 100M

### Task 5.2 — Compute Freshness Category

Based on `last_updated`:
- `live`: updated within 24 hours
- `recent`: updated within 30 days
- `stale`: updated within 1 year
- `archive`: not updated in 1+ years

### Task 5.3 — Compute Richness Score

Based on schema complexity:
- Column count
- Description completeness (has description vs. blank)
- Column description completeness
- Number of tags

This is NOT an arbitrary composite score — it's a rendering hint for the viz (richer datasets get more visual detail).

---

## Phase 6: Semantic Descriptions (for Vector Store)

### Task 6.1 — Generate Dataset Summaries

For each dataset, use an LLM to generate a 1-2 sentence natural language summary from:
- Dataset name
- Description (if available)
- Column names and types
- Publisher and category

Example output: "Monthly counts of communicable disease cases reported to the Washington State Department of Health, broken down by disease type, county, and year. Includes case counts, incidence rates, and population denominators."

### Task 6.2 — Generate Column-Level Descriptions

For columns with no description, use the LLM to infer one from:
- Column name
- Data type
- Dataset context
- Sibling column names

### Task 6.3 — Generate Embedding Text

Concatenate into a single text block per record for embedding:
```
{dataset_summary}
Published by: {publisher_normalized}
Category: {domain}
Columns: {comma-separated column names with types}
Tags: {tags}
Geography: {geographic_detail}
```

This is the text that gets embedded into the vector store.

---

## Phase 7: Export for Vector Store

### Task 7.1 — Merge All JSONL into Single File

Combine all 79+ JSONL files into one `all-schemas-enriched.jsonl` with all enrichment fields.

### Task 7.2 — Generate Embedding-Ready Export

Create `embeddings-input.jsonl` with just:
```json
{
  "id": "wa-gov:qxh8-f4bd",
  "text": "embedding text from 6.3",
  "metadata": {
    "hierarchy": {...},
    "url": "...",
    "api_endpoint": "...",
    "format": [...],
    "size_category": "...",
    "freshness": "...",
    "publisher": "...",
    "geographic_scope": "..."
  }
}
```

### Task 7.3 — Generate Viz-Ready Export

Create `viz-data.json` — a nested tree structure for the data explorer:
```json
{
  "galaxies": [
    {
      "id": "us_government",
      "label": "US Government",
      "solar_systems": [
        {
          "id": "washington_state",
          "label": "Washington State",
          "dataset_count": 3353,
          "planets": [...]
        }
      ]
    }
  ]
}
```

---

## Execution Order

1. **Collect all remaining raw schemas** (ArcGIS, BigQuery, AWS) — current task
2. Phase 1 (add missing raw fields) — can run immediately on Socrata data
3. Phase 2 (publisher normalization) — prerequisite for everything below
4. Phase 3 (hierarchy) — depends on Phase 2
5. Phase 4 (dedup) — depends on Phase 2
6. Phase 5 (size/importance) — depends on Phase 1
7. Phase 6 (semantic descriptions) — depends on Phases 2-5
8. Phase 7 (export) — final step

Phases 1-2 can start before non-Socrata collection finishes. Phases 4-5 are independent of each other. Phase 6 is the most expensive (LLM calls per record) but can be batched.
