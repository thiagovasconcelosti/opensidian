const AUTH_BASE = '/auth';

function authRequest<T>(url: string, options?: RequestInit): Promise<T> {
  return fetch(`${AUTH_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  }).then(async res => {
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    return body;
  });
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export function getToken(): string | null {
  return localStorage.getItem('opensidian_token');
}

export function setToken(token: string): void {
  localStorage.setItem('opensidian_token', token);
}

export function removeToken(): void {
  localStorage.removeItem('opensidian_token');
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    authRequest<AuthResponse>('/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    authRequest<AuthResponse>('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () =>
    authRequest<{ user: AuthUser & { createdAt: string } }>('/me', {
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    }),

  logout: () =>
    authRequest<{ message: string }>('/logout', {
      method: 'POST',
      headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    }),
};
