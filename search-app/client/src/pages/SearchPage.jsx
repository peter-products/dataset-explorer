import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import FilterSidebar from '../components/FilterSidebar';
import ResultCard from '../components/ResultCard';
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
    setMobileFiltersOpen(false);
    fetch('/api/filters').then(r => r.json()).then(setFacets).catch(() => {});
  }

  const searched = searchParams.has('q');
  const datasetCount = stats ? (stats.uniqueRecords || stats.totalRecords).toLocaleString() : '170,000';
  const [apiDocsOpen, setApiDocsOpen] = useState(true);
  const activeFilterCount = ['domain', 'formatType', 'geographic_scope', 'update_frequency', 'source_platform'].filter(k => filters[k]).length;

  usePageTitle(searched ? 'Schema Search' : 'SchemaFinder');

  // =========== LANDING PAGE ===========
  if (!searched) {
    return (
      <div className="min-h-screen bg-white lg:flex">
        {/* Sidebar — hidden on mobile */}
        <div className="hidden lg:block w-72 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto h-screen sticky top-0">
          <div className="p-5">
            <FilterSidebar facets={facets} filters={filters} onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col">
          <div className="flex justify-end px-4 lg:px-8 pt-4">
            <Link to="/api-docs" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              API Docs
            </Link>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8 lg:-mt-16">
            <h1 className="mb-8 lg:mb-12">
              <LogoFull size="lg" className="text-3xl lg:text-4xl" />
            </h1>

            <div className="w-full max-w-xl bg-blue-50 border border-blue-200 rounded-2xl px-5 py-6 lg:px-10 lg:py-8 mb-8 lg:mb-12">
              <p className="text-center text-lg lg:text-xl font-semibold text-gray-800 mb-4 lg:mb-5">
                What data are you looking for?
              </p>
              <form onSubmit={handleSearch}>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl bg-white text-base text-center text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm"
                  placeholder=""
                />
              </form>
              <p className="text-center text-xs lg:text-sm text-gray-500 mt-3">
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
                    className="text-xs lg:text-sm px-3 py-1.5 bg-gray-100 rounded-full text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* API section — expandable */}
          <div className="max-w-2xl mx-auto mt-12 lg:mt-16 mb-8 px-4 lg:px-0 w-full">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setApiDocsOpen(!apiDocsOpen)}
                className="w-full flex items-center gap-3 lg:gap-4 p-4 lg:p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm">Build with the API</h3>
                  <p className="text-xs lg:text-sm text-gray-500 truncate">Free REST API for AI agents. OpenAPI spec + MCP server for Claude.</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 text-gray-400 transition-transform shrink-0 ${apiDocsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {apiDocsOpen && (
                <div className="px-4 lg:px-5 pb-4 lg:pb-5 border-t border-gray-100">
                  <div className="mt-4 space-y-4 text-sm">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1.5">Quick Start</h4>
                      <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`curl "https://schemafinder.com/api/v1/search?q=COVID+hospitalizations&limit=5"`}
                      </pre>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1.5">Response includes</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                        <div className="bg-gray-50 rounded px-2.5 py-1.5"><span className="font-mono text-blue-700">url</span> — link to source portal</div>
                        <div className="bg-gray-50 rounded px-2.5 py-1.5"><span className="font-mono text-blue-700">api_endpoint</span> — direct data API</div>
                        <div className="bg-gray-50 rounded px-2.5 py-1.5"><span className="font-mono text-blue-700">columns</span> — schema field names</div>
                        <div className="bg-gray-50 rounded px-2.5 py-1.5"><span className="font-mono text-blue-700">format</span> — CSV, JSON, API, etc.</div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-1.5">AI Agent Integration</h4>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">OpenAPI</span>
                          <a href="/api/v1/openapi.json" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono break-all">schemafinder.com/api/v1/openapi.json</a>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium">MCP</span>
                          <span>Claude Code/Desktop: <code className="bg-gray-100 px-1 rounded">npx schemafinder-mcp</code></span>
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <Link to="/api-docs" className="text-sm font-medium text-blue-600 hover:text-blue-800">
                        Full API documentation &rarr;
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 py-4 px-4">
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
            <div className="text-center py-16 text-gray-500">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-3"></div>
              Searching...
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-4">
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
