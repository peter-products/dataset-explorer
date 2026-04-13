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
    geography: z.enum(['global', 'us_national', 'wa_state', 'wa_city', 'wa_county']).optional().describe('Filter by geographic scope'),
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

const transport = new StdioServerTransport();
await server.connect(transport);
