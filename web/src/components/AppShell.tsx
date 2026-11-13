'use client';

import { Bell, ClipboardList, Flame, Gamepad2, LogOut, Settings, Sparkles, Tractor, UserRound, Users } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SWRConfig } from 'swr';
import type { Me } from '@/lib/auth';
import { api } from '@/lib/client';
import { Badges } from './Badges';
import { LiveProvider, useLive } from './Live';
import { Avatar, SPRING } from './ui';

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number }>; badge?: 'unread' | 'friends' | 'invites' | 'news' };

const MAIN: Item[] = [
  { href: '/feed', label: 'Feed', icon: Flame },
  { href: '/amigos', label: 'Amigos', icon: Users, badge: 'friends' },
  { href: '/convites', label: 'Jogar', icon: Gamepad2, badge: 'invites' },
  { href: '/notificacoes', label: 'Avisos', icon: Bell, badge: 'unread' },
];

function Badge({ n }: { n: number }) {
  return (
    <AnimatePresence>
      {n > 0 && (
        <motion.span className="nav-badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={SPRING}>
          {n > 99 ? '99+' : n}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/** Ponto nas Novidades quando saiu uma versão que a pessoa ainda não viu. */
function useNews() {
  const [n, setN] = useState(0);
  useEffect(() => {
    fetch('/api/changelog')
      .then((r) => r.json())
      .then((d: { latest: string }) => {
        try {
          setN(localStorage.getItem('ag:novidades-vistas') === d.latest ? 0 : 1);
        } catch {
          setN(0);
        }
      })
      .catch(() => {});
  }, []);
  return n;
}

function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const live = useLive();
  const news = useNews();
  const count = (b?: Item['badge']) => (b === 'unread' ? live.unread : b === 'friends' ? live.friend_requests : b === 'invites' ? live.invites : b === 'news' ? (path === '/novidades' ? 0 : news) : 0);
  const active = (href: string) => path === href || path.startsWith(href + '/') || (href === `/u/${me.code}` && path === '/perfil');
  const profile: Item = { href: `/u/${me.code}`, label: 'Perfil', icon: UserRound };
  const SIDE: Item[] = [...MAIN, profile, { href: '/fazenda', label: 'Minha fazenda', icon: Tractor }, { href: '/novidades', label: 'Novidades', icon: Sparkles, badge: 'news' }];

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/entrar');
    router.refresh();
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/feed" className="brand">
          <span className="brand-mark">🌾</span>
          <span>
            AgroSocial
            <small style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--sidebar-ink)', letterSpacing: 0 }}>a rede do AgroGestor</small>
          </span>
        </Link>
        <a href="/gestao" className="switch-btn" style={{ margin: '0 4px 14px' }}>
          <ClipboardList size={18} /> Gestão da fazenda
        </a>
        <LayoutGroup id="side">
          {SIDE.map((it) => {
            const on = active(it.href);
            return (
              <Link key={it.href} href={it.href} className="nav-link" data-active={on}>
                {on && <motion.span layoutId="side-pill" className="nav-pill" transition={SPRING} />}
                <it.icon size={19} />
                <span>{it.label}</span>
                {it.badge && <Badge n={count(it.badge)} />}
              </Link>
            );
          })}
        </LayoutGroup>
        <div className="sidebar-foot">
          <Link href="/perfil" className="nav-link" data-active={path === '/perfil'}>
            <Settings size={19} />
            <span>Editar perfil</span>
          </Link>
          <button className="nav-link" style={{ border: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }} onClick={logout}>
            <LogOut size={19} />
            <span>Sair</span>
          </button>
          <Link href={`/u/${me.code}`} className="sidebar-me" style={{ marginTop: 8 }}>
            <Avatar user={me} size={36} />
            <span className="grow" style={{ minWidth: 0 }}>
              <span className="row" style={{ gap: 5 }}>
                <span className="bold ellipsis">{me.name}</span>
                <Badges ids={me.badges} max={2} />
              </span>
              <small>{me.code}</small>
            </span>
          </Link>
        </div>
      </aside>

      <header className="topbar">
        <Link href="/feed" className="brand">
          <span className="brand-mark" style={{ width: 30, height: 30, fontSize: 16 }}>
            🌾
          </span>
          AgroSocial
        </Link>
        <div className="row" style={{ gap: 4 }}>
          <a href="/gestao" className="switch-btn" style={{ height: 34, padding: '0 10px', fontSize: 12.5 }} aria-label="Gestão da fazenda">
            <ClipboardList size={16} /> Gestão
          </a>
          <Link href="/novidades" className="btn btn-icon" aria-label="Novidades" style={{ position: 'relative' }}>
            <Sparkles size={20} />
            {count('news') > 0 && <span className="dot" style={{ position: 'absolute', top: 6, right: 6, background: 'var(--fire)', width: 8, height: 8 }} />}
          </Link>
          <Link href="/perfil" className="btn btn-icon" aria-label="Editar perfil">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      <main className="main">{children}</main>

      <nav className="tabbar">
        <LayoutGroup id="tabs">
          {[...MAIN, profile].map((it) => {
            const on = active(it.href);
            return (
              <Link key={it.href} href={it.href} className="tab" data-active={on}>
                {on && <motion.span layoutId="tab-pill" className="tab-pill" transition={SPRING} />}
                <motion.span animate={{ y: on ? -1 : 0, scale: on ? 1.08 : 1 }} transition={SPRING}>
                  <it.icon size={21} />
                </motion.span>
                <span>{it.label}</span>
                {it.badge && <Badge n={count(it.badge)} />}
              </Link>
            );
          })}
        </LayoutGroup>
      </nav>
    </div>
  );
}

export default function AppShell({ me, children }: { me: Me; children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fallback: { '/api/me': me } }}>
      <LiveProvider>
        <Shell me={me}>{children}</Shell>
      </LiveProvider>
    </SWRConfig>
  );
}
