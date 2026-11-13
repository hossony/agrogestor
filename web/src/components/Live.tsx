'use client';

import { Gamepad2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/client';
import type { Notification as Notif } from '@/lib/types';
import { Avatar, SPRING } from './ui';

/**
 * Notificações ao vivo: com o site aberto, consulta o servidor a cada poucos
 * segundos e mostra um aviso na tela (convite para jogar com botões). Com o
 * site fechado ou em segundo plano, o push do service worker leva o aviso para
 * a barra de notificações do celular ou do computador.
 */

interface Counts {
  unread: number;
  friend_requests: number;
  invites: number;
}
interface Toast {
  key: string;
  n: Notif;
}
interface LiveCtx extends Counts {
  refresh: () => void;
  pushState: PushState;
  enablePush: () => Promise<void>;
  disablePush: () => Promise<void>;
  /** Avisa a tela ativa quando chega algo novo (para recarregar listas). */
  version: number;
}
export type PushState = 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on' | 'no-key';

const Ctx = createContext<LiveCtx | null>(null);
export const useLive = () => useContext(Ctx)!;

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function b64ToBytes(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Counts>({ unread: 0, friend_requests: 0, invites: 0 });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [version, setVersion] = useState(0);
  const [pushState, setPushState] = useState<PushState>('off');
  const last = useRef<number | null>(null);
  const busy = useRef(false);

  const dismiss = useCallback((key: string) => setToasts((t) => t.filter((x) => x.key !== key)), []);

  const show = useCallback(
    (n: Notif) => {
      const key = `${n.id}-${Date.now()}`;
      setToasts((t) => [{ key, n }, ...t.filter((x) => x.n.id !== n.id)].slice(0, 3));
      if (n.type !== 'invite') setTimeout(() => dismiss(key), 6000);
      if (n.type === 'invite' && 'vibrate' in navigator) navigator.vibrate?.([120, 60, 120]);
    },
    [dismiss],
  );

  const poll = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const after = last.current;
      const res = await api<Counts & { items: Notif[]; newest: number }>(`/api/notifications${after ? `?after=${after}` : '?initial=1'}`);
      setCounts({ unread: res.unread, friend_requests: res.friend_requests, invites: res.invites });
      if (res.items.length) {
        res.items
          .slice()
          .reverse()
          .forEach((n) => show(n));
        setVersion((v) => v + 1);
      }
      last.current = Math.max(res.newest, after ?? 0);
    } catch {
      // Sem conexão: tenta de novo no próximo ciclo.
    } finally {
      busy.current = false;
    }
  }, [show]);

  // Ciclo de consulta: 6 s com a aba visível, 30 s em segundo plano.
  useEffect(() => {
    poll();
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(
        async () => {
          await poll();
          loop();
        },
        document.visibilityState === 'visible' ? 6000 : 30000,
      );
    };
    loop();
    const onVis = () => document.visibilityState === 'visible' && poll();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [poll]);

  // Service worker: registra e recebe pushes enquanto a aba está em foco.
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setPushState(ios && !standalone ? 'ios-install' : 'unsupported');
      return;
    }
    if (!VAPID) setPushState('no-key');
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      if (!VAPID) return;
      if (Notification.permission === 'denied') return setPushState('denied');
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        setPushState('on');
        api('/api/push', { body: sub.toJSON() }).catch(() => {});
      } else setPushState('off');
    });
    const onMsg = (e: MessageEvent) => e.data?.type === 'push' && poll();
    navigator.serviceWorker.addEventListener('message', onMsg);
    return () => navigator.serviceWorker.removeEventListener('message', onMsg);
  }, [poll]);

  const enablePush = useCallback(async () => {
    if (!VAPID) return setPushState('no-key');
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') return setPushState(perm === 'denied' ? 'denied' : 'off');
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID) });
    await api('/api/push', { body: sub.toJSON() });
    setPushState('on');
  }, []);

  const disablePush = useCallback(async () => {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await api('/api/push', { method: 'DELETE', body: { endpoint: sub.endpoint } }).catch(() => {});
      await sub.unsubscribe();
    }
    setPushState('off');
  }, []);

  const respond = async (t: Toast, action: 'accept' | 'decline') => {
    dismiss(t.key);
    await api(`/api/invites/${t.n.invite_id}`, { method: 'PATCH', body: { action } }).catch(() => {});
    poll();
    setVersion((v) => v + 1);
  };

  const open = (t: Toast) => {
    dismiss(t.key);
    const n = t.n;
    if (n.post_id) router.push(`/post/${n.post_id}`);
    else if (n.type.startsWith('invite')) router.push('/convites');
    else if (n.type === 'friend_request') router.push('/amigos');
    else if (n.actor) router.push(`/u/${n.actor.code}`);
  };

  return (
    <Ctx.Provider value={{ ...counts, refresh: poll, pushState, enablePush, disablePush, version }}>
      {children}
      <div className="toasts" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.key}
              layout
              className={`toast ${t.n.type === 'invite' ? 'toast-invite' : ''}`}
              initial={{ opacity: 0, y: -24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, transition: { duration: 0.25, ease: [0.45, 0, 0.55, 1] } }}
              transition={SPRING}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.6}
              onDragEnd={(_, info) => Math.abs(info.offset.x) > 90 && dismiss(t.key)}
            >
              {t.n.type === 'invite' ? (
                <motion.div className="icon-box pulse-ring" style={{ background: 'var(--harvest)', color: '#2a1f00', borderRadius: 14 }} animate={{ rotate: [0, -10, 10, -6, 6, 0] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.6 }}>
                  <Gamepad2 size={22} />
                </motion.div>
              ) : (
                <Avatar user={t.n.actor} size={40} />
              )}
              <div className="grow" style={{ cursor: 'pointer' }} onClick={() => open(t)}>
                <div className="bold small">{t.n.type === 'invite' ? 'Convite para jogar' : t.n.actor?.name ?? 'AgroGestor'}</div>
                <div className="small muted" style={{ lineHeight: 1.4 }}>
                  {t.n.text}
                </div>
                {t.n.type === 'invite' && t.n.invite_id && (
                  <div className="row" style={{ marginTop: 10 }} onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-sm btn-harvest" onClick={() => respond(t, 'accept')}>
                      Bora jogar!
                    </button>
                    <button className="btn btn-sm btn-ghost" style={{ background: 'transparent', color: '#fff', borderColor: 'rgb(255 255 255 / .3)' }} onClick={() => respond(t, 'decline')}>
                      Agora não
                    </button>
                  </div>
                )}
              </div>
              <button className="btn btn-icon btn-sm" style={{ width: 28, height: 28, color: 'inherit' }} onClick={() => dismiss(t.key)} aria-label="Fechar">
                <X size={16} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
