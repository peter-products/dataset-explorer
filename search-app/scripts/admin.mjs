#!/usr/bin/env node
// SchemaFinder community-submissions admin CLI
//
// Usage:
//   ADMIN_TOKEN=xxx node admin.mjs list [--filter recent|all|flagged|hidden|approved|rejected] [--limit N]
//   ADMIN_TOKEN=xxx node admin.mjs show <id>
//   ADMIN_TOKEN=xxx node admin.mjs approve <id>
//   ADMIN_TOKEN=xxx node admin.mjs reject <id>
//
// Env:
//   ADMIN_TOKEN         Required. Must match the server's ADMIN_TOKEN.
//   SCHEMAFINDER_URL    Default: http://localhost:3001

const BASE = process.env.SCHEMAFINDER_URL || 'http://localhost:3001';
const TOKEN = process.env.ADMIN_TOKEN;

if (!TOKEN) {
  console.error('ERROR: ADMIN_TOKEN environment variable required.');
  process.exit(1);
}

async function api(path, opts = {}) {
  const resp = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await resp.text();
  let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!resp.ok) {
    const err = new Error(`HTTP ${resp.status}: ${data.error || text}`);
    err.status = resp.status;
    throw err;
  }
  return data;
}

function usage() {
  console.log(`SchemaFinder admin CLI

Usage:
  node admin.mjs list [--filter F] [--limit N]
  node admin.mjs show <id>
  node admin.mjs approve <id>
  node admin.mjs reject <id>

Filters: recent (default), all, flagged, hidden, approved, rejected

Env:
  ADMIN_TOKEN         Required
  SCHEMAFINDER_URL    Default http://localhost:3001
`);
}

function parseArgs(args) {
  const out = { positional: [], flags: {} };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--')) { out.flags[a.slice(2)] = args[++i]; }
    else out.positional.push(a);
  }
  return out;
}

async function cmdList(args) {
  const filter = args.flags.filter || 'recent';
  const limit = args.flags.limit || '30';
  const data = await api(`/api/admin/submissions?filter=${encodeURIComponent(filter)}&limit=${encodeURIComponent(limit)}`);

  console.log(`${data.filter} — showing ${data.count} of ${data.total}\n`);
  if (!data.items.length) { console.log('(no submissions)'); return; }

  for (const it of data.items) {
    const flag = it.flags_count ? `  flags=${it.flags_count}` : '';
    const status = it.admin_status !== 'auto' ? `  [${it.admin_status}]` : '';
    console.log(`${it.id}${status}${flag}`);
    console.log(`  ${it.name}`);
    console.log(`  ${it.domain} | access=${it.access} | ${it.publisher}`);
    console.log(`  ${it.url}`);
    console.log(`  submitted: ${it.submitted_at}`);
    if (it.submitter_contact) console.log(`  contact: ${it.submitter_contact}`);
    console.log('');
  }
}

async function cmdShow(args) {
  const id = args.positional[0];
  if (!id) { console.error('Usage: show <id>'); process.exit(1); }
  const rec = await api(`/api/admin/submissions/${encodeURIComponent(id)}`);
  console.log(JSON.stringify(rec, null, 2));
}

async function cmdAction(action, args) {
  const id = args.positional[0];
  if (!id) { console.error(`Usage: ${action} <id>`); process.exit(1); }
  const result = await api(`/api/admin/submissions/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
  console.log(`${result.id}: ${result.admin_status}`);
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === '--help' || cmd === '-h') { usage(); process.exit(cmd ? 0 : 1); }
  const args = parseArgs(rest);
  try {
    switch (cmd) {
      case 'list': await cmdList(args); break;
      case 'show': await cmdShow(args); break;
      case 'approve': await cmdAction('approve', args); break;
      case 'reject': await cmdAction('reject', args); break;
      default: console.error(`Unknown command: ${cmd}`); usage(); process.exit(1);
    }
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

main();
