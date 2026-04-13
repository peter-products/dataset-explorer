import { Link } from 'react-router-dom';
import DomainBadge from './DomainBadge';

export default function ResultCard({ result }) {
  const score = (result.score * 100).toFixed(0);
  const detailUrl = `/dataset/${encodeURIComponent(result.id)}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3.5 lg:p-5 hover:border-blue-200 hover:shadow-sm transition-all text-left">
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug flex-1">
          <Link to={detailUrl} className="hover:text-blue-600 hover:underline">
            {result.name}
          </Link>
        </h3>
        <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">{score}% match</span>
      </div>

      {result.summary && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">{result.summary}</p>
      )}

      <div className="flex items-center gap-2.5 flex-wrap">
        <DomainBadge domain={result.domain} />
        {result.publisher && (
          <span className="text-xs text-gray-500 truncate max-w-32 lg:max-w-52">{result.publisher}</span>
        )}
        {result.formatType && result.formatType !== 'other' && (
          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{result.formatType.replace(/_/g, ' ')}</span>
        )}
        {result.update_frequency && result.update_frequency !== 'unknown' && (
          <span className="text-xs text-gray-400 italic">{result.update_frequency}</span>
        )}
      </div>

      {result.also_available?.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-400">
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
