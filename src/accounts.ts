import { emptyData } from './data/demo';
import { hashPassword, randomSalt } from './sha256';
import { Data } from './types';

/**
 * Contas e saves locais. Tudo fica no próprio aparelho (AsyncStorage no
 * celular, localStorage/IndexedDB no Windows e no navegador). Não há servidor:
 * cada conta é uma trava local, e cada save é uma fazenda separada.
 *
 * O módulo recebe o armazenamento por parâmetro para poder ser testado em Node.
 */

export interface KV {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface User {
  id: string;
  name: string;
  username: string;
  salt: string;
  hash: string;
  createdAt: string;
}

export type PublicUser = Pick<User, 'id' | 'name' | 'username' | 'createdAt'>;

export type StartMode = 'novo' | 'gerente' | 'zero' | 'exemplo' | 'importado';

export interface SaveMeta {
  id: string;
  userId: string;
  name: string;
  farmName: string;
  map: string;
  mapName: string;
  mode: StartMode;
  createdAt: string;
  updatedAt: string;
}

export const KEYS = {
  users: 'agrogestor:usuarios',
  session: 'agrogestor:sessao:v2',
  saves: (userId: string) => `agrogestor:saves:${userId}`,
  save: (saveId: string) => `agrogestor:save:${saveId}`,
  lastSave: (userId: string) => `agrogestor:ultimo-save:${userId}`,
  legacy: 'agrogestor:v1',
  legacyDone: 'agrogestor:v1:migrado',
};

const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
export const normUser = (u: string) => u.trim().toLowerCase();
const pub = (u: User): PublicUser => ({ id: u.id, name: u.name, username: u.username, createdAt: u.createdAt });

async function readJson<T>(kv: KV, key: string, fallback: T): Promise<T> {
  try {
    const raw = await kv.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ---------- Contas ---------- */

export async function listUsers(kv: KV): Promise<User[]> {
  return readJson<User[]>(kv, KEYS.users, []);
}

export function validateRegistration(input: { name: string; username: string; password: string; confirm: string }): string | null {
  if (input.name.trim().length < 2) return 'Informe o seu nome.';
  const u = normUser(input.username);
  if (u.length < 3) return 'O usuário precisa ter pelo menos 3 letras.';
  if (!/^[a-z0-9._-]+$/.test(u)) return 'Use no usuário só letras sem acento, números, ponto, hífen ou sublinhado.';
  if (input.password.length < 6) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (input.password !== input.confirm) return 'As senhas não conferem.';
  return null;
}

export async function register(kv: KV, input: { name: string; username: string; password: string; confirm: string }): Promise<PublicUser> {
  const problem = validateRegistration(input);
  if (problem) throw new Error(problem);
  const users = await listUsers(kv);
  const username = normUser(input.username);
  if (users.some((u) => u.username === username)) throw new Error('Este usuário já existe neste aparelho. Escolha outro ou entre com ele.');
  const salt = randomSalt();
  const user: User = { id: newId(), name: input.name.trim(), username, salt, hash: hashPassword(input.password, salt), createdAt: nowIso() };
  await kv.setItem(KEYS.users, JSON.stringify([...users, user]));
  return pub(user);
}

export async function authenticate(kv: KV, username: string, password: string): Promise<PublicUser> {
  const users = await listUsers(kv);
  const user = users.find((u) => u.username === normUser(username));
  if (!user || hashPassword(password, user.salt) !== user.hash) throw new Error('Usuário ou senha incorretos. Confira e tente de novo.');
  return pub(user);
}

export async function changePassword(kv: KV, userId: string, current: string, next: string): Promise<void> {
  const users = await listUsers(kv);
  const user = users.find((u) => u.id === userId);
  if (!user || hashPassword(current, user.salt) !== user.hash) throw new Error('A senha atual não confere.');
  if (next.length < 6) throw new Error('A nova senha precisa ter pelo menos 6 caracteres.');
  const salt = randomSalt();
  const updated = users.map((u) => (u.id === userId ? { ...u, salt, hash: hashPassword(next, salt) } : u));
  await kv.setItem(KEYS.users, JSON.stringify(updated));
}

export async function getUser(kv: KV, userId: string): Promise<PublicUser | null> {
  const u = (await listUsers(kv)).find((x) => x.id === userId);
  return u ? pub(u) : null;
}

/** Sessão lembrada (usuário que marcou "manter conectado"). */
export async function getSession(kv: KV): Promise<string | null> {
  return kv.getItem(KEYS.session).catch(() => null);
}
export const setSession = (kv: KV, userId: string | null) => (userId ? kv.setItem(KEYS.session, userId) : kv.removeItem(KEYS.session));

/* ---------- Saves ---------- */

export async function listSaves(kv: KV, userId: string): Promise<SaveMeta[]> {
  const list = await readJson<SaveMeta[]>(kv, KEYS.saves(userId), []);
  return list.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Completa dados antigos com os campos novos, para nunca quebrar ao abrir. */
export function normalizeData(raw: Partial<Data> | null | undefined): Data {
  const base = emptyData();
  const d = raw ?? {};
  return { ...base, ...d, guideRead: d.guideRead ?? [], readAlerts: d.readAlerts ?? [], settings: { ...base.settings, ...(d.settings ?? {}) } } as Data;
}

export async function createSave(kv: KV, userId: string, meta: { name: string; map: string; mapName: string; mode: StartMode }, data: Data): Promise<SaveMeta> {
  const saves = await readJson<SaveMeta[]>(kv, KEYS.saves(userId), []);
  const name = meta.name.trim() || data.settings.farmName;
  const save: SaveMeta = { id: newId(), userId, name, farmName: data.settings.farmName, map: meta.map, mapName: meta.mapName, mode: meta.mode, createdAt: nowIso(), updatedAt: nowIso() };
  await kv.setItem(KEYS.save(save.id), JSON.stringify(data));
  await kv.setItem(KEYS.saves(userId), JSON.stringify([...saves, save]));
  return save;
}

export async function loadSave(kv: KV, saveId: string): Promise<Data | null> {
  const raw = await readJson<Partial<Data> | null>(kv, KEYS.save(saveId), null);
  return raw ? normalizeData(raw) : null;
}

export async function writeSave(kv: KV, userId: string, saveId: string, data: Data): Promise<void> {
  await kv.setItem(KEYS.save(saveId), JSON.stringify(data));
  const saves = await readJson<SaveMeta[]>(kv, KEYS.saves(userId), []);
  const next = saves.map((s) => (s.id === saveId ? { ...s, farmName: data.settings.farmName, updatedAt: nowIso() } : s));
  await kv.setItem(KEYS.saves(userId), JSON.stringify(next));
}

export async function renameSave(kv: KV, userId: string, saveId: string, name: string): Promise<void> {
  if (!name.trim()) throw new Error('Dê um nome ao save.');
  const saves = await readJson<SaveMeta[]>(kv, KEYS.saves(userId), []);
  await kv.setItem(KEYS.saves(userId), JSON.stringify(saves.map((s) => (s.id === saveId ? { ...s, name: name.trim() } : s))));
}

export async function deleteSave(kv: KV, userId: string, saveId: string): Promise<void> {
  const saves = await readJson<SaveMeta[]>(kv, KEYS.saves(userId), []);
  await kv.setItem(KEYS.saves(userId), JSON.stringify(saves.filter((s) => s.id !== saveId)));
  await kv.removeItem(KEYS.save(saveId));
  if ((await kv.getItem(KEYS.lastSave(userId))) === saveId) await kv.removeItem(KEYS.lastSave(userId));
}

export const getLastSave = (kv: KV, userId: string) => kv.getItem(KEYS.lastSave(userId)).catch(() => null);
export const setLastSave = (kv: KV, userId: string, saveId: string | null) => (saveId ? kv.setItem(KEYS.lastSave(userId), saveId) : kv.removeItem(KEYS.lastSave(userId)));

/**
 * Dados da versão antiga (uma fazenda só, sem contas). Na primeira conta criada
 * neste aparelho eles viram um save, para ninguém perder o que já anotou.
 */
export async function migrateLegacy(kv: KV, userId: string): Promise<SaveMeta | null> {
  if ((await kv.getItem(KEYS.legacyDone)) === '1') return null;
  const raw = await readJson<Partial<Data> | null>(kv, KEYS.legacy, null);
  await kv.setItem(KEYS.legacyDone, '1');
  if (!raw) return null;
  const data = normalizeData(raw);
  if (data.settings.demo) return null;
  return createSave(kv, userId, { name: data.settings.farmName, map: data.settings.map ?? 'outro', mapName: '', mode: 'importado' }, data);
}
