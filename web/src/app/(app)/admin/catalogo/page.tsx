'use client';

import { CheckCircle2, ImagePlus, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { Empty, listItem, Modal, Spinner } from '@/components/ui';
import { CATALOG_CATEGORIES, hpLabel, type CatalogMachine } from '@/lib/catalog';
import { api, fetcher, money, uploadMedia, useMe } from '@/lib/client';

type Form = Record<keyof Omit<CatalogMachine, 'id' | 'verified'>, string> & { verified: boolean };
const EMPTY: Form = { brand: '', model: '', category: 'Trator', price: '', hp_min: '', hp_max: '', speed: '', width: '', capacity: '', weight: '', upkeep: '', image_url: '', notes: '', verified: false };
const toForm = (m: CatalogMachine): Form => ({
  brand: m.brand,
  model: m.model,
  category: m.category,
  price: m.price?.toString() ?? '',
  hp_min: m.hp_min?.toString() ?? '',
  hp_max: m.hp_max?.toString() ?? '',
  speed: m.speed?.toString() ?? '',
  width: m.width?.toString() ?? '',
  capacity: m.capacity?.toString() ?? '',
  weight: m.weight?.toString() ?? '',
  upkeep: m.upkeep?.toString() ?? '',
  image_url: m.image_url ?? '',
  notes: m.notes,
  verified: m.verified,
});

const FIELDS: { key: keyof Form; label: string; suffix?: string }[] = [
  { key: 'price', label: 'Preço', suffix: '$' },
  { key: 'hp_min', label: 'Potência mín.', suffix: 'cv' },
  { key: 'hp_max', label: 'Potência máx.', suffix: 'cv' },
  { key: 'speed', label: 'Velocidade máx.', suffix: 'km/h' },
  { key: 'width', label: 'Largura de trabalho', suffix: 'm' },
  { key: 'capacity', label: 'Capacidade', suffix: 'L' },
  { key: 'weight', label: 'Peso', suffix: 'kg' },
  { key: 'upkeep', label: 'Manutenção por dia', suffix: '$' },
];

export default function CatalogAdmin() {
  const { data: me } = useMe();
  const { data, mutate } = useSWR<CatalogMachine[]>('/api/catalog', fetcher);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('');
  const [editing, setEditing] = useState<{ id: string | null; form: Form } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useMemo(() => {
    const qn = query.trim().toLowerCase();
    return (data ?? []).filter((m) => (!cat || m.category === cat) && (!qn || `${m.brand} ${m.model}`.toLowerCase().includes(qn)));
  }, [data, query, cat]);

  if (me && !me.badges.includes('owner')) return <Empty emoji="🔒" title="Só o dono da plataforma acessa o catálogo." />;

  const set = (k: keyof Form, v: string | boolean) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  const upload = async (file?: File) => {
    if (!file) return;
    setBusy('img');
    setError('');
    try {
      const m = await uploadMedia(file);
      set('image_url', m.url);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };

  const save = async () => {
    if (!editing) return;
    setBusy('save');
    setError('');
    try {
      if (editing.id) await api(`/api/catalog/${editing.id}`, { method: 'PATCH', body: editing.form });
      else await api('/api/catalog', { body: editing.form });
      await mutate();
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(null);
  };

  const remove = async (m: CatalogMachine) => {
    if (!confirm(`Tirar ${m.brand} ${m.model} do catálogo? As máquinas já cadastradas pelos jogadores continuam.`)) return;
    await api(`/api/catalog/${m.id}`, { method: 'DELETE' });
    mutate();
  };

  return (
    <div className="page-wide stack">
      <div className="page-head">
        <div>
          <h1>Catálogo de máquinas do FS25</h1>
          <p>
            Só você vê esta tela. As imagens e os valores daqui aparecem para todos no app (Frota › Do catálogo) e nos perfis. Marque “conferido” depois de checar no jogo.
          </p>
        </div>
        <button className="btn" onClick={() => (setError(''), setEditing({ id: null, form: { ...EMPTY } }))}>
          <Plus size={16} /> Nova máquina
        </button>
      </div>

      <div className="row wrap">
        <div className="row grow" style={{ position: 'relative', minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--faint)' }} />
          <input className="input" style={{ paddingLeft: 36 }} placeholder="Buscar marca ou modelo" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">Todas as categorias</option>
          {CATALOG_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      {!data && (
        <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
          <Spinner />
        </div>
      )}
      <div className="machine-grid">
        <AnimatePresence>
          {list.map((m, i) => (
            <motion.div key={m.id} className="machine-card" layout variants={listItem} initial="hidden" animate="show" exit="exit" custom={i % 12}>
              <div className="machine-img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {m.image_url ? <img src={m.image_url} alt="" loading="lazy" /> : <span>{m.category === 'Colheitadeira' ? '🌾' : '🚜'}</span>}
              </div>
              <div style={{ padding: 12 }}>
                <div className="tiny muted bold">{m.brand}</div>
                <div className="bold ellipsis">{m.model}</div>
                <div className="tiny muted">
                  {m.category}
                  {hpLabel(m) ? ` · ${hpLabel(m)}` : ''}
                </div>
                <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                  <span className="bold small">{m.price ? money(m.price) : <span className="faint">sem preço</span>}</span>
                  {m.verified ? <span className="tag tag-green">conferido</span> : <span className="tag tag-gold">conferir</span>}
                </div>
                <div className="row" style={{ marginTop: 8, gap: 6 }}>
                  <button className="btn btn-sm btn-ghost grow" onClick={() => (setError(''), setEditing({ id: m.id, form: toForm(m) }))}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button className="btn btn-sm btn-icon" onClick={() => remove(m)} aria-label="Remover">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {data && !list.length && <Empty emoji="🔍" title="Nenhuma máquina encontrada" />}

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} label="Máquina">
        {editing && (
          <div className="stack">
            <h2>{editing.id ? 'Editar máquina' : 'Nova máquina'}</h2>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <button type="button" className="machine-img" style={{ width: 140, borderRadius: 14, border: '1px dashed var(--line)', cursor: 'pointer', flexShrink: 0 }} onClick={() => fileRef.current?.click()}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {busy === 'img' ? <Spinner /> : editing.form.image_url ? <img src={editing.form.image_url} alt="" /> : <ImagePlus size={28} color="var(--muted)" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => upload(e.target.files?.[0])} />
              <div className="stack grow" style={{ gap: 8 }}>
                <input className="input" placeholder="Marca (ex.: Fendt)" value={editing.form.brand} onChange={(e) => set('brand', e.target.value)} />
                <input className="input" placeholder="Modelo (ex.: 1000 Vario)" value={editing.form.model} onChange={(e) => set('model', e.target.value)} />
                <select className="select" value={editing.form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATALOG_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {FIELDS.map((f) => (
                <label key={f.key} className="small">
                  <span className="label" style={{ marginBottom: 4 }}>
                    {f.label} {f.suffix && <span className="faint">({f.suffix})</span>}
                  </span>
                  <input className="input" inputMode="decimal" value={editing.form[f.key] as string} onChange={(e) => set(f.key, e.target.value)} />
                </label>
              ))}
            </div>
            <textarea className="textarea" placeholder="Observações (ex.: só no DLC, usado para arroz…)" value={editing.form.notes} onChange={(e) => set('notes', e.target.value)} style={{ minHeight: 60 }} />
            <label className="radio-card" data-on={editing.form.verified}>
              <input type="checkbox" checked={editing.form.verified} onChange={(e) => set('verified', e.target.checked)} />
              <span>
                <span className="bold row" style={{ gap: 6 }}>
                  <CheckCircle2 size={15} /> Valores conferidos no jogo
                </span>
                <span className="small muted">Tira o aviso “conferir” para os jogadores.</span>
              </span>
            </label>
            {error && <div className="error">{error}</div>}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>
                Cancelar
              </button>
              <button className="btn" onClick={save} disabled={busy !== null}>
                {busy === 'save' ? <Spinner size={15} /> : null} Salvar
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
