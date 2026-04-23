import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DomainBadge from '../components/DomainBadge';
import { LogoFull } from '../components/Logo';
import usePageTitle from '../hooks/usePageTitle';
import { labelFor } from '../lib/labels';
import FlagModal from '../components/FlagModal';

function InfoRow({ label, value, href }) {
  if (!value || value === 'unknown' || value === 'None' || value === 'null') return null;
  return (
    <div className="flex items-baseline py-2.5 border-b border-gray-100 gap-3">
      <dt className="w-44 shrink-0 text-sm text-gray-500">{label}:</dt>
      <dd className="text-sm text-gray-900 min-w-0">
        {href ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
            {value}
          </a>
        ) : (
          <span className="break-words">{value}</span>
        )}
      </dd>
    </div>
  );
}

function SchemaTable({ columns }) {
  if (!columns || columns.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-400 italic">No schema information available for this dataset.</p>
      </div>
    );
  }

  // Check if field_name differs from name in any row
  const hasDistinctFieldName = columns.some(c => c.field_name && c.name && c.field_name !== c.name);

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left py-3 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-10">#</th>
            <th className="text-left py-3 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[180px]">Column</th>
            {hasDistinctFieldName && (
              <th className="text-left py-3 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[140px]">Field Name</th>
            )}
            <th className="text-left py-3 pr-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Type</th>
            <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
          </tr>
        </thead>
        <tbody>
          {columns.map((col, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30">
              <td className="py-3 pr-6 text-gray-400 tabular-nums">{i + 1}</td>
              <td className="py-3 pr-6 font-medium text-gray-900">{col.name || col.field_name || '-'}</td>
              {hasDistinctFieldName && (
                <td className="py-3 pr-6 font-mono text-xs text-gray-500">{col.field_name || '-'}</td>
              )}
              <td className="py-3 pr-6">
                {col.type ? (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono">{col.type}</span>
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="py-3 text-gray-600 leading-relaxed">
                {col.description || <span className="text-gray-300 italic">No description</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DatasetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dataset, setDataset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flagOpen, setFlagOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dataset/${encodeURIComponent(id)}`)
      .then(r => { if (!r.ok) throw new Error('Dataset not found'); return r.json(); })
      .then(d => {
        setDataset(d); setLoading(false);
        document.title = d.name ? `${d.name} — SchemaFinder` : 'SchemaFinder';
        // Inject JSON-LD for search engines
        fetch(`/dataset-jsonld/${encodeURIComponent(id)}`).then(r => r.json()).then(jsonld => {
          let el = document.getElementById('dataset-jsonld');
          if (!el) { el = document.createElement('script'); el.id = 'dataset-jsonld'; el.type = 'application/ld+json'; document.head.appendChild(el); }
          el.textContent = JSON.stringify(jsonld);
        }).catch(() => {});
        // Set meta tags
        const setMeta = (name, content) => {
          let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
          if (!el) { el = document.createElement('meta'); el.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(el); }
          el.setAttribute('content', content);
        };
        const desc = (d.semantic_description || d.description || d.summary || '').slice(0, 155);
        setMeta('description', desc);
        setMeta('og:title', d.name || 'SchemaFinder');
        setMeta('og:description', desc);
        setMeta('og:url', `https://schemafinder.com/dataset/${encodeURIComponent(id)}`);
        setMeta('og:type', 'website');
        setMeta('twitter:card', 'summary');
        setMeta('twitter:title', d.name || 'SchemaFinder');
        setMeta('twitter:description', desc);
        let canonical = document.querySelector('link[rel="canonical"]');
        if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical); }
        canonical.href = `https://schemafinder.com/dataset/${encodeURIComponent(id)}`;
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full"></div>
      </div>
    );
  }

  if (error || !dataset) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">{error || 'Dataset not found'}</p>
          <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">Go back</button>
        </div>
      </div>
    );
  }

  const d = dataset;
  const formats = Array.isArray(d.format) ? d.format.join(', ') : d.format;
  const isCommunity = d.source_type === 'community';
  const isGated = d.access === 'gated';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <LogoFull size="md" />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8">
        {/* Title card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-8 mb-4 lg:mb-6 shadow-sm">
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <DomainBadge domain={d.domain} size="lg" />
            {isCommunity && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-medium uppercase tracking-wide">Community</span>
            )}
            {isGated && (
              <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-medium uppercase tracking-wide">Gated</span>
            )}
            {d.update_frequency && d.update_frequency !== 'unknown' && (
              <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{labelFor('update_frequency', d.update_frequency)}</span>
            )}
            {d.freshness && d.freshness !== 'unknown' && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{d.freshness}</span>
            )}
          </div>

          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-3">{d.name}</h1>

          {isCommunity && (
            <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
              <span className="flex-1 min-w-0">
                {d.submitter?.display && d.submitter?.name ? (
                  <>Submitted by <span className="font-semibold">{d.submitter.name}</span>
                    {d.submitter.url && <> &middot; <a href={d.submitter.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-900">{d.submitter.url.replace(/^https?:\/\//, '')}</a></>}
                  </>
                ) : (
                  <>Community submission</>
                )}
                {d.submitted_at && <span className="text-amber-600"> &middot; {new Date(d.submitted_at).toLocaleDateString()}</span>}
              </span>
              <button onClick={() => setFlagOpen(true)} className="text-amber-700 hover:text-red-600 underline text-xs font-medium">
                Report
              </button>
            </div>
          )}

          {isGated && (d.access_instructions || d.price_range) && (
            <div className="mb-3 text-sm bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-purple-800 uppercase tracking-wide">Gated access</span>
                {d.price_range && (
                  <span className="text-[10px] bg-white text-purple-700 border border-purple-300 px-1.5 py-0.5 rounded-full">{labelFor('price_range', d.price_range)}</span>
                )}
              </div>
              {d.access_instructions && <p className="text-purple-900 leading-relaxed">{d.access_instructions}</p>}
            </div>
          )}

          {d.semantic_description && (
            <p className="text-gray-600 mb-2 leading-relaxed">{d.semantic_description}</p>
          )}
          {d.description && d.description !== d.semantic_description && String(d.description).length > 20 && (
            <p className="text-sm text-gray-500 leading-relaxed">{String(d.description).slice(0, 600)}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-6">
            {d.url && (
              <a href={d.url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
                View on source portal &rarr;
              </a>
            )}
            {d.api_endpoint && d.api_endpoint !== 'None' && (
              <a href={d.api_endpoint} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                API endpoint
              </a>
            )}
            {d.documentation_url && d.documentation_url !== 'None' && d.documentation_url !== d.url && (
              <a href={d.documentation_url} target="_blank" rel="noopener noreferrer"
                 className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Documentation
              </a>
            )}
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 mb-4 lg:mb-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Dataset Information</h2>
            <dl>
              <InfoRow label="Publisher" value={d.publisher_normalized || d.provider} />
              <InfoRow label="Source Portal" value={d.source_portal} />
              <InfoRow label="Platform" value={labelFor('source_platform', d.source_platform)} />
              <InfoRow label="Format" value={formats} />
              <InfoRow label="Access Method" value={labelFor('access_method', d.access_method)} />
              <InfoRow label="Geographic Scope" value={labelFor('geographic_scope', d.geographic_scope)} />
              <InfoRow label="Geographic Detail" value={d.geographic_detail} />
              <InfoRow label="Update Frequency" value={labelFor('update_frequency', d.update_frequency)} />
              <InfoRow label="Last Updated" value={d.last_updated ? new Date(d.last_updated).toLocaleDateString() : null} />
              <InfoRow label="Created" value={d.created_at ? new Date(d.created_at).toLocaleDateString() : null} />
              <InfoRow label="Row Count" value={d.row_count?.toLocaleString()} />
              <InfoRow label="Column Count" value={d.column_count || (d.columns || []).length || null} />
              <InfoRow label="API Endpoint" value={d.api_endpoint && d.api_endpoint !== 'None' ? d.api_endpoint : null} href={d.api_endpoint} />
            </dl>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
            <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">Classification</h2>
            <dl>
              <InfoRow label="Domain" value={d.domain?.replace(/_/g, ' ')} />
              {d.hierarchy && (
                <>
                  <InfoRow label="Galaxy" value={d.hierarchy.galaxy_label} />
                  <InfoRow label="System" value={d.hierarchy.solar_system_label} />
                  <InfoRow label="Planet" value={d.hierarchy.planet_label} />
                </>
              )}
            </dl>

            {d.tags && d.tags.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2.5">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {d.tags.map((t, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            )}

            {d.also_available?.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2.5">Also Available On</h3>
                <div className="space-y-1.5">
                  {d.also_available.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                       className="block text-sm text-blue-600 hover:underline">{a.source?.replace('.jsonl', '')}</a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Schema */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
            Schema
            {d.columns?.length > 0 && (
              <span className="text-gray-400 font-normal ml-2">{d.columns.length} columns</span>
            )}
          </h2>
          <SchemaTable columns={d.columns} />
        </div>

        <div className="text-center text-xs text-gray-400 mt-6 pb-4">
          <Link to="/about" className="hover:text-gray-600">About the build</Link>
        </div>
      </div>

      <FlagModal open={flagOpen} onClose={() => setFlagOpen(false)} datasetId={d.id} datasetName={d.name} />
    </div>
  );
}
