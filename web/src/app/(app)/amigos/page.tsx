'use client';

import { Check, Gamepad2, UserPlus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import InviteDialog from '@/components/InviteDialog';
import { useLive } from '@/components/Live';
import { Avatar, CopyCode, EASE, Empty, listItem, Spinner } from '@/components/ui';
import { api, fetcher, timeAgo, useMe } from '@/lib/client';
import type { UserLite } from '@/lib/types';

type Friend = UserLite & { bio: string; has_farm: boolean; farm_name: string | null; since: string };
interface Lists {
  friends: Friend[];
  received: Friend[];
  sent: Friend[];
}

export default function FriendsPage() {
  const { data: me } = useMe();
  const live = useLive();
  const { data, mutate, isLoading } = useSWR<Lists>('/api/friends', fetcher);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [invite, setInvite] = useState<UserLite | null>(null);

  useEffect(() => {
    mutate();
  }, [live.version, mutate]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await api<{ status: string; name: string }>('/api/friends', { body: { code } });
      setMsg({ ok: true, text: r.status === 'accepted' ? `Agora você e ${r.name} são amigos! 🎉` : `Pedido enviado para ${r.name}.` });
      setCode('');
      mutate();
      live.refresh();
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    }
    setBusy(false);
  };

  const act = async (id: string, action: 'accept' | 'decline' | 'remove') => {
    if (action === 'remove' && !confirm('Desfazer a amizade?')) return;
    if (action === 'remove') await api(`/api/friends/${id}`, { method: 'DELETE' });
    else await api(`/api/friends/${id}`, { method: 'PATCH', body: { action } });
    mutate();
    live.refresh();
  };

  return (
    <div className="page-wide stack">
      <div className="page-head">
        <div>
          <h1>Amigos</h1>
          <p>Adicione pelo ID e veja a fazenda dos seus amigos.</p>
        </div>
      </div>

      <div className="card card-pad" style={{ background: 'linear-gradient(135deg, var(--surface), var(--primary-soft))' }}>
        <div className="row wrap" style={{ justifyContent: 'space-between', gap: 18 }}>
          <div>
            <div className="small bold muted">SEU ID</div>
            <div className="row" style={{ marginTop: 4 }}>
              {me && <CopyCode code={me.code} />}
              <span className="small muted">Mande para os amigos te adicionarem</span>
            </div>
          </div>
          <form onSubmit={add} className="row grow" style={{ maxWidth: 420, minWidth: 260 }}>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="ID do amigo, ex.: AG-7K3P9Q" aria-label="ID do amigo" autoCapitalize="characters" />
            <button className="btn" disabled={busy}>
              {busy ? <Spinner size={16} /> : <UserPlus size={17} />} Adicionar
            </button>
          </form>
        </div>
        <AnimatePresence>
          {msg && (
            <motion.div className={msg.ok ? 'ok' : 'error'} style={{ marginTop: 12 }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
              {msg.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {data && data.received.length > 0 && (
          <motion.section key="recv" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
            <div className="section-title">Pedidos recebidos</div>
            <div className="friend-grid">
              <AnimatePresence>
                {data.received.map((f, i) => (
                  <motion.div key={f.id} layout className="card card-pad row" variants={listItem} initial="hidden" animate="show" exit="exit" custom={i}>
                    <Link href={`/u/${f.code}`}>
                      <Avatar user={f} size={46} />
                    </Link>
                    <Link href={`/u/${f.code}`} className="grow">
                      <div className="bold ellipsis">{f.name}</div>
                      <div className="tiny muted">pediu há {timeAgo(f.since)}</div>
                    </Link>
                    <button className="btn btn-sm" onClick={() => act(f.id, 'accept')} aria-label="Aceitar">
                      <Check size={16} />
                    </button>
                    <button className="btn btn-sm btn-ghost" onClick={() => act(f.id, 'decline')} aria-label="Recusar">
                      <X size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <section>
        <div className="section-title">Meus amigos {data ? `(${data.friends.length})` : ''}</div>
        {isLoading && (
          <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
            <Spinner />
          </div>
        )}
        {data && data.friends.length === 0 && (
          <div className="card">
            <Empty emoji="🤝" title="Nenhum amigo ainda">
              Peça o ID de um amigo e adicione aqui em cima.
            </Empty>
          </div>
        )}
        <div className="friend-grid">
          <AnimatePresence>
            {data?.friends.map((f, i) => (
              <motion.div key={f.id} layout className="card" variants={listItem} initial="hidden" animate="show" exit="exit" custom={i} whileHover={{ y: -3 }} transition={{ duration: 0.25 }}>
                <Link href={`/u/${f.code}`} className="row card-pad" style={{ paddingBottom: 10 }}>
                  <Avatar user={f} size={50} />
                  <div className="grow">
                    <div className="bold ellipsis">{f.name}</div>
                    <div className="tiny muted ellipsis">@{f.username}</div>
                    {f.farm_name && <div className="tiny ellipsis" style={{ color: 'var(--primary)', fontWeight: 700 }}>🏡 {f.farm_name}</div>}
                  </div>
                </Link>
                <div className="row" style={{ padding: '0 18px 16px' }}>
                  <button className="btn btn-sm btn-harvest grow" onClick={() => setInvite(f)}>
                    <Gamepad2 size={15} /> Chamar para jogar
                  </button>
                  <Link href={`/u/${f.code}`} className="btn btn-sm btn-ghost">
                    Fazenda
                  </Link>
                  <button className="btn btn-sm btn-icon" onClick={() => act(f.id, 'remove')} aria-label="Desfazer amizade" title="Desfazer amizade">
                    <X size={15} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {data && data.sent.length > 0 && (
        <section>
          <div className="section-title">Pedidos enviados</div>
          <div className="card list">
            {data.sent.map((f) => (
              <div key={f.id} className="list-item">
                <Avatar user={f} size={36} />
                <div className="grow">
                  <div className="bold small">{f.name}</div>
                  <div className="tiny muted">aguardando · {timeAgo(f.since)}</div>
                </div>
                <button className="btn btn-sm btn-ghost" onClick={() => act(f.id, 'remove')}>
                  Cancelar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <InviteDialog friend={invite} onClose={() => setInvite(null)} />
    </div>
  );
}
