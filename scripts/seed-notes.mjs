const BASE = 'http://localhost:3000/api';

async function createNote(filename, content) {
  const res = await fetch(`${BASE}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vaultPath: 'local', filename, content }),
  });
  const data = await res.json();
  console.log(`✅ ${filename}:`, data.note?.path || data);
}

async function main() {
  await createNote('typescript-dicas', `# Dicas de TypeScript

## Tipos úteis
- \`Partial<T>\` - deixa todas propriedades opcionais
- \`Pick<T, K>\` - pega só algumas propriedades
- \`Omit<T, K>\` - remove propriedades

tags: typescript, programação`);

  await createNote('react-hooks', `# React Hooks Essenciais

## useState
Estado local em componentes funcionais.

## useEffect
Efeitos colaterais (API, timers, subscriptions).

## useCallback
Memoriza funções para evitar re-renders.

tags: react, frontend`);

  await createNote('aprendendo-python', `# Aprendendo Python

Python é ótimo para começar a programar.

## Vantagens
- Sintaxe limpa e legível
- Ótimo para automação e scripts
- Comunidade gigante

tags: python, iniciante`);

  await createNote('arquitetura-limpa', `# Arquitetura Limpa

Princípios para organizar código de forma sustentável.

## Camadas
1. **Entidades** - regras de negócio
2. **Casos de uso** - orquestração
3. **Adaptadores** - ponte entre camadas
4. **Frameworks** - detalhes externos

tags: arquitetura, boas-praticas`);
}

main().catch(console.error);
