'use client';

import { ClipboardPaste, ExternalLink, RefreshCw, Upload } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import FarmView from '@/components/FarmView';
import { EASE, Empty, listItem, Spinner } from '@/components/ui';
import { api, fetcher, timeAgo, useMe } from '@/lib/client';
import { snapshotFromSave, type FarmSnapshot } from '@/lib/farm';

/**
 * Publica a fazenda no perfil. Os saves vêm da conta (sincronizados pelo app
 * do celular, do Windows e por /gestao), do localStorage deste navegador ou de
 * um backup colado (Ajustes › Copiar backup).
 */

interface LocalSave {
  id: string;
  name: string;
  farmName: string;
  map: string;
  mapName: string;
  updatedAt: string;
  owner: string;
  cloud?: boolean;
}

const LAST = 'ag:save-publicado';
const MAP_NAMES: Record<string, string> = { riverbend: 'Riverbend Springs', zielonka: 'Zielonka', hutan: 'Hutan Pantai' };

function readLocalSaves(): LocalSave[] {
  try {
    const users = JSON.parse(localStorage.getItem('agrogestor:usuarios') || '[]') as { id: string; name: string }[];
    return users
      .flatMap((u) => (JSON.parse(localStorage.getItem(`agrogestor:saves:${u.id}`) || '[]') as Omit<LocalSave, 'owner'>[]).map((s) => ({ ...s, owner: u.name })))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}

export default function FarmPage() {
  const { data: me } = useMe();
  const { data: profile, mutate } = useSWR<{ farm: FarmSnapshot | null; farmUpdatedAt: string | null }>(me ? `/api/users/${me.code}` : null, fetcher);
  const [saves, setSaves] = useState<LocalSave[] | null>(null);
  const [last, setLast] = useState<string | null>(null);
  const [paste, setPaste] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const local = readLocalSaves();
    setSaves(local);
    api<{ saves: (Omit<LocalSave, 'owner'> & { deleted: boolean })[] }>('/api/saves')
      .then(({ saves: remote }) => {
        const live = remote.filter((r) => !r.deleted);
        const gone = new Set(remote.filter((r) => r.deleted).map((r) => r.id));
        const fromCloud = live.map((r) => ({ ...r, owner: 'sua conta', cloud: true }));
        const onlyHere = local.filter((l) => !gone.has(l.id) && !live.some((r) => r.id === l.id));
        setSaves([...fromCloud, ...onlyHere].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      })
      .catch(() => {});
    try {
      setLast(localStorage.getItem(LAST));
    } catch {}
  }, []);

  const publish = async (raw: unknown, key: string, saveId?: string) => {
    setBusy(key);
    setMsg(null);
    try {
      const snap = snapshotFromSave(raw);
      await api('/api/farm', { method: 'PUT', body: snap });
      if (saveId) {
        localStorage.setItem(LAST, saveId);
        setLast(saveId);
      }
      await mutate();
      setPaste('');
      setMsg({ ok: true, text: `“${snap.farmName}” publicada! Seus amigos já podem ver no seu perfil.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setBusy(null);
  };

  const publishSave = async (s: LocalSave) => {
    if (s.cloud) {
      setBusy(s.id);
      try {
        const r = await api<{ data: unknown }>(`/api/saves/${s.id}`);
        return publish(r.data, s.id, s.id);
      } catch (e) {
        setBusy(null);
        return setMsg({ ok: false, text: (e as Error).message });
      }
    }
    const raw = localStorage.getItem(`agrogestor:save:${s.id}`);
    if (!raw) return setMsg({ ok: false, text: 'Não encontrei os dados desse save. Abra-o no app de gestão e tente de novo.' });
    publish(JSON.parse(raw), s.id, s.id);
  };

  const publishPaste = () => {
    try {
      publish(JSON.parse(paste), 'paste');
    } catch {
      setMsg({ ok: false, text: 'Esse texto não é um backup válido. No app, use Ajustes › Copiar backup e cole aqui.' });
    }
  };

  const unpublish = async () => {
    if (!confirm('Tirar a fazenda do seu perfil? Seus amigos deixam de ver.')) return;
    setBusy('remove');
    await api('/api/farm', { method: 'DELETE' }).catch(() => {});
    await mutate();
    setBusy(null);
  };

  return (
    <div className="page-wide stack" style={{ maxWidth: 900 }}>
      <div className="page-head">
        <div>
          <h1>Minha fazenda</h1>
          <p>Escolha qual save aparece no seu perfil. Só os amigos veem o patrimônio.</p>
        </div>
        <a href="/gestao" className="btn btn-ghost btn-sm">
          <ExternalLink size={15} /> Abrir a gestão
        </a>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div className={msg.ok ? 'ok' : 'error'} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>

      <section>
        <div className="section-title">Seus saves</div>
        {saves === null ? (
          <Spinner />
        ) : saves.length === 0 ? (
          <div className="card">
            <Empty emoji="💾" title="Nenhum save ainda">
              Crie ou abra um save em <a href="/gestao" style={{ color: 'var(--primary)', fontWeight: 700 }}>Gestão da fazenda</a>, ou cole um backup do celular aqui embaixo.
            </Empty>
          </div>
        ) : (
          <div className="card list">
            {saves.map((s, i) => (
              <motion.div key={s.id} className="list-item" variants={listItem} initial="hidden" animate="show" custom={i}>
                <div className="icon-box">🏡</div>
                <div className="grow">
                  <div className="bold">
                    {s.farmName || s.name}
                    {last === s.id && <span className="tag tag-green" style={{ marginLeft: 8 }}>no perfil</span>}
                  </div>
                  <div className="small muted">
                    {MAP_NAMES[s.map] ?? (s.mapName || 'Outro mapa')} · {s.cloud ? 'sincronizado' : `só neste navegador (${s.owner})`} · editado {timeAgo(s.updatedAt)}
                  </div>
                </div>
                <button className={`btn btn-sm ${last === s.id ? 'btn-soft' : ''}`} disabled={busy !== null} onClick={() => publishSave(s)}>
                  {busy === s.id ? <Spinner size={14} /> : last === s.id ? <RefreshCw size={14} /> : <Upload size={14} />}
                  {last === s.id ? 'Atualizar' : 'Publicar'}
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="section-title">Do celular ou do Windows</div>
        <div className="card card-pad stack">
          <div className="small muted">
            No app AgroGestor, vá em <b>Ajustes › Copiar backup</b>, mande o texto para você mesmo e cole aqui. Só o resumo (campos, máquinas, animais, silo e dinheiro) vai para o perfil.
          </div>
          <textarea className="textarea" value={paste} onChange={(e) => setPaste(e.target.value)} placeholder='{"settings": {...}, "fields": [...] ...}' style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} />
          <button className="btn" style={{ alignSelf: 'flex-start' }} disabled={!paste.trim() || busy !== null} onClick={publishPaste}>
            {busy === 'paste' ? <Spinner size={15} /> : <ClipboardPaste size={16} />} Publicar backup
          </button>
        </div>
      </section>

      <section>
        <div className="section-title">Como os amigos veem</div>
        {!profile ? (
          <Spinner />
        ) : profile.farm ? (
          <div className="stack">
            <FarmView farm={profile.farm} updatedAt={profile.farmUpdatedAt} />
            <button className="btn btn-sm btn-danger" style={{ alignSelf: 'flex-start' }} disabled={busy !== null} onClick={unpublish}>
              Tirar do perfil
            </button>
          </div>
        ) : (
          <div className="card">
            <Empty emoji="🚜" title="Nada publicado ainda" />
          </div>
        )}
      </section>
    </div>
  );
}
