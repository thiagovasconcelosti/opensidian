import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { VaultManager } from '../core/vault.js';
import { GraphEngine } from '../core/graph.js';
import { SyncService } from '../core/sync.js';
import { z } from 'zod';

const vaultManager = new VaultManager();
const graphEngine = new GraphEngine();
const syncService = new SyncService();

const tools: Tool[] = [
  {
    name: 'vault_list',
    description: 'List all available vaults',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'vault_open',
    description: 'Open a specific vault',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the vault' },
      },
      required: ['path'],
    },
  },
  {
    name: 'vault_create',
    description: 'Create a new vault',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the vault' },
        path: { type: 'string', description: 'Path where to create the vault' },
      },
      required: ['name', 'path'],
    },
  },
  {
    name: 'note_create',
    description: 'Create a new note',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Path to the vault' },
        filename: { type: 'string', description: 'Note filename (without .md)' },
        content: { type: 'string', description: 'Note content in markdown' },
      },
      required: ['vaultPath', 'filename', 'content'],
    },
  },
  {
    name: 'note_read',
    description: 'Read a note',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Path to the vault' },
        path: { type: 'string', description: 'Path to the note relative to vault' },
      },
      required: ['vaultPath', 'path'],
    },
  },
  {
    name: 'note_update',
    description: 'Update a note',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Path to the vault' },
        path: { type: 'string', description: 'Path to the note relative to vault' },
        content: { type: 'string', description: 'New content in markdown' },
      },
      required: ['vaultPath', 'path', 'content'],
    },
  },
  {
    name: 'note_delete',
    description: 'Delete a note',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Path to the vault' },
        path: { type: 'string', description: 'Path to the note relative to vault' },
      },
      required: ['vaultPath', 'path'],
    },
  },
  {
    name: 'note_search',
    description: 'Full-text search notes with ranking, highlighting, and optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Path to the vault' },
        query: { type: 'string', description: 'Search query' },
        tag: { type: 'string', description: 'Filter by tag (e.g. "javascript")' },
        after: { type: 'string', description: 'Filter by date after (ISO string, e.g. "2026-01-01")' },
        before: { type: 'string', description: 'Filter by date before (ISO string)' },
        hasBacklinks: { type: 'boolean', description: 'Filter by presence of backlinks' },
      },
      required: ['vaultPath', 'query'],
    },
  },
  {
    name: 'graph_get',
    description: 'Get knowledge graph data',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Path to the vault' },
      },
      required: ['vaultPath'],
    },
  },
  {
    name: 'graph_neighbors',
    description: 'Get linked notes for a specific note',
    inputSchema: {
      type: 'object',
      properties: {
        vaultPath: { type: 'string', description: 'Path to the vault' },
        path: { type: 'string', description: 'Path to the note' },
      },
      required: ['vaultPath', 'path'],
    },
  },
];

const server = new Server(
  { name: 'opensidian-mcp', version: '0.1.0' },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

export async function handleToolCall(name: string, args: unknown) {
  try {
    switch (name) {
      case 'vault_list': {
        const vaults = vaultManager.listVaults();
        return {
          content: [{ type: 'text', text: JSON.stringify(vaults, null, 2) }],
        };
      }

      case 'vault_open': {
        const schema = z.object({ path: z.string() });
        const { path } = schema.parse(args);
        const vault = vaultManager.openVault(path);
        return {
          content: [{ type: 'text', text: JSON.stringify(vault, null, 2) }],
        };
      }

      case 'vault_create': {
        const schema = z.object({ name: z.string(), path: z.string() });
        const { name, path } = schema.parse(args);
        const vault = vaultManager.createVault(name, path);
        return {
          content: [{ type: 'text', text: JSON.stringify(vault, null, 2) }],
        };
      }

      case 'note_create': {
        const schema = z.object({
          vaultPath: z.string(),
          filename: z.string(),
          content: z.string(),
        });
        const { vaultPath, filename, content } = schema.parse(args);
        const note = await vaultManager.createNote(vaultPath, filename, content);
        graphEngine.indexNote(vaultPath, note);
        syncService.broadcastChange({ type: 'note_created', note });
        return {
          content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
        };
      }

      case 'note_read': {
        const schema = z.object({ vaultPath: z.string(), path: z.string() });
        const { vaultPath, path } = schema.parse(args);
        const note = await vaultManager.readNote(vaultPath, path);
        return {
          content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
        };
      }

      case 'note_update': {
        const schema = z.object({
          vaultPath: z.string(),
          path: z.string(),
          content: z.string(),
        });
        const { vaultPath, path, content } = schema.parse(args);
        const note = await vaultManager.updateNote(vaultPath, path, content);
        graphEngine.indexNote(vaultPath, note);
        syncService.broadcastChange({ type: 'note_updated', note });
        return {
          content: [{ type: 'text', text: JSON.stringify(note, null, 2) }],
        };
      }

      case 'note_delete': {
        const schema = z.object({ vaultPath: z.string(), path: z.string() });
        const { vaultPath, path } = schema.parse(args);
        await vaultManager.deleteNote(vaultPath, path);
        graphEngine.removeNote(vaultPath, path);
        syncService.broadcastChange({ type: 'note_deleted', note: { path } });
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true }, null, 2) }],
        };
      }

      case 'note_search': {
        const schema = z.object({
          vaultPath: z.string(),
          query: z.string(),
          tag: z.string().optional(),
          after: z.string().optional(),
          before: z.string().optional(),
          hasBacklinks: z.boolean().optional(),
        });
        const { vaultPath, query, tag, after, before, hasBacklinks } = schema.parse(args);
        const results = await vaultManager.fullTextSearch(vaultPath, query, { tag, after, before, hasBacklinks });
        return {
          content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
        };
      }

      case 'graph_get': {
        const schema = z.object({ vaultPath: z.string() });
        const { vaultPath } = schema.parse(args);
        const graph = graphEngine.getGraph(vaultPath);
        return {
          content: [{ type: 'text', text: JSON.stringify(graph, null, 2) }],
        };
      }

      case 'graph_neighbors': {
        const schema = z.object({ vaultPath: z.string(), path: z.string() });
        const { vaultPath, path } = schema.parse(args);
        const neighbors = graphEngine.getNeighbors(vaultPath, path);
        return {
          content: [{ type: 'text', text: JSON.stringify(neighbors, null, 2) }],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: error instanceof Error ? error.message : String(error),
        },
      ],
      isError: true,
    };
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, args);
});

export async function startServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OpenSidian MCP Server running on stdio');
}

export { tools };

