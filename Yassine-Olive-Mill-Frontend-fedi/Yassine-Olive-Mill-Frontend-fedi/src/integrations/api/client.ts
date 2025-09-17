// Lightweight HTTP client for the frontend, using fetch and JWT from localStorage

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const BASE_URL: string = (import.meta as any).env?.VITE_BASE_BACKEND_API || '';
const TOKEN_STORAGE_KEY = 'olive_token';

function buildUrl(path: string): string {
  console.log('BASE_URL', BASE_URL);
  if (!BASE_URL) return path;
  return `${BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_STORAGE_KEY, token);
    else localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

async function request<T>(method: HttpMethod, path: string, body?: unknown, init?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(init?.headers || {}),
  };

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...init,
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || res.statusText || 'Request failed';
    const url = buildUrl(path);
    throw new Error(`${message} (status ${res.status}) at ${url}`);
  }

  return (data as T) ?? (undefined as unknown as T);
}

export const api = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('POST', path, body, init),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PUT', path, body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, undefined, init),
  setToken,
  getToken,
};

export type ApiSuccess<T> = T;
export type ApiError = { message?: string; error?: string };


