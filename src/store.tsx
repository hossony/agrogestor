import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as acc from './accounts';
import { PublicUser, SaveMeta, StartMode } from './accounts';
import { demoData, emptyData } from './data/demo';
import { mapById } from './data/maps';
import { buildSaveData, NewSaveOptions } from './data/presets';
import { Collection, Data, Settings } from './types';
import { now, uid } from './utils';

/**
 * Estado global: conta logada, lista de saves da conta e os dados do save
 * aberto. Tudo é gravado localmente (AsyncStorage), um registro por save.
 */

const kv: acc.KV = AsyncStorage;

interface Store {
  ready: boolean;
  user: PublicUser | null;
  logged: boolean;
  saves: SaveMeta[];
  currentSave: SaveMeta | null;
  data: Data;
  now: { year: number; month: number };

  register: (input: { name: string; username: string; password: string; confirm: string }, remember: boolean) => Promise<void>;
  login: (username: string, password: string, remember: boolean) => Promise<void>;
  logout: () => void;
  changePassword: (current: string, next: string) => Promise<void>;

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

  // Gravação com atraso; `pending` guarda para qual save os dados pertencem.
  const pending = useRef<{ userId: string; saveId: string; data: Data } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedFor = useRef<string | null>(null);

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
      setData(d);
      setCurrentSave(meta);
      await acc.setLastSave(kv, u.id, saveId);
    },
    [flush],
  );

  // Abertura do app: sessão lembrada e último save usado.
  useEffect(() => {
    (async () => {
      try {
        const id = await acc.getSession(kv);
        const u = id ? await acc.getUser(kv, id) : null;
        if (u) {
          setUser(u);
          const last = await acc.getLastSave(kv, u.id);
          if (last) await open(u, last);
          else await refreshSaves(u.id);
        }
      } catch {
        // Sem armazenamento: começa na tela de entrada.
      }
      setReady(true);
    })();
  }, [open, refreshSaves]);

  // Grava o save aberto a cada mudança (com atraso de 250 ms).
  useEffect(() => {
    if (!user || !currentSave || loadedFor.current !== currentSave.id) return;
    pending.current = { userId: user.id, saveId: currentSave.id, data };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      flush();
    }, 250);
  }, [data, user, currentSave, flush]);

  const enter = useCallback(
    async (u: PublicUser, remember: boolean) => {
      await acc.setSession(kv, remember ? u.id : null);
      setUser(u);
      const last = await acc.getLastSave(kv, u.id);
      if (last) await open(u, last);
      else await refreshSaves(u.id);
    },
    [open, refreshSaves],
  );

  const register = useCallback<Store['register']>(
    async (input, remember) => {
      const u = await acc.register(kv, input);
      await acc.migrateLegacy(kv, u.id);
      await enter(u, remember);
    },
    [enter],
  );

  const login = useCallback<Store['login']>(async (username, password, remember) => enter(await acc.authenticate(kv, username, password), remember), [enter]);

  const closeSave = useCallback(() => {
    flush();
    loadedFor.current = null;
    setCurrentSave(null);
    if (user) {
      acc.setLastSave(kv, user.id, null);
      refreshSaves(user.id);
    }
  }, [flush, user, refreshSaves]);

  const logout = useCallback(() => {
    flush();
    loadedFor.current = null;
    setCurrentSave(null);
    setUser(null);
    setSaves([]);
    setData(emptyData());
    acc.setSession(kv, null).catch(() => {});
  }, [flush]);

  const changePassword = useCallback<Store['changePassword']>(async (current, next) => {
    if (user) await acc.changePassword(kv, user.id, current, next);
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
    },
    [user, open],
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
    },
    [user, currentSave, refreshSaves],
  );

  const renameSave = useCallback<Store['renameSave']>(
    async (id, name) => {
      if (!user) return;
      await acc.renameSave(kv, user.id, id, name);
      const list = await acc.listSaves(kv, user.id);
      setSaves(list);
      setCurrentSave((cur) => (cur && cur.id === id ? list.find((s) => s.id === id) ?? cur : cur));
    },
    [user],
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
      ready, user, logged: !!user, saves, currentSave, data, now: now(data.settings),
      register, login, logout, changePassword, newSave, openSave, closeSave, deleteSave, renameSave,
      save, remove, setSettings, replaceAll, advanceMonth, markRead, toggleGuide,
    }),
    [ready, user, saves, currentSave, data, register, login, logout, changePassword, newSave, openSave, closeSave, deleteSave, renameSave, save, remove, setSettings, replaceAll, advanceMonth, markRead, toggleGuide],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
}
