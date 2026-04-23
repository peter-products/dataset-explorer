#!/usr/bin/env node
// Dataset Explorer MCP Server
// Lets Claude Code (and other MCP clients) search 200K+ public datasets as a native tool
// Usage: npx schemafinder-mcp
// Or add to Claude Code settings: { "mcpServers": { "schemafinder": { "command": "node", "args": ["/path/to/mcp-server/index.mjs"] } } }

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.SCHEMA_FINDER_URL || 'https://schemafinder.com';

async function searchDatasets(query, { limit = 10, domain, format, geography, platform } = {}) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (domain) params.set('domain', domain);
  if (format) params.set('format', format);
  if (geography) params.set('geography', geography);
  if (platform) params.set('platform', platform);

  const resp = await fetch(`${API_BASE}/api/v1/search?${params}`);
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

async function getDataset(id) {
  const resp = await fetch(`${API_BASE}/api/dataset/${encodeURIComponent(id)}`);
  if (!resp.ok) throw new Error(`Dataset not found: ${id}`);
  return resp.json();
}

async function submitDataset(body) {
  const resp = await fetch(`${API_BASE}/api/v1/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    const detail = data.issues ? '\n- ' + data.issues.join('\n- ') : '';
    throw new Error(`${data.error || `HTTP ${resp.status}`}${detail}`);
  }
  return data;
}

const server = new McpServer({
  name: 'schemafinder',
  version: '1.0.0',
});

server.tool(
  'search_datasets',
  'Search across 200K+ public dataset schemas from government portals, cloud warehouses, and research platforms. Returns dataset names, descriptions, source URLs, API endpoints, column schemas, and relevance scores.',
  {
    query: z.string().describe('Natural language search query (e.g. "COVID hospitalizations by county", "building permits in Seattle", "salmon habitat data")'),
    limit: z.number().min(1).max(50).default(10).describe('Maximum number of results to return'),
    domain: z.enum(['health', 'education', 'transportation', 'environment', 'finance', 'public_safety', 'elections', 'labor', 'demographics', 'natural_resources', 'technology', 'legal', 'energy', 'agriculture', 'housing']).optional().describe('Filter by domain category'),
    format: z.enum(['api', 'flat_file', 'structured', 'geospatial', 'document']).optional().describe('Filter by data format (api = queryable endpoint, flat_file = CSV/XLSX)'),
    geography: z.enum(['global', 'us_national', 'us_state', 'us_city', 'wa_state', 'wa_city', 'wa_county', 'international', 'varies', 'unknown']).optional().describe('Filter by geographic scope. wa_* values exist for historical WA-focused records.'),
    platform: z.enum(['socrata', 'ckan', 'arcgis', 'bigquery', 'aws', 'huggingface', 'kaggle']).optional().describe('Filter by source platform'),
  },
  async ({ query, limit, domain, format, geography, platform }) => {
    try {
      const data = await searchDatasets(query, { limit, domain, format, geography, platform });

      const text = data.results.map((r, i) => {
        const lines = [
          `${i + 1}. ${r.name}`,
          `   Domain: ${r.domain} | Publisher: ${r.publisher}`,
          `   URL: ${r.url}`,
        ];
        if (r.api_endpoint) lines.push(`   API: ${r.api_endpoint}`);
        if (r.description) lines.push(`   Description: ${r.description}`);
        if (r.columns?.length) lines.push(`   Columns: ${r.columns.join(', ')}`);
        lines.push(`   Format: ${r.format} | Updated: ${r.update_frequency} | Score: ${r.relevance_score}`);
        return lines.join('\n');
      }).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${data.total_matching} matching datasets for "${query}".\n\nTop ${data.count} results:\n\n${text}`,
        }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error searching datasets: ${e.message}` }] };
    }
  }
);

server.tool(
  'get_dataset_schema',
  'Get the full schema (column names, types, descriptions) and metadata for a specific dataset by ID. Use this after search_datasets to get detailed column information.',
  {
    id: z.string().describe('Dataset ID from search results'),
  },
  async ({ id }) => {
    try {
      const d = await getDataset(id);

      const lines = [
        `# ${d.name}`,
        '',
        d.semantic_description || d.description || '',
        '',
        '## Metadata',
        `Publisher: ${d.publisher_normalized || d.provider}`,
        `URL: ${d.url}`,
        d.api_endpoint ? `API Endpoint: ${d.api_endpoint}` : null,
        `Format: ${Array.isArray(d.format) ? d.format.join(', ') : d.format}`,
        `Platform: ${d.source_platform}`,
        `Geographic Scope: ${d.geographic_scope}`,
        d.geographic_detail ? `Geographic Detail: ${d.geographic_detail}` : null,
        `Update Frequency: ${d.update_frequency}`,
        d.row_count ? `Row Count: ${d.row_count}` : null,
        '',
      ].filter(Boolean);

      if (d.columns?.length) {
        lines.push(`## Schema (${d.columns.length} columns)`, '');
        lines.push('| Column | Type | Description |');
        lines.push('|--------|------|-------------|');
        for (const col of d.columns) {
          const name = col.name || col.field_name || '-';
          const type = col.type || '-';
          const desc = col.description || '-';
          lines.push(`| ${name} | ${type} | ${desc} |`);
        }
      } else {
        lines.push('## Schema', '', 'No column schema available for this dataset.');
      }

      if (d.tags?.length) {
        lines.push('', `## Tags`, d.tags.join(', '));
      }

      return { content: [{ type: 'text', text: lines.join('\n') }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Error fetching dataset: ${e.message}` }] };
    }
  }
);

server.tool(
  'submit_dataset',
  `Submit a public dataset to SchemaFinder's community index. Goes live immediately with a "community" badge; users can flag it; the maintainer reviews flags.

IMPORTANT — before calling:
1. Call search_datasets with the dataset's name or URL to check for duplicates. If a match already exists, DO NOT submit; point the user to the existing record.
2. Confirm with the human user before submitting — especially when submitting on someone else's behalf.
3. Provide full column schemas, even for paid/gated datasets. Schema visibility is the point; a submission without columns is worthless.

Rate limit: 5 submissions per 24h per IP. Duplicate URLs are rejected. Unreachable URLs are rejected.`,
  {
    name: z.string().min(1).max(200).describe('Dataset name (as published by the source)'),
    url: z.string().url().describe('Canonical source URL of the dataset landing page'),
    description: z.string().min(50).max(500).describe('What the dataset contains and is useful for (50-500 chars). Write for people searching by natural language.'),
    publisher: z.string().min(1).max(200).describe('Organization that publishes the data (e.g. "US Census Bureau", "City of Seattle")'),
    domain: z.enum(['health', 'education', 'transportation', 'environment', 'finance', 'public_safety', 'elections', 'labor', 'demographics', 'natural_resources', 'technology', 'legal', 'energy', 'agriculture', 'housing']).describe('Primary domain category'),
    format: z.enum(['api', 'flat_file', 'structured', 'geospatial', 'document']).describe('Primary access format (api = queryable endpoint, flat_file = CSV/XLSX download, structured = parquet/database, geospatial = shapefile/GeoJSON, document = PDF/HTML)'),
    access: z.enum(['open', 'gated']).describe('"open" = anyone can access; "gated" = requires signup, login, or payment'),
    access_instructions: z.string().max(1000).optional().describe('REQUIRED when access="gated". How to get access (signup URL, pricing info, API-key instructions). Omit for open datasets.'),
    columns: z.array(z.object({
      name: z.string().min(1),
      type: z.string().min(1).describe('Data type, e.g. string, integer, date, geometry, boolean'),
      description: z.string().optional(),
    })).min(1).max(100).describe('Column schema. At least one column required; max 100.'),
    api_endpoint: z.string().url().optional().describe('Direct API URL for querying data, if available'),
    documentation_url: z.string().url().optional().describe('Link to API docs or dataset documentation'),
    geographic_scope: z.enum(['global', 'us_national', 'us_state', 'us_city', 'international', 'varies', 'unknown']).optional(),
    update_frequency: z.string().optional().describe('e.g. "daily", "weekly", "monthly", "annually", "unknown"'),
    tags: z.array(z.string()).max(50).optional().describe('Keywords users might search (max 50)'),
    price_range: z.enum(['free-tier', 'paid', 'enterprise']).optional().describe('Only meaningful when access="gated"'),
    submitter_name: z.string().max(100).optional().describe('Optional. Shown on the dataset page only if display_attribution=true.'),
    submitter_url: z.string().url().optional().describe('Optional link to submitter\'s profile or site'),
    submitter_contact: z.string().max(200).optional().describe('Optional. Private — used only by the maintainer for follow-up. Not displayed publicly.'),
    display_attribution: z.boolean().default(false).describe('If true, submitter_name and submitter_url are shown on the dataset page.'),
  },
  async (body) => {
    try {
      if (body.access === 'gated' && !body.access_instructions) {
        return { content: [{ type: 'text', text: 'Error: access_instructions is required when access="gated". Tell the user how to get access (signup link, pricing).' }] };
      }
      const result = await submitDataset(body);
      const attrLine = body.display_attribution && body.submitter_name ? `\nAttributed to: ${body.submitter_name}` : '';
      return {
        content: [{
          type: 'text',
          text: `Submitted successfully.\n\nID: ${result.id}\nStatus: ${result.status} (community submission, live in search)\nLink: ${result.dataset_url}${attrLine}\n\nThe submission appears in search results immediately. Users can flag it if it's broken, misleading, or duplicate.`,
        }],
      };
    } catch (e) {
      return { content: [{ type: 'text', text: `Submission failed: ${e.message}\n\nTip: call search_datasets first with the dataset's name to ensure it isn't already in SchemaFinder.` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
