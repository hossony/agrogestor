'use client';

import { Award, CheckCheck, Gamepad2, Heart, MessageCircle, Repeat2, UserPlus } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect } from 'react';
import useSWR from 'swr';
import { useLive } from '@/components/Live';
import PushCard from '@/components/PushCard';
import { Avatar, Empty, listItem, Spinner } from '@/components/ui';
import { api, fetcher, timeAgo } from '@/lib/client';
import type { Notification } from '@/lib/types';

const ICON: Record<string, React.ReactNode> = {
  like: <Heart size={13} fill="currentColor" color="var(--like)" />,
  fire: <span style={{ fontSize: 12 }}>🔥</span>,
  comment: <MessageCircle size={13} color="var(--sell)" />,
  reply: <MessageCircle size={13} color="var(--sell)" />,
  friend_request: <UserPlus size={13} color="var(--primary)" />,
  friend_accept: <UserPlus size={13} color="var(--primary)" />,
  invite: <Gamepad2 size={13} color="var(--harvest-ink)" />,
  invite_accept: <Gamepad2 size={13} color="var(--primary)" />,
  invite_decline: <Gamepad2 size={13} color="var(--muted)" />,
  follow: <UserPlus size={13} color="var(--sell)" />,
  badge: <Award size={13} color="var(--harvest-ink)" />,
  repost: <Repeat2 size={13} color="#11a36a" />,
};

function href(n: Notification) {
  if (n.post_id) return `/post/${n.post_id}`;
  if (n.type.startsWith('invite')) return '/convites';
  if (n.type === 'friend_request') return '/amigos';
  if (n.type === 'badge') return '/perfil';
  return n.actor ? `/u/${n.actor.code}` : '/feed';
}

export default function NotificationsPage() {
  const live = useLive();
  const { data, mutate } = useSWR<{ items: Notification[] }>('/api/notifications', fetcher);

  useEffect(() => {
    mutate();
  }, [live.version, mutate]);

  // Ao abrir a tela, marca tudo como lido (com um pequeno atraso para o destaque aparecer).
  useEffect(() => {
    if (!data?.items.some((n) => !n.read)) return;
    const t = setTimeout(async () => {
      await api('/api/notifications', { body: {} }).catch(() => {});
      live.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [data, live.refresh]);

  return (
    <div className="page stack">
      <div className="page-head">
        <div>
          <h1>Avisos</h1>
          <p>Curtidas, foguinhos, comentários, amizades e convites.</p>
        </div>
        <button
          className="btn btn-sm btn-ghost"
          onClick={async () => {
            await api('/api/notifications', { body: {} });
            mutate();
            live.refresh();
          }}
        >
          <CheckCheck size={16} /> Marcar como lidas
        </button>
      </div>
      <PushCard compact />
      {!data && (
        <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
          <Spinner />
        </div>
      )}
      {data && data.items.length === 0 && (
        <div className="card">
          <Empty emoji="🔔" title="Nenhum aviso ainda">
            Quando alguém curtir, comentar ou te chamar para jogar, aparece aqui.
          </Empty>
        </div>
      )}
      {data && data.items.length > 0 && (
        <div className="card list" style={{ overflow: 'hidden' }}>
          <AnimatePresence initial={false}>
            {data.items.map((n, i) => (
              <motion.div key={n.id} variants={listItem} initial="hidden" animate="show" custom={i}>
                <Link href={href(n)} className="list-item" style={{ background: n.read ? undefined : 'color-mix(in srgb, var(--primary-soft) 55%, transparent)', transition: 'background .6s var(--ease)' }}>
                  <span style={{ position: 'relative' }}>
                    <Avatar user={n.actor} size={44} />
                    <span style={{ position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: '50%', background: 'var(--surface)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-sm)' }}>{ICON[n.type]}</span>
                  </span>
                  <div className="grow">
                    <div className="small" style={{ lineHeight: 1.4 }}>
                      {n.text}
                    </div>
                    <div className="tiny faint">
                      {timeAgo(n.created_at)}
                      {n.type === 'invite' && n.invite_status && n.invite_status !== 'pending' && ` · ${n.invite_status === 'accepted' ? 'você aceitou' : n.invite_status === 'declined' ? 'você recusou' : 'cancelado'}`}
                    </div>
                  </div>
                  {!n.read && <span className="dot" style={{ background: 'var(--fire)', width: 9, height: 9 }} />}
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
