import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilterSidebar from '../components/FilterSidebar';
import ResultCard from '../components/ResultCard';

const EXAMPLES = [
  'COVID-19 hospitalizations by county',
  'salmon habitat in Puget Sound',
  'property tax assessments',
  'air quality monitoring stations',
  'school enrollment by grade',
  'unemployment rate by industry',
  'building permits issued',
  'election results by precinct',
];

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [facets, setFacets] = useState(null);
  const [totalMatching, setTotalMatching] = useState(0);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const inputRef = useRef(null);

  const getFiltersFromParams = useCallback(() => {
    const f = {};
    for (const key of ['domain', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform']) {
      const val = searchParams.get(key);
      if (val) f[key] = val;
    }
    return f;
  }, [searchParams]);

  const [filters, setFilters] = useState(getFiltersFromParams);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/filters').then(r => r.json()).then(setFacets).catch(() => {});
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      doSearch(q, getFiltersFromParams());
    }
  }, []); // eslint-disable-line

  async function doSearch(q, f) {
    const searchQuery = q ?? query;
    const searchFilters = f ?? filters;
    if (!searchQuery.trim()) return;
    setLoading(true);
    const params = new URLSearchParams({ q: searchQuery });
    for (const [key, val] of Object.entries(searchFilters)) {
      if (val) params.set(key, val);
    }
    setSearchParams(params, { replace: true });
    try {
      const resp = await fetch(`/api/search?${params}&limit=60`);
      const data = await resp.json();
      setResults(data.results || []);
      setFacets(data.facets || null);
      setTotalMatching(data.totalMatching || 0);
      setTotalFiltered(data.totalFiltered || 0);
    } catch (err) {
      console.error(err);
      setResults([]);
    }
    setLoading(false);
  }

  function handleSearch(e) {
    e?.preventDefault();
    doSearch();
  }

  function handleFilterChange(newFilters) {
    setFilters(newFilters);
    if (query.trim()) doSearch(query, newFilters);
  }

  function handleExample(ex) {
    setQuery(ex);
    setFilters({});
    doSearch(ex, {});
  }

  function handleBackToHome() {
    setSearchParams({});
    setResults([]);
    setFilters({});
    setQuery('');
    setTotalMatching(0);
    setTotalFiltered(0);
    fetch('/api/filters').then(r => r.json()).then(setFacets).catch(() => {});
  }

  const searched = searchParams.has('q');
  const datasetCount = stats ? (stats.uniqueRecords || stats.totalRecords).toLocaleString() : '170,000';

  // =========== LANDING PAGE ===========
  if (!searched) {
    return (
      <div className="min-h-screen bg-white flex">
        {/* Left sidebar */}
        <div className="w-72 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto h-screen sticky top-0">
          <div className="p-5">
            <FilterSidebar facets={facets} filters={filters} onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          {/* Centered hero */}
          <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-16">
            <h1 className="text-5xl font-bold text-gray-900 mb-12 tracking-tight">
              Dataset Explorer
            </h1>

            <div className="w-full max-w-xl bg-blue-50 border border-blue-200 rounded-2xl px-10 py-8 mb-12">
              <p className="text-center text-xl font-semibold text-gray-800 mb-5">
                What data are you looking for?
              </p>
              <form onSubmit={handleSearch}>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full px-5 py-3 border border-gray-300 rounded-xl bg-white text-base text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm"
                  placeholder=""
                />
              </form>
              <p className="text-center text-sm text-gray-500 mt-3">
                Search for keywords, column names, data sources
              </p>
            </div>

            <div className="w-full max-w-2xl">
              <p className="text-sm text-gray-500 mb-3">Or try these searches:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex}
                    onClick={() => handleExample(ex)}
                    className="text-sm px-3.5 py-1.5 bg-gray-100 rounded-full text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400 py-4">
            {datasetCount}+ public datasets from government portals, cloud warehouses, and research platforms
          </div>
        </div>
      </div>
    );
  }

  // =========== RESULTS PAGE ===========
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 px-6 py-3 max-w-[1400px] mx-auto">
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-lg font-bold text-blue-700 tracking-tight">Dataset Explorer</span>
          </button>

          <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-3xl">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search datasets..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Search
            </button>
          </form>

          <span className="text-xs text-gray-400 whitespace-nowrap hidden lg:block shrink-0">
            {datasetCount}+ datasets
          </span>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 max-w-[1400px] mx-auto w-full">
        {/* Sidebar */}
        <div className="w-72 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-5">
          <FilterSidebar facets={facets} filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Results */}
        <main className="flex-1 min-w-0 p-6">
          {loading ? (
            <div className="text-center py-16 text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-3"></div>
              Searching...
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-5">
                <span className="font-semibold text-gray-800">{totalFiltered.toLocaleString()}</span> results
                {totalFiltered !== totalMatching && ` (of ${totalMatching.toLocaleString()} matching)`}
                {' '}for "<span className="text-gray-700 font-medium">{searchParams.get('q')}</span>"
              </p>
              <div className="space-y-3">
                {results.map((r, i) => <ResultCard key={r.id || i} result={r} />)}
              </div>
              {results.length === 0 && (
                <p className="text-center text-gray-400 py-12">No matching datasets. Try different terms or clear filters.</p>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
