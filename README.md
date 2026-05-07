# OpenSidian

**OpenSidian** é um sistema de gerenciamento de conhecimento open-source inspirado no Obsidian. Permite criar, organizar e interconectar notas em Markdown com indexação de grafo, sincronização em tempo real e suporte a plugins.

[![CI](https://github.com/thiagovasconcelosti/opensidian/actions/workflows/ci.yml/badge.svg)](https://github.com/thiagovasconcelosti/opensidian/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Funcionalidades

- **Vaults**: Gerenciar múltiplos cofres de notas
- **Editor Markdown**: Preview ao vivo com suporte a `[[wikilink]]`
- **Grafo de Conhecimento**: Visualização interativa com D3.js
- **Sincronização**: Tempo real via WebSocket
- **Autenticação**: Login com JWT e sessão persistente
- **Temas**: Claro, escuro e temas customizáveis via editor visual
- **Plugins**: API para extensões com hooks e comandos
- **MCP Server**: Integração com IAs via Model Context Protocol
- **REST API**: HTTP endpoints para integração
- **Docker**: Containerização multi-stage

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Backend | Node.js 20+, TypeScript, Express |
| Frontend | React 18, Vite, React Router |
| Graph | D3.js (force simulation) |
| Markdown | marked, front-matter |
| Sync | WebSocket (ws) |
| MCP | @modelcontextprotocol/sdk |
| Testes | Vitest (67 testes, cobertura >80%) |
| CI/CD | GitHub Actions (Windows/Mac/Linux) |
| Container | Docker multi-stage |

## Começar

```bash
git clone https://github.com/thiagovasconcelosti/opensidian.git
cd opensidian
npm install
npm run build
npm test
npm run dev
```

Acessar: http://localhost:3000

## Estrutura

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
├── tests/             # 79 testes unitários
├── docker/            # Dockerfile + compose
└── docs/              # Arquitetura
```

## API REST

### Auth

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Criar conta |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Dados do usuário |
| POST | `/auth/logout` | Logout |

### Vaults

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/vaults` | Listar vaults |
| POST | `/api/vaults` | Criar vault |
| GET | `/api/vaults/:id` | Abrir vault |

### Notas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notes?vault=` | Listar notas |
| POST | `/api/notes` | Criar nota |
| GET | `/api/notes/:path?vault=` | Ler nota |
| PUT | `/api/notes/:path?vault=` | Atualizar |
| DELETE | `/api/notes/:path?vault=` | Deletar |

### Graph

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/graph?vault=` | Grafo completo |
| GET | `/api/graph/neighbors/:path?vault=` | Vizinhança |

### Busca

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/notes/search?vault=&q=` | Busca full-text com ranking |
| | `&tag=` | Filtrar por tag |
| | `&after=` / `&before=` | Filtrar por data |
| | `&hasBacklinks=true` | Só notas com backlinks |

### Temas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/themes` | Listar temas |
| POST | `/api/themes` | Salvar tema |
| DELETE | `/api/themes/:name` | Deletar tema |

## Plugin API

O sistema de plugins permite estender o OpenSidian com funcionalidades customizadas.

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

### Hooks disponíveis

| Hook | Disparo | Uso |
|------|---------|-----|
| `note:pre-save` | Antes de salvar | Modificar conteúdo |
| `note:post-save` | Após salvar | Side effects |

### Exemplo

```typescript
import { Plugin, PluginContext } from '../../shared/types';

export default {
  name: 'meu-plugin',
  version: '1.0.0',
  onLoad(ctx: PluginContext) {
    ctx.registerCommand({
      id: 'meu-plugin:hello',
      label: 'Dizer olá',
      execute: () => console.log('Olá!'),
    });
    ctx.registerHook('note:post-save', (note) => {
      console.log(`Nota salva: ${note.path}`);
    });
  },
} satisfies Plugin;
```

Para carregar, coloque o arquivo em `./plugins/` e reinicie o servidor.

## MCP Server (Model Context Protocol)

O servidor MCP permite que IAs (Claude, etc.) interajam com o OpenSidian via stdio.

```bash
npx tsx src/mcp/server.ts
```

Ou via pacote npm (já publicado):

```bash
npx opensidian-mcp
```

### Configuração no Claude Desktop

Adicione no `claude_desktop_config.json`:

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

### Ferramentas expostas

- `vault_list`, `vault_open`, `vault_create`
- `note_create`, `note_read`, `note_update`, `note_delete`
- `note_search` — busca com filtros opcionais: `tag`, `after`, `before`, `hasBacklinks`
- `graph_get`, `graph_neighbors`

## Docker

```bash
docker-compose -f docker/docker-compose.yml up -d
```

Ou build manual:

```bash
docker build -f docker/Dockerfile -t opensidian .
docker run -p 3000:3000 -p 3001:3001 -v ./vaults:/app/vaults opensidian
```

## Testes

```bash
npm test               # 79 testes
npm run test:coverage  # Cobertura >80%
```

## Milestones

### v1.0 (7 fases)

| Fase | Status |
|------|--------|
| 1. Backend Core | ✅ |
| 2. Sync & API | ✅ |
| 3. Plugin System | ✅ |
| 4. Web UI | ✅ |
| 5. Authentication | ✅ |
| 6. Themes | ✅ |
| 7. Polish & Release | ✅ |

### v2.0 — Busca Full-Text (3 fases)

| Fase | Status |
|------|--------|
| 8. Indexador Full-Text (TF-IDF, stopwords, persistência) | ✅ |
| 9. API de Busca (REST + MCP + filtros + highlighting) | ✅ |
| 10. Frontend de Busca (painel avançado com filtros visuais) | ✅ |

**79 testes** | **Cobertura >80%** | **Build TypeScript** | **Docker** | **CI/CD**

## Licença

MIT. Veja [LICENSE](LICENSE).
