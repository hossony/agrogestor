import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as acc from './accounts';
import { PublicUser, SaveMeta, StartMode } from './accounts';
import * as cloud from './cloud';
import { CloudError, CloudSession, OfflineError } from './cloud';
import { demoData, emptyData } from './data/demo';
import { mapById } from './data/maps';
import { buildSaveData, NewSaveOptions } from './data/presets';
import { pushOne, syncAll } from './sync';
import { Collection, Data, Settings } from './types';
import { now, uid } from './utils';

/**
 * Estado global: conta logada, lista de saves da conta e os dados do save
 * aberto. Tudo é gravado no aparelho (AsyncStorage), um registro por save, e,
 * com a conta do site, sincronizado com o servidor (o mesmo banco da versão web).
 */

const kv: acc.KV = AsyncStorage;
const SYNC_EVERY = 20_000;

export interface CloudStatus {
  /** Conta ligada ao site (os saves sincronizam). */
  linked: boolean;
  state: 'idle' | 'syncing' | 'ok' | 'offline' | 'error';
  message?: string;
  lastSync?: string;
  url: string;
  code?: string;
}

interface Store {
  ready: boolean;
  user: PublicUser | null;
  logged: boolean;
  saves: SaveMeta[];
  currentSave: SaveMeta | null;
  data: Data;
  now: { year: number; month: number };
  cloud: CloudStatus;

  register: (input: { name: string; username: string; password: string; confirm: string }, remember: boolean) => Promise<void>;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<void>;
  setServerUrl: (url: string) => Promise<void>;
  linkCloud: (username: string, password: string) => Promise<void>;
  syncNow: () => Promise<void>;

  newSave: (o: NewSaveOptions | { example: true }, name?: string) => Promise<void>;
  openSave: (id: string) => Promise<void>;
  closeSave: () => void;
  deleteSave: (id: string) => Promise<void>;
  renameSave: (id: string, name: string) => Promise<void>;

  save: <K extends Collection>(col: K, item: Partial<Data[K][number]> & { id?: string }) => string;
  remove: (col: Collection, id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: Data) => void;
  advanceMonth: () => void;
  markRead: (ids: string[]) => void;
  toggleGuide: (id: string, read?: boolean) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [currentSave, setCurrentSave] = useState<SaveMeta | null>(null);
  const [data, setData] = useState<Data>(emptyData);
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>({ linked: false, state: 'idle', url: '' });

  // Gravação com atraso; `pending` guarda para qual save os dados pertencem.
  const pending = useRef<{ userId: string; saveId: string; data: Data } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);
  // Dados que vieram do disco ou do site (não são edição, não precisam ser regravados).
  const baseline = useRef<Data | null>(null);

  // Sincronização com o site.
  const session = useRef<CloudSession | null>(null);
  const userRef = useRef<PublicUser | null>(null);
  const currentRef = useRef<SaveMeta | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncing = useRef<Promise<void> | null>(null);
  userRef.current = user;
  currentRef.current = currentSave;

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const p = pending.current;
    pending.current = null;
    if (p) await acc.writeSave(kv, p.userId, p.saveId, p.data).catch(() => {});
  }, []);

  const refreshSaves = useCallback(async (userId: string) => setSaves(await acc.listSaves(kv, userId)), []);

  const open = useCallback(
    async (u: PublicUser, saveId: string) => {
      await flush();
      const d = await acc.loadSave(kv, saveId);
      const list = await acc.listSaves(kv, u.id);
      const meta = list.find((s) => s.id === saveId);
      setSaves(list);
      if (!d || !meta) {
        await acc.setLastSave(kv, u.id, null);
        setCurrentSave(null);
        loadedFor.current = null;
        return;
      }
      loadedFor.current = saveId;
      baseline.current = d;
      setData(d);
      setCurrentSave(meta);
      await acc.setLastSave(kv, u.id, saveId);
    },
    [flush],
  );

  /* ---------- Sincronização ---------- */

  const status = useCallback((patch: Partial<CloudStatus>) => setCloudStatus((c) => ({ ...c, ...patch })), []);

  const fail = useCallback(
    (e: unknown) => {
      if (e instanceof OfflineError) status({ state: 'offline', message: 'Sem conexão com o site. As mudanças ficam guardadas aqui e sobem quando voltar a internet.' });
      else if (e instanceof CloudError && e.status === 401) status({ state: 'error', message: 'A sessão do site venceu. Saia e entre de novo para voltar a sincronizar.' });
      else status({ state: 'error', message: (e as Error)?.message ?? 'Falha ao sincronizar.' });
    },
    [status],
  );

  const runSync = useCallback(async () => {
    if (syncing.current) return syncing.current;
    const s = session.current;
    const u = userRef.current;
    if (!s || !u || s.user.id !== u.id) return;
    const job = (async () => {
      status({ state: 'syncing' });
      try {
        await flush();
        const res = await syncAll(kv, u.id, s);
        if (userRef.current?.id !== u.id) return;
        await refreshSaves(u.id);
        const cur = currentRef.current;
        if (cur && res.removed.includes(cur.id)) {
          loadedFor.current = null;
          setCurrentSave(null);
          await acc.setLastSave(kv, u.id, null);
        } else if (cur && res.pulled.includes(cur.id) && !pending.current) {
          // O save aberto foi editado em outro aparelho (ou no site): mostra a versão nova.
          const d = await acc.loadSave(kv, cur.id);
          const meta = (await acc.listSaves(kv, u.id)).find((x) => x.id === cur.id);
          if (d && meta && currentRef.current?.id === cur.id) {
            baseline.current = d;
            setData(d);
            setCurrentSave(meta);
          }
        }
        status({ state: 'ok', message: undefined, lastSync: new Date().toISOString() });
      } catch (e) {
        fail(e);
      }
    })();
    syncing.current = job.finally(() => {
      syncing.current = null;
    });
    return syncing.current;
  }, [flush, refreshSaves, status, fail]);

  /** Envia o save aberto pouco depois de cada edição. */
  const schedulePush = useCallback(
    (userId: string, saveId: string) => {
      const s = session.current;
      if (!s || s.user.id !== userId) return;
      if (pushTimer.current) clearTimeout(pushTimer.current);
      pushTimer.current = setTimeout(async () => {
        pushTimer.current = null;
        if (syncing.current) return void syncing.current.then(() => schedulePush(userId, saveId));
        try {
          await flush();
          const r = await pushOne(kv, userId, s, saveId);
          if (r === 'stale') await runSync();
          else status({ state: 'ok', message: undefined, lastSync: new Date().toISOString() });
        } catch (e) {
          fail(e);
        }
      }, 2500);
    },
    [flush, runSync, status, fail],
  );

  const applySession = useCallback(
    async (s: CloudSession | null) => {
      session.current = s;
      await cloud.setCloud(kv, s);
      setCloudStatus({ linked: !!s, state: 'idle', url: s?.url ?? (await cloud.getServerUrl(kv)), code: s?.user.code });
    },
    [],
  );

  // Abertura do app: sessão lembrada e último save usado.
  useEffect(() => {
    (async () => {
      try {
        const url = await cloud.getServerUrl(kv);
        status({ url });
        let s = await cloud.getCloud(kv);
        const id = await acc.getSession(kv);
        let u = id ? await acc.getUser(kv, id) : null;
        // No site (/gestao): quem já entrou no site entra direto na gestão.
        if (!u) {
          const fromSite = await cloud.cloudFromCookie();
          if (fromSite) {
            u = await acc.upsertCloudUser(kv, fromSite.user);
            s = fromSite;
            await acc.setSession(kv, u.id);
          }
        }
        if (u) {
          if (s && s.user.id === u.id) await applySession(s);
          setUser(u);
          userRef.current = u;
          const last = await acc.getLastSave(kv, u.id);
          if (last) await open(u, last);
          else await refreshSaves(u.id);
          runSync();
        }
      } catch {
        // Sem armazenamento: começa na tela de entrada.
      }
      setReady(true);
    })();
  }, [open, refreshSaves, runSync, applySession, status]);

  // Sincroniza de tempos em tempos e quando o app volta para a frente.
  useEffect(() => {
    if (!user || !cloudStatus.linked) return;
    const t = setInterval(() => runSync(), SYNC_EVERY);
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') runSync();
      else flush().then(() => (currentRef.current && session.current ? pushOne(kv, user.id, session.current, currentRef.current.id) : undefined)).catch(() => {});
    });
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, [user, cloudStatus.linked, runSync, flush]);

  // Grava o save aberto a cada mudança (com atraso de 250 ms) e envia ao site.
  useEffect(() => {
    if (!user || !currentSave || loadedFor.current !== currentSave.id) return;
    if (data === baseline.current) return;
    baseline.current = data;
    pending.current = { userId: user.id, saveId: currentSave.id, data };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush();
    }, 250);
    schedulePush(user.id, currentSave.id);
  }, [data, user, currentSave, flush, schedulePush]);

  const enter = useCallback(
    async (u: PublicUser, remember: boolean) => {
      await acc.setSession(kv, remember ? u.id : null);
      setUser(u);
      userRef.current = u;
      const last = await acc.getLastSave(kv, u.id);
      if (last) await open(u, last);
      else await refreshSaves(u.id);
      runSync();
    },
    [open, refreshSaves, runSync],
  );

  const register = useCallback<Store['register']>(
    async (input, remember) => {
      const problem = acc.validateRegistration(input);
      if (problem) throw new Error(problem);
      const url = await cloud.getServerUrl(kv);
      if (url) {
        try {
          const s = await cloud.cloudRegister(url, { name: input.name.trim(), username: acc.normUser(input.username), password: input.password });
          const u = await acc.upsertCloudUser(kv, s.user, input.password);
          await applySession(s);
          await acc.migrateLegacy(kv, u.id);
          return enter(u, remember);
        } catch (e) {
          if (!(e instanceof OfflineError)) throw e;
          throw new Error('Sem conexão com o site para criar a conta. Conecte-se à internet e tente de novo.');
        }
      }
      const u = await acc.register(kv, input);
      await acc.migrateLegacy(kv, u.id);
      await applySession(null);
      await enter(u, remember);
    },
    [enter, applySession],
  );

  const login = useCallback<Store['login']>(
    async (username, password, remember) => {
      const url = await cloud.getServerUrl(kv);
      if (url) {
        try {
          const s = await cloud.cloudLogin(url, acc.normUser(username), password);
          const u = await acc.upsertCloudUser(kv, s.user, password);
          await applySession(s);
          return enter(u, remember);
        } catch (e) {
          // Sem internet: entra com a cópia da conta guardada aqui.
          // Senha recusada no site: pode ser uma conta só deste aparelho.
          if (!(e instanceof OfflineError) && !(e instanceof CloudError && e.status === 401)) throw e;
          const u = await acc.authenticate(kv, username, password).catch(() => {
            throw e instanceof OfflineError ? new Error('Sem conexão com o site e essa conta ainda não entrou neste aparelho.') : e;
          });
          const s = await cloud.getCloud(kv);
          await applySession(s && s.user.id === u.id && e instanceof OfflineError ? s : null);
          if (e instanceof OfflineError && s?.user.id === u.id) fail(e);
          return enter(u, remember);
        }
      }
      const u = await acc.authenticate(kv, username, password);
      await applySession(null);
      await enter(u, remember);
    },
    [enter, applySession, fail],
  );

  /** Liga uma conta só deste aparelho à conta do site; os saves dela sobem para a nuvem. */
  const linkCloud = useCallback<Store['linkCloud']>(
    async (username, password) => {
      const cur = userRef.current;
      if (!cur) return;
      const url = await cloud.getServerUrl(kv);
      if (!url) throw new Error('Informe o endereço do site primeiro.');
      await flush();
      const s = await cloud.cloudLogin(url, acc.normUser(username), password);
      const u = await acc.upsertCloudUser(kv, s.user, password, cur.id);
      await applySession(s);
      if ((await acc.getSession(kv)) === cur.id) await acc.setSession(kv, u.id);
      const last = currentRef.current?.id;
      setUser(u);
      userRef.current = u;
      if (last) await open(u, last);
      else await refreshSaves(u.id);
      await runSync();
    },
    [flush, applySession, open, refreshSaves, runSync],
  );

  const setServerUrl = useCallback<Store['setServerUrl']>(
    async (url) => {
      await cloud.setServerUrl(kv, url);
      status({ url: await cloud.getServerUrl(kv) });
    },
    [status],
  );

  const syncNow = useCallback(() => runSync() ?? Promise.resolve(), [runSync]);

  const closeSave = useCallback(() => {
    flush().then(() => runSync());
    loadedFor.current = null;
    setCurrentSave(null);
    if (user) {
      acc.setLastSave(kv, user.id, null);
      refreshSaves(user.id);
    }
  }, [flush, user, refreshSaves, runSync]);

  const logout = useCallback(() => {
    const s = session.current;
    const u = userRef.current;
    const cur = currentRef.current;
    flush().then(() => (s && u && cur ? pushOne(kv, u.id, s, cur.id) : undefined)).catch(() => {});
    if (pushTimer.current) clearTimeout(pushTimer.current);
    loadedFor.current = null;
    session.current = null;
    setCurrentSave(null);
    setUser(null);
    userRef.current = null;
    setSaves([]);
    setData(emptyData());
    setCloudStatus((c) => ({ linked: false, state: 'idle', url: c.url }));
    cloud.setCloud(kv, null).catch(() => {});
    acc.setSession(kv, null).catch(() => {});
  }, [flush]);

  const changePassword = useCallback<Store['changePassword']>(async (current, next) => {
    if (!user) return;
    const s = session.current;
    if (s && s.user.id === user.id) {
      // Conta do site: troca lá (vale no site e em todos os aparelhos) e atualiza a cópia daqui.
      await cloud.changeCloudPassword(s, current, next);
      await acc.upsertCloudUser(kv, s.user, next);
    } else await acc.changePassword(kv, user.id, current, next);
  }, [user]);

  const newSave = useCallback<Store['newSave']>(
    async (o, name) => {
      if (!user) return;
      let d: Data;
      let meta: { name: string; map: string; mapName: string; mode: StartMode };
      if ('example' in o) {
        d = demoData();
        meta = { name: name ?? 'Fazenda de exemplo', map: 'outro', mapName: 'Exemplo', mode: 'exemplo' };
      } else {
        d = buildSaveData(o);
        meta = { name: name?.trim() || d.settings.farmName, map: o.map, mapName: o.map === 'outro' ? d.settings.mapName ?? '' : mapById(o.map)?.name ?? '', mode: o.mode };
      }
      const s = await acc.createSave(kv, user.id, meta, d);
      await open(user, s.id);
      runSync();
    },
    [user, open, runSync],
  );

  const openSave = useCallback<Store['openSave']>(async (id) => {
    if (user) await open(user, id);
  }, [user, open]);

  const deleteSave = useCallback<Store['deleteSave']>(
    async (id) => {
      if (!user) return;
      if (currentSave?.id === id) {
        pending.current = null;
        loadedFor.current = null;
        setCurrentSave(null);
      }
      await acc.deleteSave(kv, user.id, id);
      await refreshSaves(user.id);
      runSync();
    },
    [user, currentSave, refreshSaves, runSync],
  );

  const renameSave = useCallback<Store['renameSave']>(
    async (id, name) => {
      if (!user) return;
      await acc.renameSave(kv, user.id, id, name);
      const list = await acc.listSaves(kv, user.id);
      setSaves(list);
      setCurrentSave((cur) => (cur && cur.id === id ? list.find((s) => s.id === id) ?? cur : cur));
      runSync();
    },
    [user, runSync],
  );

  /* ---------- Edição dos dados do save aberto ---------- */

  const save = useCallback<Store['save']>((col, item) => {
    const id = item.id ?? uid();
    setData((d) => {
      const list = d[col] as { id: string }[];
      const exists = list.some((x) => x.id === id);
      const next = exists ? list.map((x) => (x.id === id ? { ...x, ...item, id } : x)) : [...list, { ...item, id }];
      return { ...d, [col]: next };
    });
    return id;
  }, []);

  const remove = useCallback<Store['remove']>((col, id) => {
    setData((d) => {
      const next: Data = { ...d, [col]: (d[col] as { id: string }[]).filter((x) => x.id !== id) };
      // Remove o que dependia do registro apagado.
      if (col === 'fields') {
        next.plantings = next.plantings.filter((p) => p.fieldId !== id);
        next.tasks = next.tasks.map((t) => (t.fieldId === id ? { ...t, fieldId: undefined } : t));
        next.records = next.records.map((r) => (r.fieldId === id ? { ...r, fieldId: undefined } : r));
      }
      if (col === 'crops') {
        next.plantings = next.plantings.filter((p) => p.cropId !== id);
        next.sales = next.sales.filter((s) => s.cropId !== id);
      }
      return next;
    });
  }, []);

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const replaceAll = useCallback(
    (next: Data) =>
      setData((d) => {
        const n = acc.normalizeData(next);
        return { ...n, guideRead: next.guideRead ?? d.guideRead, settings: { ...n.settings, tutorialSeen: next.settings?.tutorialSeen || d.settings.tutorialSeen } };
      }),
    [],
  );

  const advanceMonth = useCallback(() => {
    setData((d) => {
      const m = d.settings.gameMonth === 12 ? 1 : d.settings.gameMonth + 1;
      const y = d.settings.gameMonth === 12 ? d.settings.gameYear + 1 : d.settings.gameYear;
      return { ...d, settings: { ...d.settings, gameMonth: m, gameYear: y } };
    });
  }, []);

  const markRead = useCallback((ids: string[]) => {
    setData((d) => {
      const fresh = ids.filter((id) => !d.readAlerts.includes(id));
      return fresh.length ? { ...d, readAlerts: [...d.readAlerts, ...fresh].slice(-400) } : d;
    });
  }, []);

  const toggleGuide = useCallback((id: string, read?: boolean) => {
    setData((d) => {
      const has = d.guideRead.includes(id);
      const want = read ?? !has;
      if (want === has) return d;
      return { ...d, guideRead: want ? [...d.guideRead, id] : d.guideRead.filter((x) => x !== id) };
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      ready, user, logged: !!user, saves, currentSave, data, now: now(data.settings), cloud: cloudStatus,
      register, login, logout, changePassword, setServerUrl, linkCloud, syncNow, newSave, openSave, closeSave, deleteSave, renameSave,
      save, remove, setSettings, replaceAll, advanceMonth, markRead, toggleGuide,
    }),
    [ready, user, saves, currentSave, data, cloudStatus, register, login, logout, changePassword, setServerUrl, linkCloud, syncNow, newSave, openSave, closeSave, deleteSave, renameSave, save, remove, setSettings, replaceAll, advanceMonth, markRead, toggleGuide],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
}
