'use client';

import { Gamepad2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { UserLite } from '@/lib/types';
import { Avatar, EASE, Modal, SPRING, Spinner } from './ui';

const GAMES = ['Farming Simulator 25', 'Farming Simulator 22', 'Farming Simulator 19'];
const LAST = 'ag:ultimo-convite';

/** Janela para chamar um amigo para jogar (sem chat: só o convite e os dados do servidor). */
export default function InviteDialog({ friend, onClose }: { friend: UserLite | null; onClose: () => void }) {
  const [game, setGame] = useState(GAMES[0]);
  const [server, setServer] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!friend) return;
    setState('idle');
    setError('');
    setMessage('');
    try {
      const saved = JSON.parse(localStorage.getItem(LAST) || '{}');
      if (saved.game) setGame(saved.game);
      if (saved.server) setServer(saved.server);
      if (saved.password) setPassword(saved.password);
    } catch {}
  }, [friend]);

  const send = async () => {
    if (!friend) return;
    setState('busy');
    setError('');
    try {
      await api('/api/invites', { body: { to: friend.id, game, server, password, message } });
      try {
        localStorage.setItem(LAST, JSON.stringify({ game, server, password }));
      } catch {}
      setState('sent');
      setTimeout(onClose, 1600);
    } catch (e) {
      setError((e as Error).message);
      setState('idle');
    }
  };

  return (
    <Modal open={Boolean(friend)} onClose={onClose} label="Chamar para jogar">
      <AnimatePresence mode="wait" initial={false}>
        {state === 'sent' ? (
          <motion.div key="sent" className="stack" style={{ alignItems: 'center', textAlign: 'center', padding: '24px 0' }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={SPRING}>
            <motion.div style={{ fontSize: 56 }} initial={{ rotate: -30, scale: 0.4 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }}>
              🚜
            </motion.div>
            <h2>Convite enviado!</h2>
            <p className="muted" style={{ margin: 0 }}>
              {friend?.name} vai receber o aviso agora.
            </p>
          </motion.div>
        ) : (
          <motion.div key="form" className="stack" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
            <div className="row">
              <Avatar user={friend} size={48} />
              <div>
                <h2>Chamar {friend?.name.split(' ')[0]} para jogar</h2>
                <div className="small muted">Ele recebe um aviso na tela e no celular.</div>
              </div>
            </div>
            <div>
              <label className="label">Jogo</label>
              <div className="chips">
                {GAMES.map((g) => (
                  <button key={g} className="chip" data-active={game === g} onClick={() => setGame(g)}>
                    {g.replace('Farming Simulator', 'FS')}
                  </button>
                ))}
              </div>
            </div>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="grow">
                <label className="label" htmlFor="inv-server">
                  Servidor <span className="faint">(opcional)</span>
                </label>
                <input id="inv-server" className="input" value={server} onChange={(e) => setServer(e.target.value)} placeholder="Nome da partida" maxLength={80} />
              </div>
              <div style={{ width: 130 }}>
                <label className="label" htmlFor="inv-pass">
                  Senha
                </label>
                <input id="inv-pass" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="opcional" maxLength={40} />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="inv-msg">
                Recado <span className="faint">(opcional)</span>
              </label>
              <input id="inv-msg" className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Bora colher o trigo antes da chuva!" maxLength={200} />
            </div>
            {error && <div className="error">{error}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-harvest" onClick={send} disabled={state === 'busy'}>
                {state === 'busy' ? <Spinner size={16} /> : <Gamepad2 size={17} />} Chamar para jogar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}
