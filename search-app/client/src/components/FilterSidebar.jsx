const FILTER_LABELS = {
  domain: 'Category',
  formatType: 'Data Format',
  geographic_scope: 'Geography',
  update_frequency: 'Update Frequency',
  source_platform: 'Platform',
};

const VALUE_LABELS = {
  api: 'API / Queryable', flat_file: 'Flat File (CSV, XLSX)', structured: 'Structured (JSON, XML)',
  geospatial: 'Geospatial (GeoJSON, SHP)', document: 'Document (PDF, HTML)', other: 'Other',
  global: 'Global', varies: 'Varies', us_national: 'US National', wa_state: 'Washington State',
  wa_city: 'WA City', wa_county: 'WA County', us_city: 'US City', us_state: 'US State',
  annual: 'Annual', quarterly: 'Quarterly', monthly: 'Monthly', daily: 'Daily', weekly: 'Weekly', one_time: 'One-time',
  ckan: 'CKAN', socrata: 'Socrata', arcgis: 'ArcGIS', bigquery: 'BigQuery',
  huggingface: 'Hugging Face', kaggle: 'Kaggle', aws: 'AWS Open Data', gtfs: 'GTFS Transit', custom: 'Custom',
  health: 'Health & Medicine', education: 'Education', transportation: 'Transportation',
  environment: 'Environment', finance: 'Finance & Economics', public_safety: 'Public Safety',
  elections: 'Elections', labor: 'Labor & Employment', demographics: 'Demographics',
  natural_resources: 'Natural Resources', technology: 'Technology', legal: 'Legal & Regulatory',
  energy: 'Energy', agriculture: 'Agriculture', housing: 'Housing & Land Use',
};

function FilterGroup({ label, options, selected, onChange }) {
  if (!options || options.length === 0) return null;

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
              <span className="flex-1 truncate">{VALUE_LABELS[opt.value] || opt.value}</span>
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

  const filterKeys = ['domain', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform'];
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
          label={FILTER_LABELS[key]}
          options={facets[key] || []}
          selected={filters[key] || ''}
          onChange={val => onFilterChange({ ...filters, [key]: val })}
        />
      ))}
    </div>
  );
}
