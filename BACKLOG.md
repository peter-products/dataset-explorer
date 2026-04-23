# SchemaFinder Backlog

Single source of truth for known issues + remaining work. Updated as we go.

**Last updated:** 2026-04-21

---

## Priority legend

- **P0** — user-visible bug or misleading content; fix before shipping anything new
- **P1** — confusing UX or stale content; fix when next touching that area
- **P2** — minor polish, nice-to-have
- **Data** — not a code bug; needs a data pipeline re-run

---

## P0 — Known issues

### ~~1. WA-specific labels on a global catalog~~ — DONE 2026-04-21
Shared label helper `client/src/lib/labels.js` now used by FilterSidebar, ResultCard, DatasetPage. WA options relabeled as "Washington (State) / (City-level) / (County-level)". Dataset page now uses label map for `geographic_scope`, `source_platform`, `access_method`, `update_frequency`.

### ~~2. Landing page hardcodes "170,000+" as fallback~~ — DONE 2026-04-21
Fallback is now "200,000".

### ~~3. API docs page is stale~~ — DONE 2026-04-21
Geography enum expanded, "Dataset Explorer" → "SchemaFinder", rate-limit text now says "30 req/min per IP on search, 5 submissions per 24h".

### ~~4. OpenAPI spec title~~ — DONE 2026-04-21
Renamed to "SchemaFinder API". Agent-facing `geography` enum expanded to include `us_state`, `us_city`, `international`, `varies`, `unknown`.

### ~~5. Submission geography enum is WA-only~~ — DONE 2026-04-21
`GEO_ENUM` broadened to `[global, us_national, us_state, us_city, international, varies, unknown]` on both server submission validation and MCP `submit_dataset` zod schema. Verified: `us_state` accepted, `wa_state` rejected for new submissions.

### Original findings (kept for context)

#### 1. WA-specific labels on a global catalog (reported by Peter)
**User sees:** filter sidebar lists "Washington State / WA City / WA County" options. Dataset pages show raw `wa_state` verbatim via underscore-replace. Illinois or Australia datasets fall through to "unknown" or "varies" and look wrong.

**Root cause** (two parts):
- `FilterSidebar.jsx:12-13` — `VALUE_LABELS` hardcodes WA-specific labels
- `DatasetPage.jsx:209` — uses `d.geographic_scope?.replace(/_/g, ' ')`, no label mapping

**Fix (code):** add a shared label helper, relabel WA options as "Washington (State)" / "Washington (City-level)" / "Washington (County-level)" so it's clear they're the state of Washington, not "state-level" generic. Use the helper on the dataset page too.

**Out of scope:** Illinois/Texas/etc. records are tagged `unknown` or `varies` — that's a classification gap, not a label bug. See Data-1 below.

### 2. Landing page hardcodes "170,000+" as fallback
**User sees:** if `/api/stats` takes a moment or fails, landing shows "170,000+ public datasets" even though the corpus is 200K.

**Fix:** update fallback to `200,000` or derive from actual stats. `SearchPage.jsx:142`.

### 3. API docs page is stale
**User sees:** developers / agents reading the docs get wrong information.

- Line 83: `geography` enum still lists only WA-centric values
- Line 133: calls the product "Dataset Explorer" (obsolete name)
- Line 198: "No hard limits currently enforced" — server enforces 30 req/min

**Fix:** update all three inline.

### 4. OpenAPI spec title is "Dataset Explorer API"
`server/index.mjs:684`. Rename to "SchemaFinder API". Agents using the spec as a tool manifest see the old branding.

### 5. Submission geography enum is WA-only
**Introduced in recent work**: `GEO_ENUM = ['global', 'us_national', 'wa_state', 'wa_city', 'wa_county']` in `server/index.mjs`. A community submitter from Illinois has no valid value. Same set used in the MCP `submit_dataset` tool zod schema.

**Fix:** drop WA-specific values from the submission enum; let submitters pick from `global | us_national | us_state | us_city | international | varies | unknown`. The curated corpus keeps its `wa_state` values; they just don't appear as submission options.

---

## P1 — Polish

### ~~P1 items done 2026-04-21~~
- **Result card** now uses shared `labelFor('formatType', …)` from `labels.js` — shows "Flat File (CSV, XLSX)" instead of "flat file"
- **Landing examples** — swapped "salmon habitat in Puget Sound" for "renewable energy capacity by country"
- **Platform `api` label collision** — `PLATFORM_LABELS.api = 'Generic API'` in `labels.js`, distinct from format's "API / Queryable"
- **Filter UX (submitted-query bug)** — `handleFilterChange` now reads last-submitted query from URL instead of live input field
- **Filter UX (browse mode)** — `/api/browse` now accepts filter params and returns facets; filter sidebar appears in browse mode and narrows results
- **About page GitHub URL** — verified correct (`peter-products/dataset-explorer` is the active repo per memory), no change

### ~~Category expansion~~ — re-scoped to data task
Only 6 of 15 domains have curated-browse entries in `data/curated-browse.json`. Expanding the landing grid to 15 categories would land users on empty pages. Added [Data-3](#data-3-curated-browse-only-covers-6-of-15-domains) below as a data-pipeline task.

### Original P1 findings (kept for context)

### 6. Result card shows raw formatType codes
`ResultCard.jsx:60` — `result.formatType.replace(/_/g, ' ')` shows "flat file" instead of "Flat File (CSV, XLSX)". Fix: use the shared label helper (from P0-1).

### 7. Landing example searches are WA-biased
`SearchPage.jsx:8-17` — "salmon habitat in Puget Sound" and similar. Product is global now. Swap a couple for non-WA examples (e.g., "unemployment rate by county", "air quality monitoring stations in Delhi", "EU agricultural subsidies").

### 8. About page GitHub URL is dead
`AboutPage.jsx:114` points to `github.com/peter-products/dataset-explorer`. Verify current repo URL and update.

### 9. Landing categories only show 6 of 15 domains
`SearchPage.jsx:19-26` — Health, Education, Finance, Environment, Transportation, Demographics. Missing Housing, Energy, Agriculture, Labor, Public Safety, Elections, Legal, Natural Resources, Technology. Either expand the grid or add a "more categories" expansion.

### 10. `source_platform = "api"` is misleading as a filter option
Data has 54K records with `source_platform: "api"`. That's not really a platform — it's a leftover from collection. When the filter sidebar renders it, users see "API / Queryable" twice (once under Format, once under Platform) because both values hit the same `VALUE_LABELS` key. Separate the label maps per facet.

### 11. Filter changes re-run with current input text, not submitted query
`SearchPage.jsx:98-101` — `handleFilterChange` uses `query` (live input value). If the user types something new in the box without submitting, then clicks a filter, it runs a fresh search on the unsubmitted text, which looks like the filter didn't narrow. Track `submittedQuery` separately.

### 12. Filters hidden in browse mode
`/api/browse` doesn't accept filter params and `setFacets(null)` hides the sidebar. Clicking "Environment" gives a fixed list with no way to narrow by format or frequency. Either support filters on `/api/browse` or route category cards through search with `domain=X`.

---

## P2 — Minor

- `robots.txt` disallows `/api/` globally; agent-discovery endpoints (`/api/v1/openapi.json`, future `/llms.txt`) should be accessible to crawlers and agents
- Bot-rendered `renderHomeHtml` footer doesn't link back to https://schemafinder.com
- Dataset page shows `access_method` as raw code ("api" / "download" / "sql") — route through label helper
- Global facets (`/api/filters`) exclude records without columns; filtered search facets respect `includeNoSchema`. Counts can seem inconsistent if user toggles the checkbox
- `FilterSidebar` returns null when facets are null, with no fallback message ("Search to see filters")

---

## Data issues (not code bugs)

### Data-4. Geographic classification misclassifies some county datasets as state-level
**Reported by Peter 2026-04-21.** Some records labeled `wa_state` (which now renders as "US (State-level)") are actually county-level datasets. So the sidebar/dataset page labels them wrong, even though our relabeling logic is correct — the underlying classification is wrong. Fix likely requires re-running the geography classifier on records whose name/description contains "county" or similar signals. Low priority for now; address alongside Data-1 reclassification pass.

### Data-1. Only WA is tagged with state/city/county granularity
**Impact:** 45K records are `us_national`, 48K `varies`, 43K `unknown`. Illinois, Texas, California datasets all fall into `unknown` or `varies` rather than getting tagged with their state.

**Why:** the classifier from the WA-catalog era only knew about WA. Global enrichment pass hasn't covered sub-national for other regions.

**Fix option:** re-run enrichment over non-WA/non-global records with a heuristic + sample-LLM pass to assign `us_state`, `us_city`, or `international` + a `geographic_detail` string ("Illinois", "Chicago", "Ontario", etc.). Large data-pipeline job; out of scope for the submissions feature.

### Data-3. Curated-browse only covers 6 of 15 domains
Landing page can only show category cards for: health, education, finance, environment, transportation, demographics. The other 9 domains (housing, energy, public_safety, labor, natural_resources, agriculture, technology, legal, elections) have no `curated-browse.json` entries, so they'd land users on an empty page. To expose them on the landing grid, run a curation pass (top-200 per domain by some quality heuristic) and append to `data/curated-browse.json`.

### Data-2. `formatType` and `format` overlap confusingly
`format` sometimes "csv, json" (joined list), sometimes "json, csv, geojson, xml" (comma separated). `formatType` is the filterable enum. Keep in mind when displaying.

---

## Active build work (community submissions)

- [x] Step 1 — Backend foundations (POST /api/v1/submit, dedup, rate limit, lock)
- [x] Step 2 — Admin CLI + token-gated admin endpoints
- [x] Step 3 — MCP `submit_dataset` tool
- [x] Step 4 — Frontend badges (community, gated) + new filter facets + WA→US geo normalization
- [x] Step 5 — `/submit` page + `/llms.txt`
- [x] Step 6 — Flag endpoint + UI
- [x] ~~Step 7 — Weekly digest email~~ (skipped — Peter doesn't want it; `admin.mjs list --filter flagged` covers the need)

Design reference: [SUBMISSIONS-PLAN.md](SUBMISSIONS-PLAN.md)

---

## Peter's deploy tasks

See [SUBMISSIONS-CHECKLIST.md](SUBMISSIONS-CHECKLIST.md). Nothing is deployed yet; all submission work is local.
