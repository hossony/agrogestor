'use client';

import { Copy, Gamepad2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import useSWR from 'swr';
import InviteDialog from '@/components/InviteDialog';
import { useLive } from '@/components/Live';
import PushCard from '@/components/PushCard';
import { Avatar, Empty, listItem, Segmented, Spinner } from '@/components/ui';
import { api, fetcher, timeAgo } from '@/lib/client';
import type { Invite, UserLite } from '@/lib/types';

const EXPIRE_MS = 3 * 60 * 60 * 1000;

function status(i: Invite) {
  if (i.status === 'pending' && Date.now() - new Date(i.created_at).getTime() > EXPIRE_MS) return { label: 'Expirou', cls: 'tag' };
  return (
    {
      pending: { label: i.incoming ? 'Esperando você' : 'Aguardando resposta', cls: 'tag tag-gold' },
      accepted: { label: 'Aceito', cls: 'tag tag-green' },
      declined: { label: 'Recusado', cls: 'tag tag-red' },
      canceled: { label: 'Cancelado', cls: 'tag' },
    } as const
  )[i.status];
}

function InvitesInner() {
  const live = useLive();
  const params = useSearchParams();
  const highlight = params.get('abrir');
  const { data, mutate } = useSWR<Invite[]>('/api/invites', fetcher);
  const { data: friends } = useSWR<{ friends: UserLite[] }>('/api/friends', fetcher);
  const [tab, setTab] = useState<'in' | 'out'>('in');
  const [invite, setInvite] = useState<UserLite | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    mutate();
  }, [live.version, mutate]);

  const act = async (i: Invite, action: 'accept' | 'decline' | 'cancel') => {
    setBusy(i.id);
    try {
      const next = await api<Invite>(`/api/invites/${i.id}`, { method: 'PATCH', body: { action } });
      mutate((list) => list?.map((x) => (x.id === i.id ? next : x)), { revalidate: false });
      live.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(null);
  };

  const list = (data ?? []).filter((i) => (tab === 'in' ? i.incoming : !i.incoming));

  return (
    <div className="page stack">
      <div className="page-head">
        <div>
          <h1>Bora jogar</h1>
          <p>Chame os amigos para a sua partida. Sem chat: só o convite, direto ao ponto.</p>
        </div>
      </div>

      <PushCard compact />

      <div className="card card-pad">
        <div className="bold" style={{ marginBottom: 10 }}>
          Chamar um amigo
        </div>
        {!friends && <Spinner />}
        {friends && friends.friends.length === 0 && (
          <div className="small muted">
            Você ainda não tem amigos. <Link href="/amigos" style={{ color: 'var(--primary)', fontWeight: 700 }}>Adicione pelo ID</Link>.
          </div>
        )}
        <div className="chips">
          {friends?.friends.map((f) => (
            <motion.button key={f.id} className="chip" style={{ height: 44, paddingLeft: 6 }} onClick={() => setInvite(f)} whileTap={{ scale: 0.95 }}>
              <Avatar user={f} size={32} />
              {f.name.split(' ')[0]}
              <Gamepad2 size={15} color="var(--harvest-ink)" />
            </motion.button>
          ))}
        </div>
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { id: 'in', label: `Recebidos${live.invites ? ` (${live.invites})` : ''}` },
          { id: 'out', label: 'Enviados' },
        ]}
      />

      {!data && (
        <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
          <Spinner />
        </div>
      )}
      {data && list.length === 0 && <Empty emoji="🎮" title={tab === 'in' ? 'Nenhum convite recebido' : 'Você ainda não chamou ninguém'} />}

      <AnimatePresence mode="popLayout" initial={false}>
        {list.map((i, idx) => {
          const other = i.incoming ? i.from : i.to;
          const st = status(i);
          const open = i.status === 'pending' && st.label !== 'Expirou';
          return (
            <motion.div
              key={i.id + tab}
              layout
              className="card card-pad stack"
              style={{ gap: 10, outline: highlight === i.id ? '2px solid var(--harvest)' : undefined }}
              variants={listItem}
              initial="hidden"
              animate="show"
              exit="exit"
              custom={idx}
            >
              <div className="row">
                <Link href={`/u/${other.code}`}>
                  <Avatar user={other} size={44} />
                </Link>
                <div className="grow">
                  <div className="bold">{i.incoming ? `${other.name} chamou você` : `Você chamou ${other.name}`}</div>
                  <div className="tiny muted">
                    {i.game} · {timeAgo(i.created_at)}
                  </div>
                </div>
                <span className={st.cls}>{st.label}</span>
              </div>
              {i.message && <div className="comment-bubble">“{i.message}”</div>}
              {(i.server || i.password) && (
                <div className="row wrap small">
                  {i.server && (
                    <button className="code-pill" onClick={() => navigator.clipboard.writeText(i.server)} title="Copiar">
                      Servidor: {i.server} <Copy size={12} />
                    </button>
                  )}
                  {i.password && (
                    <button className="code-pill" onClick={() => navigator.clipboard.writeText(i.password)} title="Copiar">
                      Senha: {i.password} <Copy size={12} />
                    </button>
                  )}
                </div>
              )}
              {open && (
                <div className="row">
                  {i.incoming ? (
                    <>
                      <button className="btn btn-harvest" disabled={busy === i.id} onClick={() => act(i, 'accept')}>
                        {busy === i.id ? <Spinner size={15} /> : '🚜'} Bora jogar!
                      </button>
                      <button className="btn btn-ghost" disabled={busy === i.id} onClick={() => act(i, 'decline')}>
                        Agora não
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-sm btn-ghost" disabled={busy === i.id} onClick={() => act(i, 'cancel')}>
                      Cancelar convite
                    </button>
                  )}
                </div>
              )}
              {!open && !i.incoming && i.status !== 'canceled' && st.label !== 'Expirou' && (
                <button className="btn btn-sm btn-soft" style={{ alignSelf: 'flex-start' }} onClick={() => setInvite(other)}>
                  <Gamepad2 size={15} /> Chamar de novo
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <InviteDialog
        friend={invite}
        onClose={() => {
          setInvite(null);
          mutate();
          setTab('out');
        }}
      />
    </div>
  );
}

export default function InvitesPage() {
  return (
    <Suspense>
      <InvitesInner />
    </Suspense>
  );
}
