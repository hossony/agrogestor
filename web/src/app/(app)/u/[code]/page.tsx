'use client';

import { Award, Check, Gamepad2, Lock, Pencil, UserMinus, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { Badges } from '@/components/Badges';
import FarmView from '@/components/FarmView';
import InviteDialog from '@/components/InviteDialog';
import PostCard from '@/components/PostCard';
import { Avatar, CopyCode, EASE_OUT, Empty, listItem, Modal, Segmented, SPRING, Spinner } from '@/components/ui';
import { BADGES, LINK_SITES, PRIVACY } from '@/lib/badges';
import { api, fetcher, useMe } from '@/lib/client';
import type { FarmSnapshot } from '@/lib/farm';
import type { Post, Relation, UserLite } from '@/lib/types';

interface Profile {
  user: UserLite & { bio: string; banner_url: string | null; created_at: string; links: Record<string, string>; privacy: string };
  relation: Relation;
  stats: { posts: number; friends: number; fires: number; followers: number };
  following: boolean;
  hasFarm: boolean;
  farm: FarmSnapshot | null;
  farmUpdatedAt: string | null;
  farmHidden: 'private' | 'friends' | null;
}

function Posts({ code }: { code: string }) {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const load = useCallback(
    async (p: number) => {
      const r = await api<{ posts: Post[]; more: boolean }>(`/api/posts?sort=new&author=${encodeURIComponent(code)}&page=${p}`);
      setPosts((prev) => (p === 0 ? r.posts : [...(prev ?? []), ...r.posts]));
      setMore(r.more);
      setPage(p);
    },
    [code],
  );
  useEffect(() => {
    load(0);
  }, [load]);
  if (!posts)
    return (
      <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
        <Spinner />
      </div>
    );
  if (!posts.length) return <Empty emoji="📭" title="Nenhuma postagem ainda" />;
  return (
    <div className="stack">
      {posts.map((p, i) => (
        <motion.div key={p.id} variants={listItem} initial="hidden" animate="show" custom={i % 12}>
          <PostCard post={p} onDelete={() => setPosts((l) => l!.filter((x) => x.id !== p.id))} />
        </motion.div>
      ))}
      {more && (
        <button className="btn btn-ghost" onClick={() => load(page + 1)}>
          Ver mais
        </button>
      )}
    </div>
  );
}

/** Janela do dono para conceder selos a alguém. */
function BadgeAdmin({ user, open, onClose, onSaved }: { user: UserLite; open: boolean; onClose: () => void; onSaved: () => void }) {
  const [sel, setSel] = useState<string[]>(user.badges);
  const [busy, setBusy] = useState(false);
  useEffect(() => setSel(user.badges), [user.badges, open]);
  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/users/${user.code}/badges`, { method: 'PATCH', body: { badges: sel } });
      onSaved();
      onClose();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} label="Selos">
      <h2>Selos de {user.name}</h2>
      <p className="small muted" style={{ marginTop: 0 }}>
        Só você (dono) vê esta janela. O selo de dono não pode ser dado a outras pessoas.
      </p>
      <div className="stack" style={{ gap: 8 }}>
        {BADGES.filter((b) => b.id !== 'owner').map((b) => {
          const on = sel.includes(b.id);
          return (
            <label key={b.id} className="radio-card" data-on={on}>
              <input type="checkbox" checked={on} onChange={() => setSel((s) => (on ? s.filter((x) => x !== b.id) : [...s, b.id]))} />
              <span className="grow">
                <span className="row" style={{ gap: 8 }}>
                  <Badges ids={[b.id]} size="md" />
                </span>
                <span className="small muted" style={{ display: 'block', marginTop: 4 }}>
                  {b.desc}
                </span>
              </span>
            </label>
          );
        })}
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn" onClick={save} disabled={busy}>
          {busy ? <Spinner size={15} /> : <Award size={16} />} Salvar selos
        </button>
      </div>
    </Modal>
  );
}

export default function ProfilePage() {
  const { code } = useParams<{ code: string }>();
  const { data: me } = useMe();
  const { data, error, mutate } = useSWR<Profile>(`/api/users/${code}`, fetcher);
  const [tab, setTab] = useState<'fazenda' | 'posts'>('fazenda');
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<UserLite | null>(null);
  const [admin, setAdmin] = useState(false);

  if (error) return <Empty emoji="🧐" title={error.message} />;
  if (!data)
    return (
      <div className="row" style={{ justifyContent: 'center', padding: 60 }}>
        <Spinner />
      </div>
    );
  const { user, relation, stats } = data;
  const first = user.name.split(' ')[0];
  const links = LINK_SITES.filter((s) => user.links?.[s.id]);
  const isOwner = Boolean(me?.badges.includes('owner'));

  const friendAction = async (action: 'add' | 'accept' | 'remove') => {
    if (action === 'remove' && !confirm(relation === 'friend' ? 'Desfazer a amizade?' : 'Cancelar o pedido?')) return;
    setBusy(true);
    try {
      if (action === 'add') await api('/api/friends', { body: { code: user.code } });
      else if (action === 'accept') await api(`/api/friends/${user.id}`, { method: 'PATCH', body: { action: 'accept' } });
      else await api(`/api/friends/${user.id}`, { method: 'DELETE' });
      await mutate();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };

  const follow = async () => {
    // Resposta otimista: o número muda na hora.
    const next = !data.following;
    mutate({ ...data, following: next, stats: { ...stats, followers: Math.max(0, stats.followers + (next ? 1 : -1)) } }, { revalidate: false });
    try {
      const r = await api<{ following: boolean; followers: number }>(`/api/users/${user.code}/follow`, { method: 'POST' });
      mutate({ ...data, following: r.following, stats: { ...stats, followers: r.followers } }, { revalidate: false });
    } catch (e) {
      mutate();
      alert((e as Error).message);
    }
  };

  return (
    <div className="page-wide stack" style={{ maxWidth: 900 }}>
      <motion.div className="card" style={{ overflow: 'hidden' }} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={EASE_OUT}>
        <motion.div className="banner" initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {user.banner_url && <img src={user.banner_url} alt="" />}
        </motion.div>
        <div className="profile-head">
          <div className="row wrap" style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.15 }}>
              <span className="profile-avatar avatar" style={{ display: 'inline-block', borderRadius: '50%' }}>
                <Avatar user={user} size={104} />
              </span>
            </motion.div>
            <div className="row wrap" style={{ paddingTop: 12 }}>
              {relation === 'self' && (
                <Link href="/perfil" className="btn btn-ghost btn-sm">
                  <Pencil size={15} /> Editar perfil
                </Link>
              )}
              {relation !== 'self' && (
                <motion.button className={`btn btn-sm ${data.following ? 'btn-ghost' : 'btn-soft'}`} onClick={follow} whileTap={{ scale: 0.94 }} transition={SPRING}>
                  {data.following ? <Check size={15} /> : <UserPlus size={15} />} {data.following ? 'Seguindo' : 'Seguir'}
                </motion.button>
              )}
              {relation === 'friend' && (
                <>
                  <button className="btn btn-harvest btn-sm" onClick={() => setInvite(user)}>
                    <Gamepad2 size={16} /> Chamar para jogar
                  </button>
                  <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => friendAction('remove')} title="Desfazer amizade">
                    <Check size={15} /> Amigos
                  </button>
                </>
              )}
              {relation === 'none' && (
                <button className="btn btn-sm" disabled={busy} onClick={() => friendAction('add')}>
                  <UserPlus size={16} /> Adicionar amigo
                </button>
              )}
              {relation === 'sent' && (
                <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => friendAction('remove')}>
                  <UserMinus size={15} /> Pedido enviado
                </button>
              )}
              {relation === 'received' && (
                <button className="btn btn-sm" disabled={busy} onClick={() => friendAction('accept')}>
                  <Check size={16} /> Aceitar pedido
                </button>
              )}
              {isOwner && relation !== 'self' && (
                <button className="btn btn-ghost btn-sm" onClick={() => setAdmin(true)} title="Conceder selos (só o dono vê)">
                  <Award size={15} /> Selos
                </button>
              )}
            </div>
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: 26, letterSpacing: '-0.02em' }}>{user.name}</h1>
          <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
            <Badges ids={user.badges} size="md" />
          </div>
          <div className="row wrap" style={{ gap: 8, marginTop: 6 }}>
            <span className="muted">@{user.username}</span>
            <CopyCode code={user.code} />
            {user.privacy === 'private' && (
              <span className="tag" title="Fazenda e patrimônio privados">
                <Lock size={11} /> privado
              </span>
            )}
          </div>
          {user.bio && <p style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{user.bio}</p>}
          {links.length > 0 && (
            <div className="social-links" style={{ marginTop: 12 }}>
              {links.map((s) => (
                <a key={s.id} className="social-link" href={user.links[s.id]} target="_blank" rel="noopener noreferrer nofollow">
                  <span>{s.emoji}</span> {s.label}
                </a>
              ))}
            </div>
          )}
          <div className="row wrap" style={{ gap: 22, marginTop: 14 }}>
            <span>
              <b>{stats.followers}</b> <span className="muted small">seguidores</span>
            </span>
            <span>
              <b>{stats.friends}</b> <span className="muted small">amigos</span>
            </span>
            <span>
              <b>{stats.posts}</b> <span className="muted small">postagens</span>
            </span>
            <span>
              <b>{stats.fires}</b> <span className="muted small">🔥 recebidos</span>
            </span>
          </div>
        </div>
      </motion.div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: 'fazenda', label: '🏡 Fazenda' },
          { id: 'posts', label: '📝 Postagens' },
        ]}
      />

      {tab === 'fazenda' &&
        (data.farm ? (
          <div className="stack">
            {relation === 'self' && (
              <div className="small muted row" style={{ gap: 6 }}>
                <Lock size={13} /> Visibilidade: <b>{PRIVACY.find((p) => p.id === user.privacy)?.label}</b> ·{' '}
                <Link href="/perfil" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                  mudar
                </Link>
              </div>
            )}
            <FarmView farm={data.farm} updatedAt={data.farmUpdatedAt} />
          </div>
        ) : relation === 'self' ? (
          <div className="card">
            <Empty emoji="🚜" title="Você ainda não publicou a sua fazenda">
              <Link href="/fazenda" className="btn btn-sm" style={{ marginTop: 10 }}>
                Publicar minha fazenda
              </Link>
            </Empty>
          </div>
        ) : data.farmHidden === 'private' ? (
          <div className="card">
            <Empty emoji="🔒" title="Fazenda privada">
              {first} escolheu não mostrar a fazenda e o patrimônio.
            </Empty>
          </div>
        ) : data.hasFarm ? (
          <div className="card">
            <Empty emoji="🔒" title="Fazenda visível só para amigos">
              <span className="row" style={{ justifyContent: 'center', gap: 6 }}>
                <Lock size={14} /> Adicione {first} para ver plantações, máquinas e animais.
              </span>
            </Empty>
          </div>
        ) : (
          <div className="card">
            <Empty emoji="🌱" title={`${first} ainda não publicou a fazenda`} />
          </div>
        ))}
      {tab === 'posts' && <Posts code={user.code} />}

      <InviteDialog friend={invite} onClose={() => setInvite(null)} />
      {isOwner && <BadgeAdmin user={user} open={admin} onClose={() => setAdmin(false)} onSaved={() => mutate()} />}
    </div>
  );
}
