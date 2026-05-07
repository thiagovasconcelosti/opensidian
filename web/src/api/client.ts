const BASE = '/api';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('opensidian_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export interface Vault {
  path: string;
  name: string;
  created: string;
  notes: Note[];
}

export interface Note {
  path: string;
  filename: string;
  content: string;
  frontmatter: Record<string, unknown>;
  links: string[];
  created: string;
  modified: string;
}

export interface GraphNode {
  id: string;
  label: string;
  tags?: string[];
  connections?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SearchResultItem {
  path: string;
  filename: string;
  snippet: string;
  score: number;
  tags: string[];
  modified: string;
  backlinks: number;
}

export const api = {
  vaults: {
    list: () => request<{ vaults: Vault[] }>('/vaults'),
    create: (name: string, path: string) =>
      request<{ vault: Vault }>('/vaults', {
        method: 'POST',
        body: JSON.stringify({ name, path }),
      }),
  },
  notes: {
    list: (vaultPath: string) =>
      request<{ notes: Note[] }>(`/notes?vault=${encodeURIComponent(vaultPath)}`),
    get: (vaultPath: string, path: string) =>
      request<{ note: Note }>(
        `/notes/${encodeURIComponent(path)}?vault=${encodeURIComponent(vaultPath)}`
      ),
    create: (vaultPath: string, filename: string, content: string) =>
      request<{ note: Note }>('/notes', {
        method: 'POST',
        body: JSON.stringify({ vaultPath, filename, content }),
      }),
    update: (vaultPath: string, path: string, content: string) =>
      request<{ note: Note }>(
        `/notes/${encodeURIComponent(path)}?vault=${encodeURIComponent(vaultPath)}`,
        { method: 'PUT', body: JSON.stringify({ content }) }
      ),
    delete: (vaultPath: string, path: string) =>
      request<void>(
        `/notes/${encodeURIComponent(path)}?vault=${encodeURIComponent(vaultPath)}`,
        { method: 'DELETE' }
      ),
  },
  graph: {
    get: (vaultPath: string) =>
      request<{ graph: Graph }>(`/graph?vault=${encodeURIComponent(vaultPath)}`),
    neighbors: (vaultPath: string, path: string) =>
      request<{ neighbors: GraphNode[] }>(
        `/graph/neighbors/${encodeURIComponent(path)}?vault=${encodeURIComponent(vaultPath)}`
      ),
  },
  search: {
    fullText: (vaultPath: string, q: string, filters?: { tag?: string; after?: string; before?: string; hasBacklinks?: boolean }) => {
      let url = `/notes/search?vault=${encodeURIComponent(vaultPath)}&q=${encodeURIComponent(q)}`;
      if (filters?.tag) url += `&tag=${encodeURIComponent(filters.tag)}`;
      if (filters?.after) url += `&after=${encodeURIComponent(filters.after)}`;
      if (filters?.before) url += `&before=${encodeURIComponent(filters.before)}`;
      if (filters?.hasBacklinks !== undefined) url += `&hasBacklinks=${filters.hasBacklinks}`;
      return request<{ results: SearchResultItem[] }>(url);
    },
  },
};
