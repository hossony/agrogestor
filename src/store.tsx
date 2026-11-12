import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { demoData, emptyData } from './data/demo';
import { Collection, Data, Settings } from './types';
import { now, uid } from './utils';

const KEY = 'agrogestor:v1';
const SESSION_KEY = 'agrogestor:sessao';

interface Store {
  data: Data;
  ready: boolean;
  now: { year: number; month: number };
  save: <K extends Collection>(col: K, item: Partial<Data[K][number]> & { id?: string }) => string;
  remove: (col: Collection, id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  replaceAll: (next: Data) => void;
  advanceMonth: () => void;
  markRead: (ids: string[]) => void;
  toggleGuide: (id: string, read?: boolean) => void;
  logged: boolean;
  login: (remember: boolean) => void;
  logout: () => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(demoData);
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const base = emptyData();
          setData({ ...base, ...parsed, settings: { ...base.settings, ...parsed.settings } });
        }
        if ((await AsyncStorage.getItem(SESSION_KEY)) === '1') setLogged(true);
      } catch {
        // Sem armazenamento disponível: segue com os dados em memória.
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
    }, 250);
  }, [data, ready]);

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
      setData((d) => ({
        ...emptyData(),
        ...next,
        guideRead: next.guideRead ?? d.guideRead,
        settings: { ...emptyData().settings, ...next.settings, tutorialSeen: next.settings?.tutorialSeen || d.settings.tutorialSeen },
      })),
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

  const login = useCallback((remember: boolean) => {
    setLogged(true);
    if (remember) AsyncStorage.setItem(SESSION_KEY, '1').catch(() => {});
  }, []);
  const logout = useCallback(() => {
    setLogged(false);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  const value = useMemo<Store>(
    () => ({ data, ready, now: now(data.settings), save, remove, setSettings, replaceAll, advanceMonth, markRead, toggleGuide, logged, login, logout }),
    [data, ready, save, remove, setSettings, replaceAll, advanceMonth, markRead, toggleGuide, logged, login, logout],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider ausente');
  return s;
}
