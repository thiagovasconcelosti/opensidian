# Contributing to OpenSidian

Thank you for your interest in contributing to OpenSidian!

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/opensidian.git
   cd opensidian
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run tests**
   ```bash
   npm test
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
opensidian/
├── src/
│   ├── index.ts           # Application entry point
│   ├── server.ts           # Express server setup
│   ├── api/
│   │   └── routes.ts       # REST API routes
│   ├── core/
│   │   ├── vault.ts        # Vault management
│   │   ├── markdown.ts     # Markdown parsing
│   │   ├── graph.ts        # Knowledge graph
│   │   └── sync.ts         # Real-time sync
│   ├── mcp/
│   │   └── server.ts       # MCP server
│   ├── plugins/
│   │   ├── host.ts         # Plugin system
│   │   └── sample-plugin.ts
│   └── shared/
│       └── types.ts        # TypeScript types
├── tests/                  # Test files
├── docker/                  # Docker configuration
└── docs/                   # Documentation
```

## Coding Standards

### TypeScript

- Use strict mode in `tsconfig.json`
- Prefer interfaces over type aliases for object shapes
- Use explicit return types for public functions
- Avoid `any` type

### Code Style

- 2 spaces for indentation
- Single quotes for strings
- Trailing commas in multiline
- Semicolons at end of statements

### Naming Conventions

- **Classes**: PascalCase (e.g., `VaultManager`)
- **Functions/Methods**: camelCase (e.g., `createNote`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `DEFAULT_PORT`)
- **Files**: kebab-case (e.g., `vault-manager.ts`)

## Testing

### Writing Tests

- Place test files in `tests/` directory
- Name test files matching source: `vault.test.ts` for `vault.ts`
- Use descriptive test names: `should create note with frontmatter`
- Mock external dependencies

### Test Coverage

Maintain coverage above 80%:
- Statements
- Branches
- Functions
- Lines

Run coverage report:
```bash
npm run test:coverage
```

## Git Workflow

### Branch Naming

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `bugfix/*` - Bug fixes
- `hotfix/*` - Urgent production fixes

### Commit Messages

Follow conventional commits:

```
feat: add note search functionality
fix: resolve vault creation error
docs: update API documentation
test: add graph engine tests
refactor: improve link extraction
```

### Pull Requests

1. Create feature branch from `develop`
2. Make your changes
3. Add tests
4. Ensure all tests pass
5. Submit PR with description

## API Development

### REST API

Add new routes in `src/api/routes.ts`:

```typescript
router.get('/resource', (req, res) => {
  // Handle request
  res.json({ data });
});
```

### MCP Tools

Add new tools in `src/mcp/server.ts`:

```typescript
{
  name: 'tool_name',
  description: 'What the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      param: { type: 'string', description: 'Description' }
    },
    required: ['param']
  }
}
```

## Plugin Development

### Creating a Plugin

```typescript
import { Plugin, PluginContext } from '@opensidian/plugin-api';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  async onLoad(context: PluginContext) {
    context.registerCommand({
      id: 'my-plugin:command',
      label: 'My Command',
      execute: () => console.log('Hello!')
    });

    context.registerHook('note:post-save', (note) => {
      console.log('Note saved:', note.path);
    });
  }
};

export default myPlugin;
```

### Plugin Hooks

- `note:pre-save(note)` - Modify note before saving
- `note:post-save(note)` - Side effects after saving
- `vault:pre-create(vault)` - Before vault creation
- `vault:post-create(vault)` - After vault creation

## Documentation

- Update README.md for user-facing changes
- Update ARCHITECTURE.md for architectural changes
- Add JSDoc comments for public APIs
- Update type definitions in `types.ts`

## Issues

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment (OS, Node.js version)

### Feature Requests

Include:
- Problem statement
- Proposed solution
- Use cases
- Alternatives considered

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
