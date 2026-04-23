import { labelFor } from '../lib/labels';

const FILTER_LABELS = {
  domain: 'Category',
  source_type: 'Source',
  access: 'Access',
  price_range: 'Pricing',
  formatType: 'Data Format',
  geographic_scope: 'Geography',
  update_frequency: 'Update Frequency',
  source_platform: 'Platform',
};

// Hide facets that only have a single default-state option (e.g. source_type
// showing only "curated" when there are zero community submissions).
const HIDE_IF_ONLY = { source_type: 'curated', access: 'open' };

function FilterGroup({ facetKey, label, options, selected, onChange }) {
  if (!options || options.length === 0) return null;
  if (HIDE_IF_ONLY[facetKey] && options.length === 1 && options[0].value === HIDE_IF_ONLY[facetKey]) return null;

  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">{label}</h3>
      <div className="space-y-0.5">
        {options.map(opt => {
          const isSelected = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(isSelected ? '' : opt.value)}
              className={`w-full flex items-center gap-2 text-left text-[13px] rounded px-2 py-1.5 transition-colors ${
                isSelected
                  ? 'bg-blue-100 text-blue-800 font-medium'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <span className="flex-1 truncate">{labelFor(facetKey, opt.value)}</span>
              <span className={`text-[11px] tabular-nums ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                {opt.count.toLocaleString()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FilterSidebar({ facets, filters, onFilterChange }) {
  if (!facets) return null;

  const filterKeys = ['domain', 'source_type', 'access', 'price_range', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform'];
  const activeCount = filterKeys.filter(k => filters[k]).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-gray-900">Filters</h2>
        {activeCount > 0 && (
          <button
            onClick={() => onFilterChange({})}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Clear all ({activeCount})
          </button>
        )}
      </div>
      {filterKeys.map(key => (
        <FilterGroup
          key={key}
          facetKey={key}
          label={FILTER_LABELS[key]}
          options={facets[key] || []}
          selected={filters[key] || ''}
          onChange={val => onFilterChange({ ...filters, [key]: val })}
        />
      ))}
    </div>
  );
}
