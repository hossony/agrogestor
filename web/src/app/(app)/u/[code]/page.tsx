'use client';

import { Check, Gamepad2, Lock, Pencil, UserMinus, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import FarmView from '@/components/FarmView';
import InviteDialog from '@/components/InviteDialog';
import PostCard from '@/components/PostCard';
import { Avatar, CopyCode, EASE_OUT, Empty, listItem, Segmented, Spinner } from '@/components/ui';
import { api, fetcher } from '@/lib/client';
import type { FarmSnapshot } from '@/lib/farm';
import type { Post, Relation, UserLite } from '@/lib/types';

interface Profile {
  user: UserLite & { bio: string; banner_url: string | null; created_at: string };
  relation: Relation;
  stats: { posts: number; friends: number; fires: number };
  hasFarm: boolean;
  farm: FarmSnapshot | null;
  farmUpdatedAt: string | null;
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

export default function ProfilePage() {
  const { code } = useParams<{ code: string }>();
  const { data, error, mutate } = useSWR<Profile>(`/api/users/${code}`, fetcher);
  const [tab, setTab] = useState<'fazenda' | 'posts'>('fazenda');
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<UserLite | null>(null);

  if (error) return <Empty emoji="🧐" title={error.message} />;
  if (!data)
    return (
      <div className="row" style={{ justifyContent: 'center', padding: 60 }}>
        <Spinner />
      </div>
    );
  const { user, relation, stats } = data;

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
            </div>
          </div>
          <h1 style={{ margin: '10px 0 0', fontSize: 26, letterSpacing: '-0.02em' }}>{user.name}</h1>
          <div className="row wrap" style={{ gap: 8, marginTop: 4 }}>
            <span className="muted">@{user.username}</span>
            <CopyCode code={user.code} />
          </div>
          {user.bio && <p style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap' }}>{user.bio}</p>}
          <div className="row" style={{ gap: 22, marginTop: 14 }}>
            <span>
              <b>{stats.posts}</b> <span className="muted small">postagens</span>
            </span>
            <span>
              <b>{stats.friends}</b> <span className="muted small">amigos</span>
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
          <FarmView farm={data.farm} updatedAt={data.farmUpdatedAt} />
        ) : relation === 'self' ? (
          <div className="card">
            <Empty emoji="🚜" title="Você ainda não publicou a sua fazenda">
              <Link href="/fazenda" className="btn btn-sm" style={{ marginTop: 10 }}>
                Publicar minha fazenda
              </Link>
            </Empty>
          </div>
        ) : data.hasFarm ? (
          <div className="card">
            <Empty emoji="🔒" title="Fazenda visível só para amigos">
              <span className="row" style={{ justifyContent: 'center', gap: 6 }}>
                <Lock size={14} /> Adicione {user.name.split(' ')[0]} para ver plantações, máquinas e animais.
              </span>
            </Empty>
          </div>
        ) : (
          <div className="card">
            <Empty emoji="🌱" title={`${user.name.split(' ')[0]} ainda não publicou a fazenda`} />
          </div>
        ))}
      {tab === 'posts' && <Posts code={user.code} />}

      <InviteDialog friend={invite} onClose={() => setInvite(null)} />
    </div>
  );
}
