import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import FilterSidebar from '../components/FilterSidebar';
import ResultCard, { SkeletonCard } from '../components/ResultCard';
import { LogoFull } from '../components/Logo';
import usePageTitle from '../hooks/usePageTitle';

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

const CATEGORIES = [
  { domain: 'health', label: 'Health & Medicine', icon: '🏥' },
  { domain: 'education', label: 'Education', icon: '🎓' },
  { domain: 'finance', label: 'Finance & Economics', icon: '📊' },
  { domain: 'environment', label: 'Environment', icon: '🌿' },
  { domain: 'transportation', label: 'Transportation', icon: '🚌' },
  { domain: 'demographics', label: 'Demographics', icon: '👥' },
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [includeNoSchema, setIncludeNoSchema] = useState(false);
  const [visibleCount, setVisibleCount] = useState(50);
  const [browseMode, setBrowseMode] = useState(null);
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
    setVisibleCount(50);
    const params = new URLSearchParams({ q: searchQuery });
    for (const [key, val] of Object.entries(searchFilters)) {
      if (val) params.set(key, val);
    }
    if (includeNoSchema) params.set('includeNoSchema', 'true');
    setSearchParams(params, { replace: true });
    try {
      const resp = await fetch(`/api/search?${params}&limit=200`);
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
    setBrowseMode(null);
    setQuery(ex);
    setFilters({});
    doSearch(ex, {});
  }

  async function handleBrowse(cat) {
    setBrowseMode(cat);
    setLoading(true);
    setVisibleCount(50);
    setSearchParams({ browse: cat.domain }, { replace: true });
    try {
      const resp = await fetch(`/api/browse?domain=${cat.domain}&limit=200`);
      const data = await resp.json();
      setResults(data.results || []);
      setTotalMatching(data.count || 0);
      setTotalFiltered(data.count || 0);
      setFacets(null);
    } catch (e) {
      console.error(e);
      setResults([]);
    }
    setLoading(false);
  }

  function handleBackToHome() {
    setBrowseMode(null);
    setSearchParams({});
    setResults([]);
    setFilters({});
    setQuery('');
    setTotalMatching(0);
    setTotalFiltered(0);
    setMobileFiltersOpen(false);
    fetch('/api/filters').then(r => r.json()).then(setFacets).catch(() => {});
  }

  const searched = searchParams.has('q') || searchParams.has('browse');
  const datasetCount = stats ? (stats.uniqueRecords || stats.totalRecords).toLocaleString() : '170,000';
  const activeFilterCount = ['domain', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform'].filter(k => filters[k]).length;

  usePageTitle(searched ? (browseMode ? browseMode.label : 'Schema Search') : 'SchemaFinder');

  // Load browse on mount if URL has browse param
  useEffect(() => {
    const browseDomain = searchParams.get('browse');
    if (browseDomain && !browseMode) {
      const cat = CATEGORIES.find(c => c.domain === browseDomain);
      if (cat) handleBrowse(cat);
    }
  }, []); // eslint-disable-line

  // =========== LANDING PAGE ===========
  if (!searched) {
    return (
      <div className="min-h-screen bg-white">
        {/* Nav bar */}
        <nav className="flex items-center justify-between px-6 lg:px-10 py-4 max-w-5xl mx-auto">
          <LogoFull size="md" />
          <div className="flex items-center gap-4">
            <Link to="/api-docs" className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">API Docs</Link>
            <Link to="/about" className="text-sm text-gray-500 hover:text-gray-800 font-medium transition-colors">About</Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="max-w-3xl mx-auto px-6 pt-12 lg:pt-20 pb-8 text-center">
          <h1 className="text-3xl lg:text-5xl font-bold text-gray-900 tracking-tight mb-3">
            Search <span className="text-blue-600">{datasetCount}+</span> public datasets
          </h1>
          <p className="text-base lg:text-lg text-gray-500 mb-8 max-w-xl mx-auto">
            Find schemas, APIs, and download links from government portals, cloud warehouses, and research platforms.
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="w-full max-w-xl mx-auto mb-3">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-12 pr-28 py-3.5 border border-gray-300 rounded-xl bg-white text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                placeholder="Search datasets, columns, sources..."
              />
              <button type="submit" disabled={!query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors">
                Search
              </button>
            </div>
          </form>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={includeNoSchema} onChange={e => setIncludeNoSchema(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 accent-blue-600" />
            <span className="text-xs text-gray-400">Include datasets without full schemas</span>
          </label>
        </div>

        {/* Example searches */}
        <div className="max-w-2xl mx-auto px-6 pb-10 text-center">
          <div className="flex flex-wrap justify-center gap-2">
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => handleExample(ex)}
                className="text-xs lg:text-sm px-3.5 py-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Category cards */}
        <div className="max-w-4xl mx-auto px-6 pb-16">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider text-center mb-5">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {CATEGORIES.map(cat => (
              <button key={cat.domain} onClick={() => handleBrowse(cat)}
                className="group flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left">
                <span className="text-2xl">{cat.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition-colors">{cat.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Developer CTA */}
        <div className="max-w-4xl mx-auto px-6 pb-12">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">Build with the SchemaFinder API</p>
              <p className="text-xs text-gray-500">Free REST API for apps and AI agents. OpenAPI spec + MCP server for Claude.</p>
            </div>
            <Link to="/api-docs" className="text-sm font-medium text-blue-600 hover:text-blue-800 whitespace-nowrap">
              View docs &rarr;
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 py-6 border-t border-gray-100">
          {datasetCount}+ datasets from 17+ platforms
        </div>
      </div>
    );
  }

  // =========== RESULTS PAGE ===========
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="px-4 lg:px-6 py-3 max-w-[1400px] mx-auto">
          {/* Desktop header */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={handleBackToHome} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition-colors shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <LogoFull size="md" />
            </button>
            <form onSubmit={handleSearch} className="flex-1 flex gap-2 max-w-3xl">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search datasets..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
              <button type="submit" disabled={loading || !query.trim()}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Search
              </button>
            </form>
            <Link to="/api-docs" className="text-sm text-blue-600 hover:text-blue-800 font-medium whitespace-nowrap shrink-0">API Docs</Link>
          </div>

          {/* Mobile header */}
          <div className="md:hidden space-y-2">
            <div className="flex items-center justify-between">
              <button onClick={handleBackToHome} className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                <LogoFull size="sm" />
              </button>
              <Link to="/api-docs" className="text-xs text-blue-600 font-medium">API</Link>
            </div>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input type="text" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <button type="submit" disabled={loading || !query.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Go
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Schema checkbox — both mobile and desktop */}
      <div className="bg-white border-b border-gray-100 px-4 lg:px-6 py-1.5 max-w-[1400px] mx-auto w-full">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={includeNoSchema} onChange={e => { setIncludeNoSchema(e.target.checked); if (query.trim()) doSearch(query, filters); }}
            className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 accent-blue-600" />
          <span className="text-xs text-gray-500">Include datasets without full schemas</span>
        </label>
      </div>

      {/* Mobile filter toggle */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="flex items-center gap-2 text-sm text-gray-600"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-blue-100 text-blue-700 text-xs font-medium px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ml-auto transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {mobileFiltersOpen && (
          <div className="mt-3 pb-2 max-h-[50vh] overflow-y-auto">
            <FilterSidebar facets={facets} filters={filters} onFilterChange={handleFilterChange} />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 max-w-[1400px] mx-auto w-full">
        {/* Desktop sidebar */}
        <div className="hidden lg:block w-72 shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-5">
          <FilterSidebar facets={facets} filters={filters} onFilterChange={handleFilterChange} />
        </div>

        {/* Results */}
        <main className="flex-1 min-w-0 p-4 lg:p-6">
          {loading ? (
            <div className="space-y-3">
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                {browseMode ? (
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-800">{results.length}</span> top datasets in{' '}
                    <span className="text-gray-700 font-medium">{browseMode.label}</span>
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Showing <span className="font-semibold text-gray-800">{Math.min(visibleCount, results.length)}</span>
                    {results.length > visibleCount && ` of ${results.length}`}
                    {totalFiltered > results.length && ` (${totalFiltered.toLocaleString()} matched)`}
                    {' '}for "<span className="text-gray-700 font-medium">{searchParams.get('q')}</span>"
                  </p>
                )}
              </div>
              <div className="space-y-3">
                {results.slice(0, visibleCount).map((r, i) => <ResultCard key={r.id || i} result={r} query={searchParams.get('q')} />)}
              </div>
              {results.length > visibleCount && (
                <div className="text-center mt-6">
                  <button onClick={() => setVisibleCount(v => v + 50)}
                    className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors">
                    Show more results
                  </button>
                </div>
              )}
              {results.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3 opacity-40">🔍</div>
                  <p className="text-gray-500 font-medium mb-1">No matching datasets</p>
                  <p className="text-sm text-gray-400">Try different keywords or clear your filters.</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
