const BASE = (window as any).electronAPI?.apiBase || '/api';
const API = BASE.endsWith('/api') ? BASE : `${BASE}/api`;

export async function request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    ...init,
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'request failed');
  return json.data as T;
}

export const http = {
  get: <T = any>(p: string) => request<T>(p),
  post: <T = any>(p: string, body?: any) => request<T>(p, { method: 'POST', body: JSON.stringify(body || {}) }),
  put: <T = any>(p: string, body?: any) => request<T>(p, { method: 'PUT', body: JSON.stringify(body || {}) }),
  del: <T = any>(p: string) => request<T>(p, { method: 'DELETE' }),
};
