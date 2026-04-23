# SchemaFinder — Community Submissions Plan

**Goal:** let visitors (especially AI agents like Claude Code) submit datasets to SchemaFinder. Auto-approve with community badge, moderation via flagging + owner review.

## Status (2026-04-21)

- [x] **Step 1 — Backend foundations** (done): `POST /api/v1/submit`, schema extension, URL-hash dedup, URL reachability check, 5/day/IP rate limit, honeypot, in-memory append + separate `community-metadata.jsonl` / `community-embeddings.bin` files, search integrates community records with hidden-when-flagged logic
- [x] **Step 2 — Admin CLI** (done): `search-app/scripts/admin.mjs` with `list`, `show`, `approve`, `reject`. Backed by token-gated `/api/admin/*` endpoints (`ADMIN_TOKEN` env). Atomic file rewrite, approval immunizes from flag-hiding
- [x] **Step 3 — MCP `submit_dataset` tool** (done): added to `mcp-server/index.mjs` with full zod schema, search-first guidance, gated pre-check
- [ ] Step 4 — Frontend badges (community / gated) + new filter facets
- [ ] Step 5 — `/submit` page + `/llms.txt` for agent discoverability
- [ ] Step 6 — `POST /api/v1/flag/:id` endpoint + UI flag action
- [ ] Step 7 — Weekly digest email via Resend

**Not yet deployed.** Code is local-only. See [SUBMISSIONS-CHECKLIST.md](SUBMISSIONS-CHECKLIST.md) for the production rollout steps.

## Design decisions (locked)

| Question | Decision |
|---|---|
| Moderation model | Auto-approve + community badge + user flagging + owner review queue |
| Submitter attribution | Submitter's choice: name + link, or fully anonymous |
| Paid/gated datasets | Allowed if full column schemas are published; show "Gated" badge + filter |
| Price disclosure | Optional `price_range` enum: `free-tier \| paid \| enterprise` |
| Admin interface | CLI on droplet via SSH |
| Notify submitter on rejection | No (silent) |
| Owner notifications | Weekly digest emailed to poverman3@gmail.com |

## Record schema extensions

Every record gains:

```
source_type:   "curated" | "community"
access:        "open" | "gated"
access_instructions?: string     # required when access="gated"
price_range?:  "free-tier" | "paid" | "enterprise"
submitter?: {
  name?:    string
  url?:     string
  display:  boolean              # if false, shown as "Community submission"
}
submitter_contact?: string       # private, not shown in UI
submitted_at:  ISO-date
flags_count:   number            # auto-hidden from search when >= 3
admin_status:  "auto" | "approved" | "rejected"
```

Existing 200K curated records take defaults (`source_type="curated"`, `access="open"`) at read time — no migration pass needed.

## Storage (separate community index)

Keep the 292MB curated binary untouched. Add:

- `search-app/data/community-metadata.jsonl` — append-only
- `search-app/data/community-embeddings.bin` — append-only; MiniLM is already loaded in-memory so embedding at submit time is cheap
- `search-app/data/community-flags.jsonl` — append-only flag log

On server boot, load both sets into one combined search space. On submit, append to community files AND update in-memory arrays live — no restart needed.

## API endpoints

### `POST /api/v1/submit`

**Required:** `name`, `url`, `description` (50-500 chars), `publisher`, `domain` (enum), `format` (enum), `columns` (array, >=1, each `{name, type, description?}`), `access`, `access_instructions` (when gated).

**Optional:** `api_endpoint`, `geographic_scope`, `update_frequency`, `tags`, `documentation_url`, `price_range`, `submitter_name`, `submitter_url`, `submitter_contact`, `display_attribution` (default false).

**Server checks:**
1. Honeypot field `_hp` must be empty
2. Rate limit: 5 submits/day/IP
3. URL reachable (HEAD, 5s timeout)
4. Dedup: URL (normalized: lowercase + strip trailing slash + strip query) not in curated or community
5. Max 100 columns
6. Compute embedding, append, update in-memory

**Response:** `{ id, status: "live", dataset_url }`

### `POST /api/v1/flag/:id`

Body: `{ reason: enum, details?: string }`. Rate-limit 10 flags/day/IP. Appends to flag log. At `flags_count >= 3` and `admin_status !== "approved"`, record is auto-hidden from search.

### OpenAPI update

Add both endpoints to `/api/v1/openapi.json` so agents discover them.

## Frontend

### `/submit` page (new)
- Inline search box: "Check for duplicates first"
- Agent instructions block with copy-paste prompt for Claude Code users
- Required/optional field list with examples
- Attribution radio: Show my name + link / Keep anonymous
- Gated dataset section only shown when user picks `access=gated`
- Warning: "Your submission goes live immediately; bad submissions can be flagged or reported to the maintainer"

### Component updates
- `components/ResultCard.jsx` — "Community" badge, "Gated" badge, flag icon
- `components/FilterSidebar.jsx` — new "Access" facet (Open / Gated) + "Source" facet (Curated / Community) + "Pricing" facet when gated
- `pages/DatasetPage.jsx` — attribution line, access instructions block, flag button
- `pages/SearchPage.jsx` — "Submit dataset" link in header

## MCP server — new `submit_dataset` tool

Add to `mcp-server/index.mjs`. Full field list as a zod schema. Tool description emphasizes:
- Search first to avoid duplicates
- Columns required even for gated datasets (that IS the value we offer)
- Ask the human before submitting on someone else's behalf

## Agent discoverability

- `/llms.txt` at root — submission guidelines, dedup policy, example payloads, gated-dataset rules
- `<meta name="claude-submit-instructions">` block on `/submit`
- MCP tool description surfaces the rules inline

## Admin CLI — `scripts/admin.mjs`

Run via SSH on droplet. Commands:

```
node scripts/admin.mjs list [--flagged | --recent N | --hidden]
node scripts/admin.mjs show <id>
node scripts/admin.mjs approve <id>     # immunizes from flag-hiding
node scripts/admin.mjs reject <id>      # removes from search, silent
node scripts/admin.mjs export-flags     # dump flag log for review
```

Mutations update `community-metadata.jsonl` in place. Process reloads via SIGHUP handler.

## Weekly digest email

Cron on droplet runs `scripts/digest.mjs` every Monday 9am PT. Sends to poverman3@gmail.com:
- Submissions this week (count + list)
- Flagged records awaiting review
- Currently hidden records
- Rejected / approved this week

**Transport:** Resend (free tier, 100 emails/day, simple API key). Alternative: Gmail SMTP with an app password — more setup, no signup needed. Recommend Resend.

Add `RESEND_API_KEY` to droplet env. Digest script is tiny — maybe 80 lines.

## Abuse protection

| Vector | Mitigation |
|---|---|
| Spam submissions | 5/day/IP + honeypot |
| Duplicate submissions | URL-hash dedup against whole corpus |
| Dead/fake URLs | HEAD check at submit time |
| Malicious listings | User flagging (auto-hide at 3) + owner review via CLI |
| Flag abuse | 10/day/IP + owner can approve to immunize |
| Schema padding | Max 100 columns per record |
| Fake "free-tier" label on paid thing | Flag reason options include "misleading access info" |

## Build order

1. **Backend foundations** — schema fields (read-default for curated), submit endpoint, dedup, in-memory append, URL reachability check
2. **Admin CLI** — list/show/approve/reject/export-flags. Safety net before anything goes public.
3. **MCP `submit_dataset` tool** — unblocks agent submissions end-to-end
4. **Frontend badges + filters** — community/gated visible in UI; access + source + pricing facets
5. **`/submit` page + `/llms.txt`** — agent-discoverable instructions
6. **Flag endpoint + UI** — abuse response mechanism
7. **Weekly digest** — Resend integration + cron

Each step is independently deployable.

## Open items (not blocking step 1)

- Choose Resend vs Gmail SMTP for digest (recommend Resend)
- Decide flag-reason enum values (e.g., `broken-url`, `duplicate`, `misleading`, `spam`, `offensive`, `other`)
- Decide badge colors (blue = curated, amber = community, purple = gated?)
