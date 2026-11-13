'use client';

import { Gamepad2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { fetcher, money, num, timeAgo } from '@/lib/client';
import type { UserLite } from '@/lib/types';
import { Badges } from './Badges';
import InviteDialog from './InviteDialog';
import { useLive } from './Live';
import { PlatformIcon, platformLabel } from './Platform';
import { Avatar, EASE_OUT } from './ui';

export type FriendRow = UserLite & {
  bio: string;
  banner_url: string | null;
  online: boolean;
  last_seen_at: string | null;
  farm_name: string | null;
  summary: { worth: number; currency: string; machines: number; area: number } | null;
};

/** Avatar com a bolinha verde (online) ou cinza (offline). */
export function PresenceAvatar({ user, online, size = 36 }: { user: UserLite; online: boolean; size?: number }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <Avatar user={user} size={size} />
      <span className="online-dot" data-on={online} aria-label={online ? 'Online' : 'Offline'} />
    </span>
  );
}

/** Cartão que aparece ao passar o mouse sobre um amigo (como no Discord). */
function HoverCard({ f, rect, onInvite, onEnter, onLeave }: { f: FriendRow; rect: DOMRect; onInvite: () => void; onEnter: () => void; onLeave: () => void }) {
  const top = Math.min(Math.max(12, rect.top - 40), window.innerHeight - 330);
  const left = rect.left - 312;
  return (
    <motion.div
      className="hover-card"
      style={{ top, left }}
      initial={{ opacity: 0, x: 12, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 8, scale: 0.98, transition: { duration: 0.15 } }}
      transition={EASE_OUT}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <div className="hc-banner" style={f.banner_url ? { backgroundImage: `url(${f.banner_url})` } : undefined} />
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ marginTop: -28, display: 'inline-block', borderRadius: '50%', border: '4px solid var(--surface)', background: 'var(--surface)' }}>
          <PresenceAvatar user={f} online={f.online} size={56} />
        </div>
        <div className="row" style={{ gap: 6, marginTop: 4 }}>
          <span className="bold" style={{ fontSize: 16 }}>
            {f.name}
          </span>
          <Badges ids={f.badges} max={3} />
        </div>
        <div className="row tiny muted" style={{ gap: 6 }}>
          <span>@{f.username}</span>
          {f.platform && (
            <span className="row" style={{ gap: 4 }}>
              · <PlatformIcon id={f.platform} size={13} /> {platformLabel(f.platform)}
            </span>
          )}
        </div>
        <div className="tiny" style={{ marginTop: 4, color: f.online ? '#23a55a' : 'var(--muted)', fontWeight: 700 }}>
          {f.online ? '● Online agora' : f.last_seen_at ? `Visto há ${timeAgo(f.last_seen_at)}` : 'Offline'}
        </div>
        {f.summary ? (
          <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
            <div className="stat" style={{ padding: '8px 10px' }}>
              <div className="k" style={{ fontSize: 10.5 }}>
                Patrimônio
              </div>
              <div className="v" style={{ fontSize: 15 }}>
                {money(f.summary.worth, f.summary.currency)}
              </div>
            </div>
            <div className="stat" style={{ padding: '8px 10px' }}>
              <div className="k" style={{ fontSize: 10.5 }}>
                Máquinas
              </div>
              <div className="v" style={{ fontSize: 15 }}>
                {num(f.summary.machines)}
              </div>
            </div>
          </div>
        ) : (
          <div className="tiny muted" style={{ marginTop: 10 }}>
            {f.farm_name ? '🔒 Fazenda privada' : 'Ainda não publicou a fazenda.'}
          </div>
        )}
        {f.farm_name && f.summary && (
          <div className="tiny" style={{ marginTop: 8, color: 'var(--primary)', fontWeight: 700 }}>
            🏡 {f.farm_name}
          </div>
        )}
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn btn-sm btn-harvest grow" onClick={onInvite}>
            <Gamepad2 size={15} /> Chamar pra jogar
          </button>
          <Link href={`/u/${f.code}`} className="btn btn-sm btn-ghost">
            Perfil
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/** Coluna da direita: amigos online e offline (telas largas). */
export default function PresenceRail() {
  const live = useLive();
  const { data, mutate } = useSWR<{ friends: FriendRow[] }>('/api/friends', fetcher, { refreshInterval: 30000 });
  const [hover, setHover] = useState<{ f: FriendRow; rect: DOMRect } | null>(null);
  const [invite, setInvite] = useState<UserLite | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mutate();
  }, [live.version, mutate]);

  const show = (f: FriendRow, el: HTMLElement) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover({ f, rect: el.getBoundingClientRect() }), 180);
  };
  const hide = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHover(null), 160);
  };
  const keep = () => timer.current && clearTimeout(timer.current);

  const friends = data?.friends ?? [];
  const online = friends.filter((f) => f.online);
  const offline = friends.filter((f) => !f.online);

  const Item = ({ f }: { f: FriendRow }) => (
    <Link href={`/u/${f.code}`} className="presence-item" data-online={f.online} onMouseEnter={(e) => show(f, e.currentTarget)} onMouseLeave={hide}>
      <PresenceAvatar user={f} online={f.online} />
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="row" style={{ gap: 5 }}>
          <span className="bold small ellipsis">{f.name}</span>
          {f.platform && <PlatformIcon id={f.platform} size={13} />}
        </span>
        <span className="tiny muted ellipsis" style={{ display: 'block' }}>
          {f.online ? (f.farm_name ? `🏡 ${f.farm_name}` : 'Online') : f.last_seen_at ? `visto há ${timeAgo(f.last_seen_at)}` : 'offline'}
        </span>
      </span>
    </Link>
  );

  return (
    <aside className="presence" aria-label="Amigos online">
      <div className="section-title" style={{ marginTop: 0 }}>
        Online — {online.length}
      </div>
      {online.length === 0 && <div className="tiny muted" style={{ padding: '0 8px 8px' }}>Nenhum amigo online agora.</div>}
      {online.map((f) => (
        <Item key={f.id} f={f} />
      ))}
      <div className="section-title">Offline — {offline.length}</div>
      {offline.map((f) => (
        <Item key={f.id} f={f} />
      ))}
      {data && !friends.length && (
        <div className="tiny muted" style={{ padding: '0 8px' }}>
          Adicione amigos pelo ID para ver quem está online.{' '}
          <Link href="/amigos" style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Adicionar
          </Link>
        </div>
      )}
      <AnimatePresence>{hover && <HoverCard key={hover.f.id} f={hover.f} rect={hover.rect} onEnter={keep} onLeave={hide} onInvite={() => (setInvite(hover.f), setHover(null))} />}</AnimatePresence>
      <InviteDialog friend={invite} onClose={() => setInvite(null)} />
    </aside>
  );
}
