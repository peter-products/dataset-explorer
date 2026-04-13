# A/B Test: Dataset Schema Enrichment — Qwen 3.5 9B vs Gemma 4 E2B

## Purpose

Compare two local Ollama models on a **dataset classification and description** task. Pick the one that produces the best domain labels and summaries for 200K dataset schema records, running on the GTX 1070 (8GB VRAM).

## Prior Learnings Applied

From `D:\Projects\local-llm-best-practices.md`:
- Always use Ollama `format` parameter with JSON schema (grammar-constrained generation)
- Use `think: false` for Qwen models (otherwise returns empty response)
- Keep prompts short (~500 words max)
- Pre-warm model before batch loop
- Outer loop on model, inner loop on items (avoid VRAM reload thrashing)
- Budget for thermal throttling on GTX 1070 after sustained inference
- Checkpoint after each SUCCESS, not failure

From `D:\Projects\job-tracker\ab-test-spec.md`:
- Score on: grounding, completeness, format compliance, speed, determinism
- Anti-hallucination rules must be explicit in prompt
- Post-processor validates enum values

## Task Definition

For each dataset schema record, the model must produce:

```json
{
  "domain": "one of 15 allowed values or null",
  "summary": "1-2 sentence specific description of the data"
}
```

### Domain (classification — constrained by schema enum)
One of: `health`, `education`, `transportation`, `environment`, `finance`, `public_safety`, `elections`, `labor`, `demographics`, `natural_resources`, `technology`, `legal`, `energy`, `agriculture`, `housing`

Or `null` if genuinely unclassifiable.

### Summary (free text — quality depends on model)
- Must describe what the data CONTAINS, not what the publisher does
- Must be specific: "Monthly building permit counts by neighborhood and type" not "Data about permits"
- Must be grounded in the input fields (name, columns, tags, description)
- 1-2 sentences max

## Test Design

### Sample Selection
50 records, hand-picked to cover:
- 10 easy cases (strong signals in name/columns/tags — e.g., "NYC Taxi Trips" with lat/lon/fare columns)
- 10 ambiguous cases (generic names, few columns — e.g., "layer_0" with only geometry columns)
- 10 misclassified cases (the deterministic enrichment got the domain wrong — we know the right answer)
- 10 sparse cases (no description, no columns, only name and tags)
- 10 international/non-English (French, Italian, Colombian datasets with non-English descriptions)

### Ground Truth
I (Claude) will produce the ground truth for all 50 records before either model runs. This is the scoring rubric.

### Metrics

| Metric | How to measure | Weight |
|---|---|---|
| **Domain accuracy** | % of records where model matches ground truth domain | 40% |
| **Summary quality** | 1-5 score per record: 1=wrong/hallucinated, 3=generic but correct, 5=specific and useful | 30% |
| **Speed** | Seconds per record (median, p95) | 15% |
| **Null handling** | Does the model correctly return null for unclassifiable records instead of guessing? | 10% |
| **Format compliance** | % of records that parse as valid JSON with both required fields | 5% |

Format compliance should be ~100% for both models with schema enforcement; it's included as a safety check.

### Scoring
- Domain accuracy: exact match to ground truth (15 categories + null)
- Summary quality: scored by Claude in a follow-up pass comparing model output vs record metadata
- Speed: wall-clock time from Ollama API call to response

## Schema for Ollama `format` Parameter

```json
{
  "type": "object",
  "properties": {
    "domain": {
      "type": ["string", "null"],
      "enum": [
        "health", "education", "transportation", "environment", "finance",
        "public_safety", "elections", "labor", "demographics",
        "natural_resources", "technology", "legal", "energy",
        "agriculture", "housing", null
      ]
    },
    "summary": {
      "type": "string"
    }
  },
  "required": ["domain", "summary"]
}
```

## Prompt Template

```
You classify datasets and write short descriptions. You receive a dataset's name, publisher, description, column names, and tags.

RULES:
1. Choose the BEST matching domain from the allowed list. If genuinely unclear, return null.
2. Write 1-2 sentences describing what the data CONTAINS and who would use it.
3. Be SPECIFIC — mention actual column content, not generic descriptions.
4. Base everything on the input fields. Do NOT use outside knowledge.
5. If the input has very little information, say so rather than guessing.

ALLOWED DOMAINS: health, education, transportation, environment, finance, public_safety, elections, labor, demographics, natural_resources, technology, legal, energy, agriculture, housing

DATASET:
Name: {name}
Publisher: {publisher}
Description: {description}
Columns: {columns}
Tags: {tags}

Return JSON only.
```

## Execution

### Prerequisites
1. Ollama running: check `curl http://localhost:11434/api/tags`
2. Both models installed: `qwen3.5:9b` and `gemma4:e2b`

### Run Script

```bash
cd D:\Projects\wa-data-catalog\schemas
node ab-test-enrichment.mjs
```

The script:
1. Extracts the 50 test records from `llm-enrichment-sample.jsonl`
2. Pre-warms Model A (gemma4:e2b)
3. Processes all 50 records with Model A, saving results + timing
4. Pre-warms Model B (qwen3.5:9b)
5. Processes all 50 records with Model B, saving results + timing
6. Writes results to `ab-test-results.json`

### Output Format

```json
{
  "model_a": {
    "name": "gemma4:e2b",
    "results": [
      {
        "record_index": 0,
        "input_name": "Traffic speed camera locations",
        "domain": "transportation",
        "summary": "...",
        "elapsed_ms": 3200,
        "ground_truth_domain": "transportation"
      }
    ],
    "stats": {
      "domain_accuracy": 0.92,
      "median_ms": 3100,
      "p95_ms": 5400,
      "format_compliance": 1.0,
      "null_correct": 0.8
    }
  },
  "model_b": { ... }
}
```

### Evaluation
After both models run, Claude scores summary quality (1-5) for each record and computes the weighted final score.

## Expected Outcome

Based on prior A/B tests (job extraction):
- **Gemma 4 E2B**: likely ~3.3x faster, better at respecting "don't guess" rules, may be less thorough on summaries
- **Qwen 3.5 9B**: likely more detailed summaries, may over-classify (fewer nulls), slower

The winner runs on the full 200K records.

## Time Budget

- 50 records × 2 models = 100 inference calls
- Gemma: ~3-5s/call = ~4 min
- Qwen: ~8-15s/call = ~10 min
- Total with warmup + scoring: ~20 minutes
