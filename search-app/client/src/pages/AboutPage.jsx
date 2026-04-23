import { Link } from 'react-router-dom';
import { LogoFull } from '../components/Logo';
import usePageTitle from '../hooks/usePageTitle';

export default function AboutPage() {
  usePageTitle('About | SchemaFinder');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 lg:px-6 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <LogoFull size="md" />
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 lg:px-6 py-8 lg:py-12">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-6">How SchemaFinder Was Built</h1>

        <div className="prose prose-gray prose-sm lg:prose-base max-w-none space-y-5 text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-3">The Problem</h2>
          <p>
            Public data is everywhere: data.gov, World Bank, Eurostat, Snowflake Marketplace, Hugging Face, hundreds of city and state portals.
            But discovering which dataset answers your question is brutally hard. Previous attempts at data discovery were keyword-based and mediocre.
          </p>
          <p>
            The insight: you don't need to query data to understand it. Column names, table names, descriptions, and data types carry enormous
            semantic signal. An LLM trained on millions of schemas can infer what questions a dataset can answer without seeing a single row.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-3">Data Collection</h2>
          <p>
            Started by crawling 17 different data platforms (data.gov, World Bank, Eurostat, Socrata city portals, ArcGIS Hub, SEC EDGAR,
            WHO, HuggingFace, Kaggle, AWS Open Data, BigQuery, and more) to collect 200K+ dataset schemas. Just the metadata, not the actual
            data. Each record has a name, description, columns, tags, publisher, and URL.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-3">Data Enrichment</h2>
          <p>
            Then ran a multi-step enrichment pipeline:
          </p>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Publisher normalization:</strong> mapped 9,000+ raw publisher strings to canonical IDs (e.g., "WA Dept of Health", "DOH",
              "Washington State Department of Health" all resolve to one entity).
            </li>
            <li>
              <strong>Hierarchy assignment:</strong> placed each dataset into a 4-level taxonomy (galaxy → solar system → planet → continent)
              for structured navigation.
            </li>
            <li>
              <strong>Domain classification:</strong> classified everything into 15 categories (health, education, transportation, environment,
              finance, etc.). A/B tested four different models for this; Claude Sonnet won by a wide margin over Gemma, a heuristic classifier,
              and Haiku. Sonnet was too slow for 200K records via subagents, so used it for the highest-priority records and a heuristic keyword
              classifier (trained from Sonnet's patterns) for the bulk.
            </li>
            <li>
              <strong>URL fixes:</strong> 23K Canadian and Italian records had been collected through a US data.gov mirror, pointing to the wrong
              portal. Fixed to open.canada.ca and dati.gov.it respectively.
            </li>
            <li>
              <strong>Deduplication:</strong> hashed publisher + name + column signature to find duplicates across portals. Flagged 30K duplicates;
              search shows the canonical record with "also available on" links.
            </li>
            <li>
              <strong>Keyword generation:</strong> extracted ~35 search keywords per dataset from names, descriptions, columns, tags, and
              domain-related terms. Added abbreviation expansions (COVID → coronavirus, EPA → Environmental Protection Agency, etc.).
            </li>
          </ul>

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-3">Search Architecture</h2>
          <p>
            Built 40 synonym groups (death↔mortality, income↔revenue, salmon↔fisheries, etc.) so users find results regardless of which
            term they use. Embedded everything with MiniLM for semantic search, then combined embedding similarity (70%) with keyword overlap (30%)
            to get relevant results. Pure embeddings alone kept surfacing SEC filings for every query because their generic descriptions got
            spuriously high cosine similarity scores.
          </p>
          <p>
            The search computes facet counts from the matching set so sidebar filters reflect the current results, not the global catalog.
            Clicking a filter narrows results and all other facet counts adjust accordingly. Standard e-commerce search UX applied to data discovery.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-3">Deployment</h2>
          <p>
            The server uses <code>@xenova/transformers</code> to run the embedding model on CPU. No GPU, no Ollama, no external API keys.
            The entire 200K-record index (292MB of embeddings + metadata) loads into memory on a $12/month DigitalOcean droplet. Caddy handles
            HTTPS with auto-renewing Let's Encrypt certificates. PM2 keeps the process alive.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-3">Agent API</h2>
          <p>
            The free REST API at <code>/api/v1/search</code> is designed for AI agents. It returns dataset names, descriptions, source URLs,
            direct API endpoints, column schemas, and relevance scores in a flat JSON response. An OpenAPI spec at <code>/api/v1/openapi.json</code>
            enables tool discovery for function-calling agents. There's also an MCP server for native integration with Claude Code and Claude Desktop.
          </p>

          <h2 className="text-lg font-bold text-gray-900 mt-8 mb-3">Tech Stack</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Frontend: React + Vite + Tailwind CSS</li>
            <li>Backend: Express (Node.js)</li>
            <li>Embeddings: all-MiniLM-L6-v2 via @xenova/transformers (384-dim, CPU)</li>
            <li>Search: Brute-force cosine similarity + keyword overlap + synonym expansion</li>
            <li>Hosting: DigitalOcean ($12/mo) + Caddy + PM2</li>
            <li>MCP server for Claude integration</li>
          </ul>

          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Built by Peter Overman with Claude Code. Source code on{' '}
              <a href="https://github.com/peter-products/dataset-explorer" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                GitHub
              </a>.
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
