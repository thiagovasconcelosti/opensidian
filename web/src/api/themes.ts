import { authHeaders } from './auth';

const BASE = '/api';

export interface CustomTheme {
  name: string;
  variables: Record<string, string>;
}

export const themesApi = {
  list: () =>
    fetch(`${BASE}/themes`, { headers: { ...authHeaders() } })
      .then(res => res.json() as Promise<{ themes: CustomTheme[] }>),

  save: (theme: CustomTheme) =>
    fetch(`${BASE}/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(theme),
    }).then(res => {
      if (!res.ok) throw new Error('Falha ao salvar tema');
      return res.json() as Promise<{ theme: CustomTheme }>;
    }),

  delete: (name: string) =>
    fetch(`${BASE}/themes/${encodeURIComponent(name)}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    }),
};

export const BUILT_IN_THEMES: CustomTheme[] = [
  {
    name: 'Claro',
    variables: {
      '--bg': '#ffffff',
      '--bg-secondary': '#f5f5f5',
      '--bg-tertiary': '#ebebeb',
      '--text': '#1a1a1a',
      '--text-secondary': '#666',
      '--border': '#ddd',
      '--accent': '#6c31e0',
      '--accent-hover': '#5a28c0',
      '--danger': '#e03e3e',
      '--success': '#2e7d32',
    },
  },
  {
    name: 'Escuro',
    variables: {
      '--bg': '#1a1a2e',
      '--bg-secondary': '#16213e',
      '--bg-tertiary': '#0f3460',
      '--text': '#e0e0e0',
      '--text-secondary': '#999',
      '--border': '#333',
      '--accent': '#7c4dff',
      '--accent-hover': '#651fff',
      '--danger': '#cf6679',
      '--success': '#4caf50',
    },
  },
];

export const DEFAULT_VARIABLES = BUILT_IN_THEMES[0].variables;

export const THEME_VARIABLE_LABELS: Record<string, string> = {
  '--bg': 'Fundo principal',
  '--bg-secondary': 'Fundo secundário',
  '--bg-tertiary': 'Fundo terciário',
  '--text': 'Texto principal',
  '--text-secondary': 'Texto secundário',
  '--border': 'Borda',
  '--accent': 'Cor destaque',
  '--accent-hover': 'Destaque hover',
  '--danger': 'Erro/perigo',
  '--success': 'Sucesso',
};
