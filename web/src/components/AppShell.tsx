'use client';

import { Bell, ClipboardList, Flame, Gamepad2, LogOut, Settings, Tractor, UserRound, Users } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { SWRConfig } from 'swr';
import type { Me } from '@/lib/auth';
import { api } from '@/lib/client';
import { LiveProvider, useLive } from './Live';
import { Avatar, SPRING } from './ui';

type Item = { href: string; label: string; icon: React.ComponentType<{ size?: number }>; badge?: 'unread' | 'friends' | 'invites' };

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

function Shell({ me, children }: { me: Me; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const live = useLive();
  const count = (b?: Item['badge']) => (b === 'unread' ? live.unread : b === 'friends' ? live.friend_requests : b === 'invites' ? live.invites : 0);
  const active = (href: string) => path === href || path.startsWith(href + '/') || (href === `/u/${me.code}` && path === '/perfil');
  const profile: Item = { href: `/u/${me.code}`, label: 'Perfil', icon: UserRound };

  const logout = async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    router.replace('/entrar');
    router.refresh();
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link href="/feed" className="brand">
          <span className="brand-mark">🌾</span> AgroGestor
        </Link>
        <LayoutGroup id="side">
          {([...MAIN, profile, { href: '/fazenda', label: 'Minha fazenda', icon: Tractor }] as Item[]).map((it) => {
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
        <a href="/gestao" className="nav-link">
          <ClipboardList size={19} />
          <span>Gestão da fazenda</span>
        </a>
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
            <span className="grow">
              <span className="bold ellipsis" style={{ display: 'block' }}>
                {me.name}
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
          AgroGestor
        </Link>
        <div className="row" style={{ gap: 2 }}>
          <Link href="/fazenda" className="btn btn-icon" aria-label="Minha fazenda">
            <Tractor size={20} />
          </Link>
          <a href="/gestao" className="btn btn-icon" aria-label="Gestão da fazenda">
            <ClipboardList size={20} />
          </a>
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
