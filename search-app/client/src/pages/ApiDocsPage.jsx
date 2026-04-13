import { useNavigate, Link } from 'react-router-dom';
import { LogoFull } from '../components/Logo';
import usePageTitle from '../hooks/usePageTitle';

const CODE_BG = 'bg-gray-900 text-gray-100 rounded-lg p-4 text-sm font-mono overflow-x-auto';

function CodeBlock({ children }) {
  return <pre className={CODE_BG}><code>{children}</code></pre>;
}

export default function ApiDocsPage() {
  const navigate = useNavigate();
  usePageTitle('API Docs — SchemaFinder');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <LogoFull size="md" />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">API Documentation</h1>
        <p className="text-gray-500 mb-10">Search 200K+ public datasets programmatically. Free, no auth required.</p>

        {/* Quick start */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Start</h2>
          <CodeBlock>{`curl "https://schemafinder.com/api/v1/search?q=COVID+hospitalizations+by+county&limit=5"`}</CodeBlock>
        </section>

        {/* Search endpoint */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Search Datasets</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded">GET</span>
              <code className="text-sm text-gray-800">/api/v1/search</code>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Semantic search across all indexed datasets. Returns results ranked by relevance with metadata, source URLs, API endpoints, and column schemas.
            </p>

            <h3 className="text-sm font-bold text-gray-700 mb-2">Parameters</h3>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Param</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Type</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-blue-700">q</td>
                  <td className="py-2 pr-4">string <span className="text-red-500 text-xs">required</span></td>
                  <td className="py-2">Natural language search query</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-blue-700">limit</td>
                  <td className="py-2 pr-4">int</td>
                  <td className="py-2">Max results (default 10, max 50)</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-blue-700">domain</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2">Filter: health, education, transportation, environment, finance, public_safety, elections, labor, demographics, natural_resources, technology, legal, energy, agriculture, housing</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-blue-700">format</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2">Filter: api, flat_file, structured, geospatial, document</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-mono text-blue-700">geography</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2">Filter: global, us_national, wa_state, wa_city, wa_county</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-blue-700">platform</td>
                  <td className="py-2 pr-4">string</td>
                  <td className="py-2">Filter: socrata, ckan, arcgis, bigquery, aws, huggingface, kaggle</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-sm font-bold text-gray-700 mb-2">Example Response</h3>
          <CodeBlock>{`{
  "query": "salmon habitat",
  "total_matching": 2033,
  "count": 2,
  "results": [
    {
      "name": "Pacific Salmon Conservation Units",
      "description": "Conservation units for wild Pacific salmon...",
      "domain": "natural_resources",
      "publisher": "Fisheries and Oceans Canada",
      "url": "https://open.canada.ca/data/en/dataset/...",
      "api_endpoint": null,
      "format": "csv, json",
      "columns": ["species", "conservation_unit", "status", "region"],
      "geographic_scope": "global",
      "update_frequency": "annual",
      "relevance_score": 0.71
    }
  ]
}`}</CodeBlock>
        </section>

        {/* OpenAPI */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">OpenAPI Spec</h2>
          <p className="text-sm text-gray-600 mb-3">
            For AI agents using function calling or tool use, the full OpenAPI 3.0 specification is available at:
          </p>
          <CodeBlock>{`https://schemafinder.com/api/v1/openapi.json`}</CodeBlock>
          <p className="text-sm text-gray-500 mt-3">
            Point your agent's tool discovery to this URL. Works with Claude, GPT, LangChain, and any OpenAPI-compatible tool framework.
          </p>
        </section>

        {/* MCP */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Claude MCP Integration</h2>
          <p className="text-sm text-gray-600 mb-3">
            Use Dataset Explorer as a native tool in Claude Code or Claude Desktop via Model Context Protocol (MCP).
          </p>

          <h3 className="text-sm font-bold text-gray-700 mb-2">Install</h3>
          <CodeBlock>{`npm install -g schemafinder-mcp`}</CodeBlock>

          <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">Add to Claude Code settings</h3>
          <CodeBlock>{`// ~/.claude/settings.json
{
  "mcpServers": {
    "schemafinder": {
      "command": "npx",
      "args": ["schemafinder-mcp"]
    }
  }
}`}</CodeBlock>

          <h3 className="text-sm font-bold text-gray-700 mt-4 mb-2">Available tools</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
            <div>
              <code className="text-blue-700 font-bold">search_datasets</code>
              <span className="text-gray-500 ml-2">Search for public datasets by natural language query</span>
            </div>
            <div>
              <code className="text-blue-700 font-bold">get_dataset_schema</code>
              <span className="text-gray-500 ml-2">Get full column schema and metadata for a specific dataset</span>
            </div>
          </div>
        </section>

        {/* Python / JS examples */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Code Examples</h2>

          <h3 className="text-sm font-bold text-gray-700 mb-2">Python</h3>
          <CodeBlock>{`import requests

results = requests.get("https://schemafinder.com/api/v1/search", params={
    "q": "unemployment rate by county",
    "domain": "labor",
    "format": "api",
    "limit": 5
}).json()

for r in results["results"]:
    print(f"{r['name']} — {r['url']}")
    if r['api_endpoint']:
        print(f"  Query directly: {r['api_endpoint']}")`}</CodeBlock>

          <h3 className="text-sm font-bold text-gray-700 mt-6 mb-2">JavaScript</h3>
          <CodeBlock>{`const resp = await fetch(
  "https://schemafinder.com/api/v1/search?q=school+enrollment&limit=5"
);
const { results } = await resp.json();

results.forEach(r => {
  console.log(r.name, r.columns);
});`}</CodeBlock>
        </section>

        {/* Rate limits */}
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Usage</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-2">
            <p><strong>Authentication:</strong> None required. The API is free and open.</p>
            <p><strong>Rate limits:</strong> Be reasonable. No hard limits currently enforced.</p>
            <p><strong>Data freshness:</strong> Dataset schemas are indexed periodically. The search index is not real-time.</p>
            <p><strong>Coverage:</strong> 200K+ datasets from 17+ platforms including data.gov, Socrata portals, World Bank, Eurostat, Canada, SEC EDGAR, WHO, HuggingFace, Kaggle, and more.</p>
          </div>
        </section>

        <div className="text-center text-xs text-gray-400 mt-8 pb-4">
          <Link to="/about" className="hover:text-gray-600">About the build</Link>
        </div>
      </div>
    </div>
  );
}
