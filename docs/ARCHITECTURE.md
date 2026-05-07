# OpenSidian Architecture

## Overview

OpenSidian is a modular, extensible knowledge management system built with TypeScript/Node.js. It provides vault management, Markdown parsing, knowledge graph indexing, real-time synchronization, and a plugin architecture.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web UI    │  │   CLI       │  │   MCP Client        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    API Gateway Layer                        │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  │
│  │    REST API (Express)   │  │  WebSocket (Sync)       │  │
│  │    Port 3000            │  │  Port 3001              │  │
│  └─────────────────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Vault   │ │ Markdown  │ │  Graph   │ │   Plugin     │  │
│  │ Manager  │ │  Parser   │ │  Engine  │ │     Host     │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    MCP Server Layer                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         Model Context Protocol Server                 │   │
│  │         (Stdio Transport)                             │   │
│  └─────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Storage Layer                            │
│  ┌─────────────────┐  ┌─────────────────────────────────┐  │
│  │  File System     │  │  In-Memory Graph Index           │  │
│  │  (Vaults)        │  │  (GraphEngine)                   │  │
│  └─────────────────┘  └─────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Vault Manager (`src/core/vault.ts`)

Responsible for vault and note lifecycle management.

**Responsibilities:**
- Create, open, and delete vaults
- Create, read, update, and delete notes
- Search notes by content
- Parse Markdown content for links and frontmatter

**Key Classes:**
- `VaultManager` - Main vault management class

**Public API:**
```typescript
class VaultManager {
  listVaults(): Vault[]
  openVault(vaultPath: string): Vault | null
  createVault(name: string, vaultPath: string): Vault
  createNote(vaultPath: string, filename: string, content: string): Promise<Note>
  readNote(vaultPath: string, notePath: string): Promise<Note | null>
  updateNote(vaultPath: string, notePath: string, content: string): Promise<Note>
  deleteNote(vaultPath: string, notePath: string): Promise<void>
  searchNotes(vaultPath: string, query: string): Promise<Note[]>
}
```

### 2. Markdown Parser (`src/core/markdown.ts`)

Handles Markdown parsing, link extraction, and frontmatter processing.

**Responsibilities:**
- Parse Markdown to HTML using `marked`
- Extract frontmatter using `front-matter`
- Extract wiki links `[[...]]` and Markdown links `[text](url)`
- Extract headings with auto-generated IDs
- Convert notes back to Markdown format

**Key Classes:**
- `MarkdownParser` - Main parsing class

**Public API:**
```typescript
class MarkdownParser {
  parse<T>(content: string): ParsedNote<T>
  extractLinks(content: string): string[]
  extractHeadings(content: string): Heading[]
  slugify(text: string): string
  toMarkdown(note: { frontmatter?: object, body: string }): string
}
```

### 3. Graph Engine (`src/core/graph.ts`)

Maintains the knowledge graph for vault navigation.

**Responsibilities:**
- Index notes and their links
- Track graph nodes (notes) and edges (links)
- Query neighbors and backlinks
- Search by tags
- Compute graph statistics

**Key Classes:**
- `GraphEngine` - Main graph management class

**Public API:**
```typescript
class GraphEngine {
  indexNote(vaultPath: string, note: Note): void
  removeNote(vaultPath: string, notePath: string): void
  getGraph(vaultPath: string): Graph | null
  getNeighbors(vaultPath: string, notePath: string): GraphNode[]
  getBacklinks(vaultPath: string, notePath: string): GraphNode[]
  searchByTag(vaultPath: string, tag: string): GraphNode[]
  computeStats(vaultPath: string): { mostConnected: GraphNode[], orphanNotes: GraphNode[] }
}
```

### 4. Sync Service (`src/core/sync.ts`)

Provides real-time synchronization via WebSockets.

**Responsibilities:**
- Manage WebSocket connections
- Broadcast note changes to subscribed clients
- Handle sync requests and responses

**Key Classes:**
- `SyncService` - WebSocket server with event emitter

**Public API:**
```typescript
class SyncService extends EventEmitter {
  start(): void
  stop(): void
  broadcastChange(message: SyncMessage): void
  subscribeToVault(clientId: string, vaultPath: string): boolean
  unsubscribeFromVault(clientId: string, vaultPath: string): boolean
  getConnectedClients(): number
}
```

### 5. Plugin Host (`src/plugins/host.ts`)

Provides extensibility through a plugin system.

**Responsibilities:**
- Load and unload plugins
- Manage plugin commands and hooks
- Execute hooks on note events

**Key Classes:**
- `PluginHost` - Plugin lifecycle manager

**Public API:**
```typescript
class PluginHost {
  loadPlugin(plugin: Plugin): Promise<void>
  unloadPlugin(name: string): Promise<void>
  registerCommand(command: PluginCommand): void
  registerHook(hook: string, handler: Function): void
  executeHook(hook: string, ...args: unknown[]): Promise<unknown[]>
  getCommand(id: string): PluginCommand | undefined
  listCommands(): PluginCommand[]
  listPlugins(): string[]
}
```

### 6. MCP Server (`src/mcp/server.ts`)

Model Context Protocol server for AI integration.

**Responsibilities:**
- Expose tools for vault and note operations
- Handle MCP protocol requests via stdio
- Integrate with all core services

**Tools Exposed:**
- `vault_list`, `vault_open`, `vault_create`
- `note_create`, `note_read`, `note_update`, `note_delete`, `note_search`
- `graph_get`, `graph_neighbors`

## Data Flow

### Note Creation Flow

```
Client -> REST API / MCP Tool
           |
           v
     VaultManager.createNote()
           |
           +-> MarkdownParser.parse() (extract links, frontmatter)
           |
           v
     Note stored to filesystem
           |
           v
     GraphEngine.indexNote() (update graph)
           |
           v
     SyncService.broadcastChange() (notify clients)
```

### Graph Building Flow

```
Note saved to vault
       |
       v
MarkdownParser.extractLinks() -> wiki links + md links
       |
       v
GraphEngine.indexNote() -> create/update node, create edges
       |
       v
Graph metadata updated (totalNotes, totalLinks)
```

## API Routes

### REST API (`src/api/routes.ts`)

**Vaults:**
- `GET /api/vaults` - List all vaults
- `POST /api/vaults` - Create a vault
- `GET /api/vaults/:id` - Get vault info
- `DELETE /api/vaults/:id` - Delete vault (not implemented)

**Notes:**
- `GET /api/notes?vault=<path>` - List notes in vault
- `POST /api/notes` - Create a note
- `GET /api/notes/:path?vault=<path>` - Get note content
- `PUT /api/notes/:path?vault=<path>` - Update note
- `DELETE /api/notes/:path?vault=<path>` - Delete note

**Graph:**
- `GET /api/graph?vault=<path>` - Get full graph
- `GET /api/graph/neighbors/:path?vault=<path>` - Get note neighbors

## Configuration

Configuration is provided via environment variables or `config.json`:

```typescript
interface Config {
  server: {
    port: number;      // Default: 3000
    host: string;      // Default: '0.0.0.0'
  };
  vaults: {
    defaultPath: string;  // Default: './vaults'
    autoOpen: boolean;   // Default: true
  };
  sync: {
    enabled: boolean;     // Default: true
    port: number;        // Default: 3001
  };
  plugins: {
    enabled: boolean;     // Default: true
    paths: string[];     // Default: ['./plugins']
  };
}
```

## Error Handling

All layers use consistent error handling:

1. **MCP Server**: Returns error messages in `isError: true` response
2. **REST API**: Returns appropriate HTTP status codes with JSON error body
3. **Core Services**: Throw typed errors with descriptive messages

## Extension Points

### Plugin Hooks

Available hooks for plugins:

- `note:pre-save` - Before note is saved (can modify note)
- `note:post-save` - After note is saved (side effects)
- `vault:pre-create` - Before vault is created
- `vault:post-create` - After vault is created
- `graph:pre-index` - Before note is indexed in graph
- `graph:post-index` - After note is indexed

### Plugin Commands

Plugins can register commands that can be triggered via API or UI.

## Testing Strategy

Tests are located in `tests/` directory:

- `tests/core/vault.test.ts` - VaultManager tests
- `tests/core/markdown.test.ts` - MarkdownParser tests
- `tests/core/graph.test.ts` - GraphEngine tests
- `tests/core/sync.test.ts` - SyncService tests
- `tests/plugins/host.test.ts` - PluginHost tests

Coverage threshold: >80% for statements, branches, functions, and lines.

## Docker Deployment

The application can be deployed via Docker:

- **Dockerfile**: Multi-stage build (builder + runner)
- **docker-compose.yml**: Full stack with MCP server

Volumes:
- `./vaults` - Persist vault data
- `./data` - Application data

Ports:
- 3000: REST API
- 3001: WebSocket sync
- 3002: MCP server (in docker-compose)
