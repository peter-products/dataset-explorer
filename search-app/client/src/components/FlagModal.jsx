import { useState, useEffect } from 'react';

const REASONS = [
  { value: 'broken-url', label: 'Broken URL', hint: 'Source link returns an error or has moved' },
  { value: 'duplicate', label: 'Duplicate', hint: 'Same dataset already exists in SchemaFinder' },
  { value: 'misleading', label: 'Misleading info', hint: 'Name, description, or access type is wrong' },
  { value: 'spam', label: 'Spam', hint: 'Low-value or promotional content' },
  { value: 'offensive', label: 'Offensive', hint: 'Content violates basic norms' },
  { value: 'other', label: 'Other', hint: 'Describe in details below' },
];

export default function FlagModal({ open, onClose, datasetId, datasetName }) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!open) {
      setReason(''); setDetails(''); setResult(null); setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const resp = await fetch(`/api/v1/flag/${encodeURIComponent(datasetId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason, details: details.trim() || undefined }),
      });
      const data = await resp.json();
      if (resp.ok) {
        setResult({ ok: true, flags: data.flags_count, hidden: data.hidden });
      } else {
        setResult({ ok: false, error: data.error });
      }
    } catch (err) {
      setResult({ ok: false, error: err.message });
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Report this submission</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {result?.ok ? (
          <div className="px-5 py-8 text-center">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700">Thanks. The submission is flagged ({result.flags} total).</p>
            {result.hidden && <p className="text-xs text-gray-500 mt-1">It's been hidden from search pending maintainer review.</p>}
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-5 py-4">
            {datasetName && <p className="text-xs text-gray-500 mb-3">Reporting: <span className="font-medium text-gray-700">{datasetName}</span></p>}

            <div className="space-y-1.5 mb-4">
              {REASONS.map(r => (
                <label key={r.value} className={`flex items-start gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors ${reason === r.value ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={e => setReason(e.target.value)} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{r.label}</div>
                    <div className="text-xs text-gray-500">{r.hint}</div>
                  </div>
                </label>
              ))}
            </div>

            <label className="block text-sm font-medium text-gray-900 mb-1.5">Details <span className="text-gray-400 font-normal">(optional)</span></label>
            <textarea value={details} onChange={e => setDetails(e.target.value)} maxLength={500} rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add context that'll help the maintainer triage..." />
            <div className="text-[11px] text-gray-400 text-right">{details.length}/500</div>

            {result?.ok === false && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mt-3">{result.error}</div>
            )}

            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button type="submit" disabled={!reason || submitting} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                {submitting ? 'Reporting...' : 'Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
