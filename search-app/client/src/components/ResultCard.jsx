import { Link } from 'react-router-dom';
import DomainBadge from './DomainBadge';
import { labelFor } from '../lib/labels';

function highlightTerms(text, query) {
  if (!text || !query) return text;
  const words = query.split(/\s+/).filter(w => w.length > 2);
  if (!words.length) return text;
  const re = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(re);
  return parts.map((part, i) =>
    re.test(part) ? <mark key={i} className="bg-yellow-100 text-gray-900 rounded px-0.5">{part}</mark> : part
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-100 rounded w-16"></div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-3 bg-gray-100 rounded w-full"></div>
        <div className="h-3 bg-gray-100 rounded w-2/3"></div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-5 bg-gray-100 rounded-full w-20"></div>
        <div className="h-3 bg-gray-100 rounded w-32"></div>
        <div className="h-5 bg-blue-50 rounded-full w-16"></div>
      </div>
    </div>
  );
}

export default function ResultCard({ result, query }) {
  const score = (result.score * 100).toFixed(0);
  const detailUrl = `/dataset/${encodeURIComponent(result.id)}`;
  const isCommunity = result.source_type === 'community';
  const isGated = result.access === 'gated';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-5 hover:border-blue-300 hover:shadow-md transition-all text-left group">
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">
          <Link to={detailUrl} className="group-hover:text-blue-600 transition-colors">
            {highlightTerms(result.name, query)}
          </Link>
        </h3>
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          {isCommunity && (
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide">Community</span>
          )}
          {isGated && (
            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide">Gated</span>
          )}
          <span className="text-xs text-gray-400 whitespace-nowrap tabular-nums">{score}%</span>
        </div>
      </div>

      {result.summary && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">{highlightTerms(result.summary, query)}</p>
      )}

      <div className="flex items-center gap-2 flex-wrap text-xs">
        <DomainBadge domain={result.domain} />
        {result.publisher && (
          <span className="text-gray-500 truncate max-w-40 lg:max-w-56">{result.publisher}</span>
        )}
        {result.formatType && result.formatType !== 'other' && (
          <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{labelFor('formatType', result.formatType)}</span>
        )}
        {result.column_count > 0 && (
          <span className="text-gray-400">{result.column_count} cols</span>
        )}
        {result.update_frequency && result.update_frequency !== 'unknown' && (
          <span className="text-gray-400">{result.update_frequency}</span>
        )}
      </div>

      {result.also_available?.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-gray-100 text-xs text-gray-400">
          Also on: {result.also_available.slice(0, 3).map((a, i) => (
            <span key={i}>
              {i > 0 && ', '}
              {a.url ? <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">{a.source}</a> : a.source}
            </span>
          ))}
          {result.also_available.length > 3 && ` +${result.also_available.length - 3} more`}
        </div>
      )}
    </div>
  );
}
