'use client';

import { BellRing } from 'lucide-react';
import { useState } from 'react';
import { useLive } from './Live';
import { Spinner } from './ui';

/** Liga as notificações no celular/computador e explica o que fazer em cada caso. */
export default function PushCard({ compact }: { compact?: boolean }) {
  const { pushState, enablePush, disablePush } = useLive();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const text: Record<string, string> = {
    on: 'Notificações ligadas neste aparelho. Você recebe os convites mesmo com o site fechado.',
    off: 'Ligue para receber os convites para jogar no celular, mesmo com o site fechado.',
    denied: 'As notificações estão bloqueadas no navegador. Libere nas permissões do site e recarregue.',
    'ios-install': 'No iPhone: toque em Compartilhar › Adicionar à Tela de Início e abra o AgroGestor por lá para ligar as notificações.',
    unsupported: 'Este navegador não recebe notificações push. Os avisos aparecem só com o site aberto.',
    'no-key': 'As notificações push ainda não foram configuradas no servidor (chaves VAPID). Os avisos aparecem com o site aberto.',
  };
  if (compact && pushState === 'on') return null;

  return (
    <div className="card card-pad row" style={{ alignItems: 'flex-start' }}>
      <div className="icon-box" style={{ background: pushState === 'on' ? 'var(--primary-soft)' : 'var(--harvest-soft)', color: pushState === 'on' ? 'var(--primary)' : 'var(--harvest-ink)' }}>
        <BellRing size={20} />
      </div>
      <div className="grow">
        <div className="bold">Notificações no aparelho</div>
        <div className="small muted">{text[pushState]}</div>
        {err && <div className="error" style={{ marginTop: 8 }}>{err}</div>}
      </div>
      {(pushState === 'off' || pushState === 'on') && (
        <button
          className={`btn btn-sm ${pushState === 'on' ? 'btn-ghost' : ''}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setErr('');
            try {
              await (pushState === 'on' ? disablePush() : enablePush());
            } catch (e) {
              setErr((e as Error).message || 'Não foi possível ligar as notificações.');
            }
            setBusy(false);
          }}
        >
          {busy ? <Spinner size={14} /> : pushState === 'on' ? 'Desligar' : 'Ligar'}
        </button>
      )}
    </div>
  );
}
