import { KV, SaveMeta } from './accounts';
import { Data } from './types';

/**
 * Ligação com o site do AgroGestor (mesmo banco de dados da versão web).
 * A conta é a do site; os saves ficam no servidor e também no aparelho, para
 * o app funcionar sem internet. Quem gravou por último vence.
 */

export interface CloudUser {
  id: string;
  code?: string;
  username: string;
  name: string;
}

export interface CloudSession {
  url: string;
  token: string;
  user: CloudUser;
}

export interface RemoteMeta extends Omit<SaveMeta, 'userId' | 'mode'> {
  mode: string;
  deleted: boolean;
}

const KEY = 'agrogestor:nuvem';
const URL_KEY = 'agrogestor:nuvem:endereco';

/** Erro de rede (sem internet / servidor fora): o app segue offline. */
export class OfflineError extends Error {}
/** Erro com resposta do servidor (senha errada, sessão vencida etc.). */
export class CloudError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Site oficial; pode ser trocado por EXPO_PUBLIC_API_URL ou na tela de entrada. */
export const DEFAULT_URL = 'https://agrogestor-gules.vercel.app';

const clean =(u: string) => u.trim().replace(/\/+$/, '').replace(/\/gestao$/, '');

/** No site (/gestao) a API está no mesmo endereço; no celular vem da configuração. */
export function sameOriginUrl(): string | null {
  const loc = typeof window !== 'undefined' ? (window as { location?: Location }).location : undefined;
  if (!loc || typeof loc.origin !== 'string') return null;
  const { origin, protocol } = loc;
  return protocol.startsWith('http') && !/localhost:8081|localhost:19006/.test(origin) ? origin : null;
}

export async function getServerUrl(kv: KV): Promise<string> {
  const saved = await kv.getItem(URL_KEY).catch(() => null);
  return clean(saved || sameOriginUrl() || process.env.EXPO_PUBLIC_API_URL || DEFAULT_URL);
}
export const setServerUrl = (kv: KV, url: string) => kv.setItem(URL_KEY, clean(url));

export async function getCloud(kv: KV): Promise<CloudSession | null> {
  try {
    const raw = await kv.getItem(KEY);
    return raw ? (JSON.parse(raw) as CloudSession) : null;
  } catch {
    return null;
  }
}
export const setCloud = (kv: KV, s: CloudSession | null) => (s ? kv.setItem(KEY, JSON.stringify(s)) : kv.removeItem(KEY));

async function call<T>(url: string, path: string, opts: { method?: string; body?: unknown; token?: string; cookie?: boolean } = {}): Promise<T> {
  if (!url) throw new OfflineError('Endereço do site não configurado.');
  let res: Response;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20_000);
    res = await fetch(url + path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: { ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: opts.cookie ? 'include' : 'omit',
      signal: ctrl.signal,
    });
    clearTimeout(t);
  } catch {
    throw new OfflineError('Sem conexão com o site.');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new CloudError(res.status, data.error || 'O site não respondeu como esperado.');
  return data;
}

export async function cloudLogin(url: string, username: string, password: string): Promise<CloudSession> {
  const r = await call<{ token: string; user: CloudUser }>(url, '/api/auth/login', { body: { username, password } });
  return { url, token: r.token, user: r.user };
}

export async function cloudRegister(url: string, input: { name: string; username: string; password: string }): Promise<CloudSession> {
  const r = await call<{ token: string; user: CloudUser }>(url, '/api/auth/register', { body: input });
  return { url, token: r.token, user: r.user };
}

/** No site: aproveita a sessão de quem já entrou (cookie) para abrir a gestão direto. */
export async function cloudFromCookie(): Promise<CloudSession | null> {
  const url = sameOriginUrl();
  if (!url) return null;
  try {
    const r = await call<{ token: string; user: CloudUser }>(url, '/api/auth/token', { cookie: true });
    return { url, token: r.token, user: r.user };
  } catch {
    return null;
  }
}

export const changeCloudPassword = (s: CloudSession, password: string, newPassword: string) =>
  call(s.url, '/api/me', { method: 'PATCH', token: s.token, body: { password, newPassword } });

export const listRemote = (s: CloudSession) => call<{ saves: RemoteMeta[] }>(s.url, '/api/saves', { token: s.token }).then((r) => r.saves);
export const getRemote = (s: CloudSession, id: string) => call<{ data: Data | null; deleted: boolean; updatedAt: string }>(s.url, `/api/saves/${id}`, { token: s.token });
export const putRemote = (s: CloudSession, meta: SaveMeta, data: Data) =>
  call<{ ok: boolean; stale: boolean }>(s.url, `/api/saves/${meta.id}`, { method: 'PUT', token: s.token, body: { meta, data } });
export const deleteRemote = (s: CloudSession, id: string) => call(s.url, `/api/saves/${id}`, { method: 'DELETE', token: s.token });
