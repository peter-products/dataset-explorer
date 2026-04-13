# Dataset Explorer

Semantic search across 200,000+ public dataset schemas from government portals, cloud warehouses, and research platforms.

## Why I built this

Public data is everywhere — data.gov, BigQuery, Snowflake Marketplace, AWS Open Data, Hugging Face, countless city and state portals. But discovering which dataset answers your question is brutally hard. Previous attempts (Google Dataset Search, data.world) were keyword-based and mediocre.

The insight: you don't need to query data to understand it. Column names, table names, descriptions, and data types carry enormous semantic signal. An LLM can infer what questions a dataset can answer without seeing a single row.

This project crawls and catalogs schemas from 17+ public data platforms, generates semantic descriptions and embeddings for each one, and serves a natural language search interface. Type "COVID hospitalizations by county" and get pointed to the exact datasets — with links to the source portal.

## What it does

- **Semantic search** over 200K dataset schemas using embeddings (nomic-embed-text via Ollama)
- **Faceted filtering** by category (15 domains), data format, geography, update frequency, and platform
- **Dataset detail pages** with full schema (column names, types, descriptions), source links, API endpoints
- **Deduplication** — identifies 30K duplicate records across portals, shows canonical entry with "also available on" links
- **Hybrid scoring** — 70% embedding similarity + 30% keyword overlap eliminates noise from generic records

## Architecture decisions worth calling out

| Decision | Why |
|---|---|
| **Schema-level reasoning, not row-level** | You can understand what a dataset contains from its columns + description without querying it. This makes the entire catalog searchable in <500ms. |
| **nomic-embed-text via Ollama** | Free, local, no API key. 768-dim embeddings are good enough for schema search. The 586MB index loads in ~10s. |
| **Brute-force cosine similarity** | 200K vectors fit in RAM. No need for a vector database at this scale. Simpler = fewer dependencies. |
| **Keyword overlap boost (30% weight)** | Pure embedding search returned irrelevant results — SEC EDGAR filings (10K records with near-identical descriptions) scored high on every query. Adding keyword matching fixed this. |
| **Heuristic + LLM hybrid classification** | Sonnet produces the best domain labels but is too slow for 200K records via subagents. Used Sonnet for high-priority files, heuristic rules for the bulk. A/B tested: Sonnet >> Gemma >> heuristic >> Haiku. |
| **Binary float32 embeddings** | Loading 200K × 768 as a typed array from a binary file is 10x faster than parsing JSON. |
| **Faceted counts from the matching set** | Sidebar counts reflect the current search results, not the full catalog. Clicking a filter narrows results and all other facet counts adjust — standard e-commerce UX. |
| **Score threshold (0.58)** | Too low (0.35) and 75% of records "match" any query. 0.58 gives 100–1,000 matches per query — reasonable for faceted exploration. |

## Data sources (200K+ records)

| Source | Records | Platform |
|---|---|---|
| data.gov (US federal) | 56,253 | CKAN |
| US city/state Socrata portals | 46,511 | Socrata |
| World Bank | 29,511 | API |
| Canada (open.canada.ca) | 20,000 | CKAN |
| SEC EDGAR companies | 10,426 | XBRL |
| Eurostat | 10,473 | API |
| France (data.gouv.fr) | 8,500 | CKAN |
| Colombia (datos.gov.co) | 8,413 | Socrata |
| HuggingFace | 5,000 | API |
| WA State ArcGIS portals | 3,960 | ArcGIS |
| Italy (dati.gov.it) | 3,000 | CKAN |
| WHO Global Health Observatory | 3,057 | API |
| + Kaggle, AWS, BigQuery, GTFS, FAO, ILO, UNESCO, UN SDG, Azure | ~5,000 | Various |

## Tech stack

- **Frontend**: React + Vite + Tailwind CSS v4
- **Backend**: Express (Node.js)
- **Embeddings**: nomic-embed-text via Ollama (768-dim, stored as binary float32)
- **Search**: Brute-force cosine similarity + keyword overlap boost
- **Data pipeline**: Node.js scripts for collection, enrichment, embedding generation

## Project structure

```
wa-data-catalog/
├── search-app/
│   ├── server/index.mjs           # Express search API
│   ├── client/src/                 # React frontend
│   │   ├── pages/SearchPage.jsx    # Landing + search results
│   │   ├── pages/DatasetPage.jsx   # Dataset detail with schema
│   │   └── components/             # FilterSidebar, ResultCard, DomainBadge
│   ├── scripts/                    # Embedding generation, dedup, metadata rebuild
│   └── data/                       # Embeddings, metadata, dedup index (not in repo)
├── schemas/
│   ├── enriched/                   # 183 JSONL files, deterministic enrichment (not in repo)
│   ├── final/                      # 183 JSONL files, domain + summary enriched (not in repo)
│   └── *.js / *.mjs               # Collection and enrichment scripts
├── results/                        # Research notes (markdown)
├── ENRICHMENT-PLAN.md              # 7-phase enrichment pipeline design
├── RESEARCH-PLAN.md                # WA government data discovery plan
└── RESEARCH-PLAN-PUBLIC-PORTALS.md # Global portals discovery plan
```

## Running locally

```bash
# Prerequisites
# - Node.js 20+
# - Ollama with nomic-embed-text model
ollama pull nomic-embed-text

# Install dependencies
cd search-app/server && npm install
cd ../client && npm install

# Generate embeddings (first time only, ~4 hours)
# Requires schemas/final/ directory with JSONL files
cd search-app && node scripts/generate-embeddings.mjs

# Start the API server
cd search-app/server && node index.mjs

# Start the frontend (separate terminal)
cd search-app/client && npm run dev

# Open http://localhost:5173
```

## Data note

This repo includes the application code, research plans, and enrichment scripts. The actual dataset schemas (200K JSONL records) and embedding vectors (586MB) are not included in the repository due to size. The collection scripts in `schemas/` can regenerate the data from public APIs.
