# SchemaFinder

**Live:** [schemafinder.com](https://schemafinder.com) · **API:** [schemafinder.com/api-docs](https://schemafinder.com/api-docs) · **Agent manifest:** [schemafinder.com/llms.txt](https://schemafinder.com/llms.txt)

Semantic search across 200,000+ public dataset schemas from government portals (data.gov, World Bank, Eurostat, WHO, CKAN), cloud warehouses (AWS Open Data, BigQuery, Azure), and research platforms (Hugging Face, Kaggle, SEC EDGAR).

Type a natural-language query like "COVID hospitalizations by county" or "renewable energy capacity by country" and get pointed to the exact datasets, with full column schemas, API endpoints, and source links. Free REST API, OpenAPI spec, and MCP server for agent integration.

## Why I built this

Public data is everywhere — data.gov, BigQuery, Snowflake Marketplace, AWS Open Data, Hugging Face, countless city and state portals. But discovering which dataset answers your question is brutally hard. Previous attempts (Google Dataset Search, data.world) were keyword-based and mediocre.

The insight: you don't need to query data to understand it. Column names, table names, descriptions, and data types carry enormous semantic signal. An LLM can infer what questions a dataset can answer without seeing a single row.

This project crawls and catalogs schemas from 17+ public data platforms, generates semantic descriptions and embeddings for each one, and serves a natural language search interface. Type "COVID hospitalizations by county" and get pointed to the exact datasets — with links to the source portal.

## What it does

- **Semantic search** over 200K dataset schemas using embeddings (MiniLM-L6-v2 via @xenova/transformers, CPU-only)
- **Faceted filtering** by category (15 domains), data format, geography, update frequency, platform, access type (open / gated), and source (curated / community)
- **Dataset detail pages** with full schema (column names, types, descriptions), source links, API endpoints
- **Deduplication**: identifies 30K duplicate records across portals, shows canonical entry with "also available on" links
- **Hybrid scoring**: 70% embedding similarity + 30% keyword overlap, plus a 40-group synonym expansion, eliminates noise from generic records
- **Community submissions**: anyone (or any agent) can submit datasets via the web form, REST endpoint, or MCP tool. Auto-approve with flag-based moderation.

## Architecture decisions worth calling out

| Decision | Why |
|---|---|
| **Schema-level reasoning, not row-level** | You can understand what a dataset contains from its columns + description without querying it. This makes the entire catalog searchable in <500ms. |
| **MiniLM-L6-v2 via @xenova/transformers** | Free, local, no API key, no GPU. 384-dim embeddings are good enough for schema search; the 292MB index loads in ~10s on a $12/mo droplet. |
| **Brute-force cosine similarity** | 200K vectors fit in RAM. No need for a vector database at this scale. Simpler, fewer dependencies. |
| **Keyword overlap boost (30% weight)** | Pure embedding search returned irrelevant results (SEC EDGAR filings scored high on every query because their generic descriptions clustered near most things). Adding keyword matching fixed this. |
| **Heuristic + LLM hybrid classification** | Sonnet produces the best domain labels but is too slow for 200K records via subagents. Used Sonnet for high-priority files, heuristic rules for the bulk. A/B tested: Sonnet beat Gemma, which beat the heuristic, which beat Haiku. |
| **Separate community index** | Community submissions live in a separate binary + metadata file. The 292MB curated binary is never mutated; new records append in-memory and the server hot-loads without restart. |
| **Faceted counts from the matching set** | Sidebar counts reflect the current search results, not the full catalog. Clicking a filter narrows results and all other facet counts adjust. Standard e-commerce UX. |
| **Score threshold (0.35)** | MiniLM's score distribution differs from nomic's. 0.35 gives 100 to 1,000 matches per query, reasonable for faceted exploration. |

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
- **Backend**: Express (Node.js), PM2-managed, Caddy reverse proxy
- **Embeddings**: MiniLM-L6-v2 via @xenova/transformers (384-dim, binary float32, CPU only)
- **Search**: Brute-force cosine similarity + keyword overlap + 40-group synonym expansion
- **Submissions**: separate append-only community index, honeypot + 5/day rate limit + URL reachability + admin CLI moderation
- **Agent integration**: OpenAPI spec at `/api/v1/openapi.json`, MCP server with `search_datasets` / `get_dataset_schema` / `submit_dataset` tools, llms.txt manifest

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
# Prerequisites: Node.js 20+. No GPU, no Ollama, no API keys.

cd search-app/server && npm install
cd ../client && npm install

# Generate embeddings (first run only, ~5.5 hours on CPU).
# Requires schemas/final/ to contain the JSONL catalog.
cd search-app/scripts && node generate-embeddings-portable.mjs

# Start the API (serves the prebuilt client too on port 3001)
cd ../server && node index.mjs
# Open http://localhost:3001
```

## Data note

This repo includes the application code, research plans, and enrichment scripts. The actual dataset schemas (200K JSONL records) and embedding vectors (586MB) are not included in the repository due to size. The collection scripts in `schemas/` can regenerate the data from public APIs.
