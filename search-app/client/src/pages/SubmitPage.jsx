import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoFull } from '../components/Logo';
import usePageTitle from '../hooks/usePageTitle';
import { DOMAIN_LABELS, FORMAT_LABELS, GEO_LABELS, PRICE_LABELS } from '../lib/labels';

const DOMAINS = Object.keys(DOMAIN_LABELS);
const FORMATS = Object.keys(FORMAT_LABELS).filter(k => k !== 'other');
// Submitters pick from the global-aware list (no WA values)
const GEOS = ['global', 'us_national', 'us_state', 'us_city', 'international', 'varies', 'unknown'];
const PRICES = Object.keys(PRICE_LABELS);

const AGENT_PROMPT = `Submit this dataset to SchemaFinder: <PASTE URL OR DATASET NAME HERE>

Instructions for you (the agent):
1. First call search_datasets with the dataset's name or URL to make sure it's not already indexed.
2. If it's not a duplicate, call submit_dataset with the full column schema. Columns are required even for paid/gated datasets.
3. Confirm with me before submitting if anything is ambiguous.`;

function Field({ label, required, hint, children }) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-900 mb-1.5">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function SubmitPage() {
  usePageTitle('Submit a Dataset | SchemaFinder');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', url: '', description: '', publisher: '',
    domain: '', format: '', access: 'open',
    access_instructions: '', price_range: '',
    geographic_scope: '', update_frequency: '',
    api_endpoint: '', documentation_url: '',
    tags: '',
    columns: [{ name: '', type: '', description: '' }],
    attribution: 'anonymous', // 'anonymous' | 'attributed'
    submitter_name: '', submitter_url: '', submitter_contact: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { ok, id?, url?, error?, issues? }
  const [copied, setCopied] = useState(false);

  function update(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function updateColumn(i, field, value) {
    setForm(f => {
      const cols = [...f.columns];
      cols[i] = { ...cols[i], [field]: value };
      return { ...f, columns: cols };
    });
  }

  function addColumn() {
    setForm(f => ({ ...f, columns: [...f.columns, { name: '', type: '', description: '' }] }));
  }

  function removeColumn(i) {
    setForm(f => ({ ...f, columns: f.columns.length > 1 ? f.columns.filter((_, idx) => idx !== i) : f.columns }));
  }

  function copyAgentPrompt() {
    navigator.clipboard.writeText(AGENT_PROMPT).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setResult(null);
    setSubmitting(true);

    const body = {
      name: form.name.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      publisher: form.publisher.trim(),
      domain: form.domain,
      format: form.format,
      access: form.access,
      columns: form.columns
        .filter(c => c.name.trim() && c.type.trim())
        .map(c => ({
          name: c.name.trim(),
          type: c.type.trim(),
          ...(c.description.trim() ? { description: c.description.trim() } : {}),
        })),
    };
    if (form.access === 'gated') {
      body.access_instructions = form.access_instructions.trim();
      if (form.price_range) body.price_range = form.price_range;
    }
    if (form.geographic_scope) body.geographic_scope = form.geographic_scope;
    if (form.update_frequency.trim()) body.update_frequency = form.update_frequency.trim();
    if (form.api_endpoint.trim()) body.api_endpoint = form.api_endpoint.trim();
    if (form.documentation_url.trim()) body.documentation_url = form.documentation_url.trim();
    if (form.tags.trim()) body.tags = form.tags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 50);
    if (form.attribution === 'attributed') {
      body.display_attribution = true;
      if (form.submitter_name.trim()) body.submitter_name = form.submitter_name.trim();
      if (form.submitter_url.trim()) body.submitter_url = form.submitter_url.trim();
    }
    if (form.submitter_contact.trim()) body.submitter_contact = form.submitter_contact.trim();

    try {
      const resp = await fetch('/api/v1/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (resp.ok) {
        setResult({ ok: true, id: data.id, url: data.dataset_url });
      } else {
        setResult({ ok: false, error: data.error, issues: data.issues });
      }
    } catch (err) {
      setResult({ ok: false, error: err.message });
    }
    setSubmitting(false);
  }

  if (result?.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl p-8 text-center shadow-sm">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Submission live</h1>
          <p className="text-sm text-gray-500 mb-5">Your dataset is now searchable on SchemaFinder.</p>
          <div className="flex gap-2 justify-center">
            <Link to={`/dataset/${encodeURIComponent(result.id)}`} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              View dataset &rarr;
            </Link>
            <button onClick={() => { setResult(null); setForm(f => ({ ...f, name: '', url: '', description: '', columns: [{ name: '', type: '', description: '' }] })); }}
              className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
              Submit another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <LogoFull size="md" />
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 lg:px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Submit a dataset</h1>
        <p className="text-sm text-gray-500 mb-6">
          Add a public dataset to SchemaFinder. Your submission goes live immediately with a "Community" badge. Other users can flag it if there's a problem; the maintainer reviews flagged submissions.
        </p>

        {/* Agent prompt block */}
        <div className="bg-gray-900 text-gray-100 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Using an AI agent?</h2>
            <button onClick={copyAgentPrompt} className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-2.5 py-1 rounded transition-colors">
              {copied ? 'Copied' : 'Copy prompt'}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Paste this into Claude Code (with the <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-200">schemafinder</code> MCP server installed) or any agent that can call the <code className="bg-gray-800 px-1 py-0.5 rounded text-gray-200">/api/v1/submit</code> endpoint.
          </p>
          <pre className="text-xs font-mono bg-black/30 rounded p-3 overflow-x-auto whitespace-pre-wrap">{AGENT_PROMPT}</pre>
        </div>

        <div className="text-center text-xs uppercase tracking-wider text-gray-400 mb-4">Or submit manually</div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-5 lg:p-7 shadow-sm">
          {/* Honeypot — hidden field; real users won't fill it, bots often will */}
          <input type="text" name="_hp" value="" onChange={() => {}} tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-10000px', top: 'auto', width: '1px', height: '1px', overflow: 'hidden' }} aria-hidden="true" />

          <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">About the dataset</h2>

          <Field label="Name" required>
            <input type="text" value={form.name} onChange={e => update('name', e.target.value)} maxLength={200} required className={inputCls} placeholder="e.g. OECD Consumer Price Index" />
          </Field>

          <Field label="Source URL" required hint="Landing page on the source portal">
            <input type="url" value={form.url} onChange={e => update('url', e.target.value)} required className={inputCls} placeholder="https://..." />
          </Field>

          <Field label="Description" required hint={`${form.description.length}/500 characters (min 50)`}>
            <textarea value={form.description} onChange={e => update('description', e.target.value)} minLength={50} maxLength={500} required rows={3} className={inputCls} placeholder="What does this dataset contain? Who would search for it?" />
          </Field>

          <Field label="Publisher" required hint="Organization that publishes the data">
            <input type="text" value={form.publisher} onChange={e => update('publisher', e.target.value)} maxLength={200} required className={inputCls} placeholder="e.g. US Census Bureau" />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Category" required>
              <select value={form.domain} onChange={e => update('domain', e.target.value)} required className={inputCls}>
                <option value="">Select a category</option>
                {DOMAINS.map(d => <option key={d} value={d}>{DOMAIN_LABELS[d]}</option>)}
              </select>
            </Field>

            <Field label="Format" required>
              <select value={form.format} onChange={e => update('format', e.target.value)} required className={inputCls}>
                <option value="">Select a format</option>
                {FORMATS.map(f => <option key={f} value={f}>{FORMAT_LABELS[f]}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Geographic scope" hint="Optional">
              <select value={form.geographic_scope} onChange={e => update('geographic_scope', e.target.value)} className={inputCls}>
                <option value="">Unspecified</option>
                {GEOS.map(g => <option key={g} value={g}>{GEO_LABELS[g] || g}</option>)}
              </select>
            </Field>

            <Field label="Update frequency" hint='e.g. "daily", "monthly", "annually"'>
              <input type="text" value={form.update_frequency} onChange={e => update('update_frequency', e.target.value)} maxLength={50} className={inputCls} />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="API endpoint" hint="Optional. Direct URL for programmatic access.">
              <input type="url" value={form.api_endpoint} onChange={e => update('api_endpoint', e.target.value)} className={inputCls} placeholder="https://api..." />
            </Field>

            <Field label="Documentation URL" hint="Optional">
              <input type="url" value={form.documentation_url} onChange={e => update('documentation_url', e.target.value)} className={inputCls} placeholder="https://..." />
            </Field>
          </div>

          <Field label="Tags" hint="Comma-separated keywords (up to 50)">
            <input type="text" value={form.tags} onChange={e => update('tags', e.target.value)} className={inputCls} placeholder="inflation, cpi, oecd, macro" />
          </Field>

          {/* Access */}
          <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-8">Access</h2>

          <Field label="Who can access this data?" required>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="access" value="open" checked={form.access === 'open'} onChange={e => update('access', e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Open</div>
                  <div className="text-xs text-gray-500">Anyone can access without signup or payment.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="access" value="gated" checked={form.access === 'gated'} onChange={e => update('access', e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Gated</div>
                  <div className="text-xs text-gray-500">Requires signup, login, or payment. Full column schema still required.</div>
                </div>
              </label>
            </div>
          </Field>

          {form.access === 'gated' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-5">
              <Field label="Access instructions" required hint="How does someone get access? Signup link, pricing, API-key steps.">
                <textarea value={form.access_instructions} onChange={e => update('access_instructions', e.target.value)} maxLength={1000} required={form.access === 'gated'} rows={2} className={inputCls} placeholder="Sign up at example.com. Free tier = 100 req/day; Pro plan starts at $49/mo." />
              </Field>
              <Field label="Price range" hint="Optional">
                <select value={form.price_range} onChange={e => update('price_range', e.target.value)} className={inputCls}>
                  <option value="">Unspecified</option>
                  {PRICES.map(p => <option key={p} value={p}>{PRICE_LABELS[p]}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* Columns */}
          <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-2 mt-8">Columns</h2>
          <p className="text-xs text-gray-500 mb-4">At least one column is required, even for gated datasets. Up to 100.</p>

          <div className="space-y-2 mb-3">
            {form.columns.map((col, i) => (
              <div key={i} className="flex gap-2 items-start">
                <input type="text" value={col.name} onChange={e => updateColumn(i, 'name', e.target.value)} className={inputCls + ' flex-1'} placeholder="column_name" />
                <input type="text" value={col.type} onChange={e => updateColumn(i, 'type', e.target.value)} className={inputCls + ' w-28 md:w-32'} placeholder="type" />
                <input type="text" value={col.description} onChange={e => updateColumn(i, 'description', e.target.value)} className={inputCls + ' flex-1 hidden md:block'} placeholder="description (optional)" />
                {form.columns.length > 1 && (
                  <button type="button" onClick={() => removeColumn(i)} className="px-2 py-2 text-gray-400 hover:text-red-500" aria-label="Remove column">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addColumn} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
            + Add column
          </button>

          {/* Attribution */}
          <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4 mt-8">Attribution</h2>

          <Field label="How should the submission be credited?">
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="attribution" value="anonymous" checked={form.attribution === 'anonymous'} onChange={e => update('attribution', e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Keep anonymous</div>
                  <div className="text-xs text-gray-500">Dataset shows "Community submission" with no name.</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="attribution" value="attributed" checked={form.attribution === 'attributed'} onChange={e => update('attribution', e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-900">Credit me</div>
                  <div className="text-xs text-gray-500">Your name (and optional link) shown on the dataset page.</div>
                </div>
              </label>
            </div>
          </Field>

          {form.attribution === 'attributed' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <Field label="Display name">
                <input type="text" value={form.submitter_name} onChange={e => update('submitter_name', e.target.value)} maxLength={100} className={inputCls} placeholder="Your name or handle" />
              </Field>
              <Field label="Profile / site URL" hint="Optional">
                <input type="url" value={form.submitter_url} onChange={e => update('submitter_url', e.target.value)} className={inputCls} placeholder="https://..." />
              </Field>
            </div>
          )}

          <Field label="Contact email" hint="Optional, private. Only used by the maintainer to reach you about flagged submissions.">
            <input type="email" value={form.submitter_contact} onChange={e => update('submitter_contact', e.target.value)} maxLength={200} className={inputCls} placeholder="you@example.com" />
          </Field>

          {/* Warning + submit */}
          <div className="text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5">
            <strong>Before submitting:</strong> search SchemaFinder first to make sure this dataset isn't already indexed. Duplicate URLs are rejected automatically.
          </div>

          {result?.ok === false && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3 mb-5">
              <div className="font-semibold mb-1">{result.error || 'Submission failed'}</div>
              {result.issues && <ul className="list-disc pl-5 text-xs">{result.issues.map((iss, i) => <li key={i}>{iss}</li>)}</ul>}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {submitting ? 'Submitting...' : 'Submit dataset'}
            </button>
            <button type="button" onClick={() => navigate('/')} className="text-sm text-gray-500 hover:text-gray-800">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
