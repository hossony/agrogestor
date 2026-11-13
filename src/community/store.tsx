import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Gamepad2, MessageCircle, X } from 'lucide-react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, PanResponder, Platform, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { c, font } from '../theme';
import { Conn, defaultApiUrl, normalizeUrl, request } from './api';
import { snapshotFromSave } from './farm';
import type { Me, Notif } from './types';

/**
 * Estado da comunidade no app: conta do site (token), avisos ao vivo,
 * notificações do sistema e sincronização da fazenda com o perfil.
 *
 * - Com o app aberto: consulta o servidor a cada 6 s e mostra os avisos na tela.
 * - Com o app fechado: o servidor manda push pela Expo (se o build tiver push).
 * - A fazenda do save aberto é enviada ao perfil sempre que muda (se ligado).
 */

export type Target = { kind: 'post'; id: string } | { kind: 'user'; code: string } | { kind: 'tab'; tab: 'feed' | 'amigos' | 'jogar' | 'avisos' | 'perfil' };
export type PushStatus = 'on' | 'off' | 'denied' | 'unavailable' | 'no-project';

interface Counts {
  unread: number;
  friend_requests: number;
  invites: number;
}

interface Ctx extends Counts {
  ready: boolean;
  conn: Conn | null;
  url: string;
  me: Me | null;
  version: number;
  target: Target | null;
  push: PushStatus;
  sync: { enabled: boolean; last: string | null; error: string | null; busy: boolean };
  setUrl: (u: string) => void;
  login: (username: string, password: string) => Promise<void>;
  register: (name: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setMe: (m: Me) => void;
  refresh: () => void;
  open: (t: Target | null) => void;
  enablePush: () => Promise<void>;
  setSyncEnabled: (on: boolean) => void;
  syncNow: () => Promise<void>;
}

const Context = createContext<Ctx | null>(null);
export const useCommunity = () => useContext(Context)!;

const keyFor = (localUserId: string) => `agrogestor:comunidade:${localUserId}`;
const syncKey = (saveId: string) => `agrogestor:comunidade:sync:${saveId}`;

/* ---------- Notificações nativas (carregadas só no Android/iOS) ---------- */

let notif: any = null;
function native() {
  if (Platform.OS === 'web') return null;
  if (notif) return notif;
  try {
    notif = require('expo-notifications');
    notif.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: AppState.currentState !== 'active', shouldShowList: true, shouldPlaySound: AppState.currentState !== 'active', shouldSetBadge: false }),
    });
    return notif;
  } catch {
    return null;
  }
}

async function prepareChannels(n: any) {
  if (Platform.OS === 'android') {
    await n.setNotificationChannelAsync('convites', { name: 'Convites para jogar', importance: n.AndroidImportance.MAX, vibrationPattern: [0, 120, 60, 120, 60, 240], lightColor: '#E9A800' });
    await n.setNotificationChannelAsync('comunidade', { name: 'Comunidade (amigos, curtidas, comentários)', importance: n.AndroidImportance.DEFAULT });
  }
  await n.setNotificationCategoryAsync('convite', [
    { identifier: 'accept', buttonTitle: 'Bora jogar!', options: { opensAppToForeground: true } },
    { identifier: 'decline', buttonTitle: 'Agora não', options: { opensAppToForeground: false } },
  ]);
}

const projectId = () => (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;

/* ---------- Provider ---------- */

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { user, currentSave, data } = useStore();
  const [ready, setReady] = useState(false);
  const [conn, setConn] = useState<Conn | null>(null);
  const [url, setUrlState] = useState(defaultApiUrl());
  const [me, setMe] = useState<Me | null>(null);
  const [counts, setCounts] = useState<Counts>({ unread: 0, friend_requests: 0, invites: 0 });
  const [version, setVersion] = useState(0);
  const [target, setTarget] = useState<Target | null>(null);
  const [toasts, setToasts] = useState<{ key: string; n: Notif }[]>([]);
  const [push, setPush] = useState<PushStatus>(Platform.OS === 'web' ? 'unavailable' : 'off');
  const [sync, setSync] = useState<Ctx['sync']>({ enabled: false, last: null, error: null, busy: false });
  const last = useRef<number | null>(null);
  const busy = useRef(false);
  const store = user ? keyFor(user.id) : null;

  // Sessão guardada para esta conta local.
  useEffect(() => {
    if (!store) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(store);
        const saved = raw ? (JSON.parse(raw) as Conn) : null;
        if (saved?.url) setUrlState(saved.url);
        if (saved?.token) {
          setConn(saved);
          request<Me>(saved, '/api/me')
            .then(setMe)
            .catch((e) => {
              if (e.status === 401) {
                setConn(null);
                AsyncStorage.setItem(store, JSON.stringify({ url: saved.url, token: '' }));
              }
            });
        }
      } catch {}
      setReady(true);
    })();
  }, [store]);

  const save = useCallback(async (next: Conn) => {
    if (store) await AsyncStorage.setItem(store, JSON.stringify(next)).catch(() => {});
  }, [store]);

  const setUrl = useCallback((u: string) => setUrlState(normalizeUrl(u)), []);

  const afterAuth = useCallback(
    async (token: string, base: string) => {
      const next = { url: base, token };
      setConn(next);
      await save(next);
      setMe(await request<Me>(next, '/api/me'));
      last.current = null;
    },
    [save],
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const base = normalizeUrl(url);
      if (!base) throw new Error('Informe o endereço do site do AgroGestor.');
      const r = await request<{ token: string }>({ url: base }, '/api/auth/login', { body: { username, password } });
      await afterAuth(r.token, base);
    },
    [url, afterAuth],
  );

  const register = useCallback(
    async (name: string, username: string, password: string) => {
      const base = normalizeUrl(url);
      if (!base) throw new Error('Informe o endereço do site do AgroGestor.');
      const r = await request<{ token: string }>({ url: base }, '/api/auth/register', { body: { name, username, password } });
      await afterAuth(r.token, base);
    },
    [url, afterAuth],
  );

  const logout = useCallback(async () => {
    const n = native();
    if (conn && n && projectId()) {
      try {
        const t = (await n.getExpoPushTokenAsync({ projectId: projectId() })).data;
        await request(conn, '/api/push', { method: 'DELETE', body: { expoToken: t } });
      } catch {}
    }
    setConn(null);
    setMe(null);
    setCounts({ unread: 0, friend_requests: 0, invites: 0 });
    await save({ url, token: '' });
  }, [conn, url, save]);

  /* ----- Avisos ao vivo ----- */

  const dismiss = useCallback((key: string) => setToasts((t) => t.filter((x) => x.key !== key)), []);
  const show = useCallback(
    (n: Notif) => {
      const key = `${n.id}-${Date.now()}`;
      setToasts((t) => [{ key, n }, ...t.filter((x) => x.n.id !== n.id)].slice(0, 2));
      if (n.type !== 'invite') setTimeout(() => dismiss(key), 6000);
    },
    [dismiss],
  );

  const poll = useCallback(async () => {
    if (!conn || busy.current) return;
    busy.current = true;
    try {
      const after = last.current;
      const res = await request<Counts & { items: Notif[]; newest: number }>(conn, `/api/notifications${after ? `?after=${after}` : '?initial=1'}`);
      setCounts({ unread: res.unread, friend_requests: res.friend_requests, invites: res.invites });
      if (res.items.length) {
        res.items.slice().reverse().forEach(show);
        setVersion((v) => v + 1);
      }
      last.current = Math.max(res.newest, after ?? 0);
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        setConn(null);
        setMe(null);
      }
    } finally {
      busy.current = false;
    }
  }, [conn, show]);

  useEffect(() => {
    if (!conn) return;
    poll();
    let timer: ReturnType<typeof setTimeout>;
    let active = AppState.currentState === 'active';
    const loop = () => {
      timer = setTimeout(async () => {
        if (active) await poll();
        loop();
      }, 6000);
    };
    loop();
    const sub = AppState.addEventListener('change', (s) => {
      active = s === 'active';
      if (active) poll();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [conn, poll]);

  const respond = useCallback(
    async (inviteId: string, action: 'accept' | 'decline') => {
      if (!conn) return;
      await request(conn, `/api/invites/${inviteId}`, { method: 'PATCH', body: { action } }).catch(() => {});
      setVersion((v) => v + 1);
      poll();
    },
    [conn, poll],
  );

  /* ----- Push nativo ----- */

  const registerPush = useCallback(
    async (ask: boolean) => {
      const n = native();
      if (!n || !conn) return setPush(Platform.OS === 'web' ? 'unavailable' : 'off');
      if (!projectId()) return setPush('no-project');
      try {
        await prepareChannels(n);
        let perm = await n.getPermissionsAsync();
        if (!perm.granted && ask) perm = await n.requestPermissionsAsync();
        if (!perm.granted) return setPush(perm.canAskAgain === false ? 'denied' : 'off');
        const token = (await n.getExpoPushTokenAsync({ projectId: projectId() })).data;
        await request(conn, '/api/push', { body: { expoToken: token } });
        setPush('on');
      } catch {
        setPush('unavailable');
      }
    },
    [conn],
  );

  useEffect(() => {
    if (conn) registerPush(false);
  }, [conn, registerPush]);

  // Toque na notificação (ou nos botões do convite).
  useEffect(() => {
    const n = native();
    if (!n || !conn) return;
    const handle = (resp: any) => {
      const d = resp?.notification?.request?.content?.data ?? {};
      const action = resp?.actionIdentifier;
      if (d.inviteId && (action === 'accept' || action === 'decline')) respond(d.inviteId, action);
      if (action === 'decline') return;
      const url: string = d.url ?? '';
      const post = url.match(/^\/post\/([\w-]+)/);
      const u = url.match(/^\/u\/([\w-]+)/);
      if (post) setTarget({ kind: 'post', id: post[1] });
      else if (u) setTarget({ kind: 'user', code: u[1] });
      else if (url.startsWith('/convites')) setTarget({ kind: 'tab', tab: 'jogar' });
      else if (url.startsWith('/amigos')) setTarget({ kind: 'tab', tab: 'amigos' });
      else setTarget({ kind: 'tab', tab: 'avisos' });
    };
    n.getLastNotificationResponseAsync?.().then((r: any) => r && handle(r)).catch(() => {});
    const sub = n.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [conn, respond]);

  /* ----- Sincronização da fazenda ----- */

  const saveId = currentSave?.id;
  useEffect(() => {
    if (!saveId) return;
    AsyncStorage.getItem(syncKey(saveId))
      .then((raw) => {
        const v = raw ? JSON.parse(raw) : null;
        setSync((s) => ({ ...s, enabled: Boolean(v?.enabled), last: v?.last ?? null }));
      })
      .catch(() => {});
  }, [saveId]);

  const syncNow = useCallback(async () => {
    if (!conn || !saveId) return;
    setSync((s) => ({ ...s, busy: true, error: null }));
    try {
      await request(conn, '/api/farm', { method: 'PUT', body: snapshotFromSave(data) });
      const at = new Date().toISOString();
      setSync((s) => ({ ...s, busy: false, last: at, enabled: true }));
      await AsyncStorage.setItem(syncKey(saveId), JSON.stringify({ enabled: true, last: at }));
    } catch (e) {
      setSync((s) => ({ ...s, busy: false, error: (e as Error).message }));
    }
  }, [conn, saveId, data]);

  const setSyncEnabled = useCallback(
    (on: boolean) => {
      if (!saveId) return;
      setSync((s) => ({ ...s, enabled: on }));
      AsyncStorage.setItem(syncKey(saveId), JSON.stringify({ enabled: on, last: sync.last })).catch(() => {});
      if (on) syncNow();
    },
    [saveId, sync.last, syncNow],
  );

  // Fazenda mudou: envia o resumo novo depois de 5 s sem mexer.
  const firstData = useRef(true);
  useEffect(() => {
    if (firstData.current) {
      firstData.current = false;
      return;
    }
    if (!sync.enabled || !conn) return;
    const t = setTimeout(syncNow, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sync.enabled, conn]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      conn,
      url,
      me,
      version,
      target,
      push,
      sync,
      ...counts,
      setUrl,
      login,
      register,
      logout,
      setMe,
      refresh: poll,
      open: setTarget,
      enablePush: () => registerPush(true),
      setSyncEnabled,
      syncNow,
    }),
    [ready, conn, url, me, version, target, push, sync, counts, setUrl, login, register, logout, poll, registerPush, setSyncEnabled, syncNow],
  );

  return (
    <Context.Provider value={value}>
      {children}
      <ToastStack
        toasts={toasts}
        dismiss={dismiss}
        onRespond={(t, action) => {
          dismiss(t.key);
          if (t.n.invite_id) respond(t.n.invite_id, action);
        }}
        onOpen={(t) => {
          dismiss(t.key);
          const n = t.n;
          if (n.post_id) setTarget({ kind: 'post', id: n.post_id });
          else if (n.type.startsWith('invite')) setTarget({ kind: 'tab', tab: 'jogar' });
          else if (n.type === 'friend_request') setTarget({ kind: 'tab', tab: 'amigos' });
          else if (n.actor) setTarget({ kind: 'user', code: n.actor.code });
        }}
      />
    </Context.Provider>
  );
}

/* ---------- Avisos na tela ---------- */

type ToastItem = { key: string; n: Notif };
const nativeDriver = Platform.OS !== 'web';

function ToastCard({ t, dismiss, onRespond, onOpen }: { t: ToastItem; dismiss: (k: string) => void; onRespond: (t: ToastItem, a: 'accept' | 'decline') => void; onOpen: (t: ToastItem) => void }) {
  const enter = useRef(new Animated.Value(0)).current;
  const dx = useRef(new Animated.Value(0)).current;
  const wiggle = useRef(new Animated.Value(0)).current;
  const invite = t.n.type === 'invite';

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, useNativeDriver: nativeDriver, friction: 8, tension: 70 }).start();
    if (!invite) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(wiggle, { toValue: 1, duration: 90, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriver }),
        Animated.timing(wiggle, { toValue: -1, duration: 180, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriver }),
        Animated.timing(wiggle, { toValue: 0, duration: 90, easing: Easing.inOut(Easing.ease), useNativeDriver: nativeDriver }),
        Animated.delay(1600),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enter, wiggle, invite]);

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderMove: (_, g) => dx.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (Math.abs(g.dx) > 90) Animated.timing(dx, { toValue: g.dx > 0 ? 500 : -500, duration: 200, useNativeDriver: nativeDriver }).start(() => dismiss(t.key));
        else Animated.spring(dx, { toValue: 0, useNativeDriver: nativeDriver }).start();
      },
    }),
  ).current;

  const fg = invite ? '#fff' : c.ink;
  return (
    <Animated.View
      {...pan.panHandlers}
      style={{
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }, { translateX: dx }],
        backgroundColor: invite ? c.sidebar : c.surface,
        borderRadius: 18,
        borderWidth: invite ? 0 : 1,
        borderColor: c.line,
        padding: 14,
        flexDirection: 'row',
        gap: 12,
        shadowColor: '#000',
        shadowOpacity: 0.22,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
      }}
    >
      <Animated.View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: invite ? c.harvest : c.primarySoft, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: wiggle.interpolate({ inputRange: [-1, 1], outputRange: ['-12deg', '12deg'] }) }] }}>
        {invite ? <Gamepad2 size={22} color={c.sidebar} /> : <MessageCircle size={20} color={c.primaryDark} />}
      </Animated.View>
      <Pressable style={{ flex: 1 }} onPress={() => onOpen(t)}>
        <Text style={{ fontFamily: font, fontWeight: '700', fontSize: 14, color: fg }}>{invite ? 'Convite para jogar' : t.n.actor?.name ?? 'AgroGestor'}</Text>
        <Text style={{ fontFamily: font, fontSize: 13, color: invite ? 'rgba(255,255,255,0.8)' : c.muted, marginTop: 2, lineHeight: 18 }} numberOfLines={4}>
          {t.n.text}
        </Text>
        {invite && t.n.invite_id ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <Pressable accessibilityRole="button" onPress={() => onRespond(t, 'accept')} style={({ pressed }) => ({ backgroundColor: c.harvest, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ fontFamily: font, fontWeight: '700', color: '#2a1f00' }}>Bora jogar!</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => onRespond(t, 'decline')} style={({ pressed }) => ({ borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ fontFamily: font, fontWeight: '700', color: '#fff' }}>Agora não</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>
      <Pressable accessibilityLabel="Fechar" hitSlop={8} onPress={() => dismiss(t.key)}>
        <X size={16} color={invite ? '#fff' : c.muted} />
      </Pressable>
    </Animated.View>
  );
}

function ToastStack({ toasts, dismiss, onRespond, onOpen }: { toasts: ToastItem[]; dismiss: (k: string) => void; onRespond: (t: ToastItem, a: 'accept' | 'decline') => void; onOpen: (t: ToastItem) => void }) {
  const insets = useSafeAreaInsets();
  if (!toasts.length) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 60, left: 12, right: 12, alignItems: 'center', gap: 10, zIndex: 50 }}>
      {toasts.map((t) => (
        <View key={t.key} style={{ width: '100%', maxWidth: 420 }}>
          <ToastCard t={t} dismiss={dismiss} onRespond={onRespond} onOpen={onOpen} />
        </View>
      ))}
    </View>
  );
}
