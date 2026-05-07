# OpenSidian

[![README: English](https://img.shields.io/badge/README-English-blue)](https://github.com/thiagovasconcelosti/opensidian/blob/main/README.md)
[![README: PT--BR](https://img.shields.io/badge/README-PT--BR-brightgreen)](https://github.com/thiagovasconcelosti/opensidian/blob/main/README.pt-br.md)
[![README: ES](https://img.shields.io/badge/README-ES-orange)](https://github.com/thiagovasconcelosti/opensidian/blob/main/README.es.md)

[![CI](https://github.com/thiagovasconcelosti/opensidian/actions/workflows/ci.yml/badge.svg)](https://github.com/thiagovasconcelosti/opensidian/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/thiagovasconcelosti/opensidian/blob/main/LICENSE)

**OpenSidian** es un sistema de gestión del conocimiento open-source inspirado en Obsidian. Permite crear, organizar y conectar notas en Markdown con indexación de grafo, sincronización en tiempo real y soporte de plugins.

## Características

- **Vaults**: Gestionar múltiples cofres de notas
- **Editor Markdown**: Vista previa en vivo con soporte para `[[wikilink]]`
- **Grafo de conocimiento**: Visualización interactiva con D3.js
- **Sincronización**: Tiempo real vía WebSocket
- **Autenticación**: Login con JWT y sesión persistente
- **Temas**: Claro, oscuro y temas personalizados con editor visual
- **Plugins**: API de extensiones con hooks y comandos
- **Servidor MCP**: Integración con Model Context Protocol para herramientas de IA
- **API REST**: Endpoints HTTP para integración
- **Docker**: Containerización multi-stage

## Stack

| Capa | Tecnología |
|------|------------|
| Backend | Node.js 20+, TypeScript, Express |
| Frontend | React 18, Vite, React Router |
| Graph | D3.js (force simulation) |
| Markdown | marked, front-matter |
| Sync | WebSocket (ws) |
| MCP | @modelcontextprotocol/sdk |
| Tests | Vitest (79 tests, cobertura >80%) |
| CI/CD | GitHub Actions (Windows/Mac/Linux) |
| Container | Docker multi-stage |

## Inicio rápido

```bash
git clone https://github.com/thiagovasconcelosti/opensidian.git
cd opensidian
npm install
npm run build
npm test
npm run dev
```

Abrir: http://localhost:3000

## Estructura

```
opensidian/
├── src/
│   ├── api/           # REST + Auth + Themes
│   ├── core/          # Vault, Markdown, Graph, Sync
│   ├── mcp/           # Model Context Protocol server
│   └── plugins/       # Plugin host + sample
├── web/               # React frontend
│   └── src/
│       ├── api/       # HTTP client
│       ├── components/ # UI components
│       └── hooks/     # AuthContext, ThemeContext
├── tests/             # 79 tests unitarios
├── docker/            # Dockerfile + compose
└── docs/              # Arquitectura
```

## API REST

### Auth

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Crear cuenta |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Usuario actual |
| POST | `/auth/logout` | Logout |

### Vaults

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/vaults` | Listar vaults |
| POST | `/api/vaults` | Crear vault |
| GET | `/api/vaults/:id` | Abrir vault |

### Notas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/notes?vault=` | Listar notas |
| POST | `/api/notes` | Crear nota |
| GET | `/api/notes/:path?vault=` | Leer nota |
| PUT | `/api/notes/:path?vault=` | Actualizar |
| DELETE | `/api/notes/:path?vault=` | Eliminar |

### Graph

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/graph?vault=` | Grafo completo |
| GET | `/api/graph/neighbors/:path?vault=` | Vecindario |

### Búsqueda

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/notes/search?vault=&q=` | Búsqueda full-text con ranking |
| | `&tag=` | Filtrar por tag |
| | `&after=` / `&before=` | Filtrar por fecha |
| | `&hasBacklinks=true` | Solo notas con backlinks |

### Temas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/themes` | Listar temas |
| POST | `/api/themes` | Guardar tema |
| DELETE | `/api/themes/:name` | Eliminar tema |

## Plugin API

El sistema de plugins permite extender OpenSidian con funcionalidades personalizadas.

### Interface

```typescript
interface Plugin {
  name: string;          // Identificador único
  version: string;       // Semver
  onLoad(ctx: PluginContext): void;
  onUnload?(): void;
}

interface PluginContext {
  registerCommand(cmd: PluginCommand): void;
  registerHook(hook: string, handler: Function): void;
  getVaultManager(): VaultManager;
  getGraphEngine(): GraphEngine;
}
```

### Hooks disponibles

| Hook | Disparo | Uso |
|------|---------|-----|
| `note:pre-save` | Antes de guardar | Modificar contenido |
| `note:post-save` | Después de guardar | Side effects |

### Ejemplo

```typescript
import { Plugin, PluginContext } from '../../shared/types';

export default {
  name: 'mi-plugin',
  version: '1.0.0',
  onLoad(ctx: PluginContext) {
    ctx.registerCommand({
      id: 'mi-plugin:hola',
      label: 'Decir hola',
      execute: () => console.log('¡Hola!'),
    });
    ctx.registerHook('note:post-save', (note) => {
      console.log(`Nota guardada: ${note.path}`);
    });
  },
} satisfies Plugin;
```

Para cargarlo, coloca el archivo en `./plugins/` y reinicia el servidor.

## Servidor MCP (Model Context Protocol)

El servidor MCP permite que herramientas de IA (Claude, etc.) interactúen con OpenSidian vía stdio.

```bash
npx tsx src/mcp/server.ts
```

O vía paquete npm:

```bash
npx opensidian-mcp
```

### Configuración en Claude Desktop

Agrega en `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "opensidian": {
      "command": "npx",
      "args": ["opensidian-mcp"]
    }
  }
}
```

### Herramientas expuestas

- `vault_list`, `vault_open`, `vault_create`
- `note_create`, `note_read`, `note_update`, `note_delete`
- `note_search` — búsqueda con filtros opcionales: `tag`, `after`, `before`, `hasBacklinks`
- `graph_get`, `graph_neighbors`

## Docker

```bash
docker-compose -f docker/docker-compose.yml up -d
```

O build manual:

```bash
docker build -f docker/Dockerfile -t opensidian .
docker run -p 3000:3000 -p 3001:3001 -v ./vaults:/app/vaults opensidian
```

## Tests

```bash
npm test               # 79 tests
npm run test:coverage  # Cobertura >80%
```

## Milestones

### v1.0 (7 fases)

| Fase | Estado |
|------|--------|
| 1. Backend Core | ✅ |
| 2. Sync & API | ✅ |
| 3. Plugin System | ✅ |
| 4. Web UI | ✅ |
| 5. Authentication | ✅ |
| 6. Themes | ✅ |
| 7. Polish & Release | ✅ |

### v2.0 — Búsqueda full-text (3 fases)

| Fase | Estado |
|------|--------|
| 8. Indexador Full-Text (TF-IDF, stopwords, persistencia) | ✅ |
| 9. API de Búsqueda (REST + MCP + filtros + highlighting) | ✅ |
| 10. Frontend de Búsqueda (panel avanzado con filtros visuales) | ✅ |

**79 tests** | **Cobertura >80%** | **Build TypeScript** | **Docker** | **CI/CD**

## Licencia

MIT. Ver [LICENSE](https://github.com/thiagovasconcelosti/opensidian/blob/main/LICENSE).
