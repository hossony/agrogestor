'use client';

import { animate, motion, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { compact, money, num } from '@/lib/client';
import { farmTotals, type FarmSnapshot } from '@/lib/farm';
import { EASE_OUT, Segmented } from './ui';

function AnimatedNumber({ value, format }: { value: number; format: (v: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.1, ease: [0.16, 1, 0.3, 1], onUpdate: setShown });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{format(shown)}</span>;
}

const SPECIES: Record<string, string> = { vaca: '🐄', vacas: '🐄', gado: '🐄', bovino: '🐄', ovelha: '🐑', ovelhas: '🐑', porco: '🐖', porcos: '🐖', galinha: '🐔', galinhas: '🐔', cabra: '🐐', cabras: '🐐', cavalo: '🐎', cavalos: '🐎', búfalo: '🐃', búfalos: '🐃', abelha: '🐝', abelhas: '🐝' };
const animalEmoji = (s: string) => SPECIES[s.toLowerCase().split(' ')[0]] ?? '🐾';
const MACHINE: [RegExp, string][] = [
  [/trator/i, '🚜'],
  [/colheitadeira|colhedora|ceifa/i, '🌾'],
  [/caminh|carreta|reboque|transporte/i, '🚚'],
  [/plantadeira|semeadora/i, '🌱'],
  [/pulveriz|adub|fertil/i, '💧'],
  [/arado|grade|cultivador|subsolador/i, '⚙️'],
];
const machineEmoji = (c: string) => MACHINE.find(([r]) => r.test(c))?.[1] ?? '🛠️';

type Tab = 'campos' | 'maquinas' | 'animais' | 'estoque';

export default function FarmView({ farm, updatedAt }: { farm: FarmSnapshot; updatedAt?: string | null }) {
  const t = farmTotals(farm);
  const cur = farm.currency;
  const [tab, setTab] = useState<Tab>('campos');

  const stats = [
    { k: 'Patrimônio', v: t.worth, f: (v: number) => money(v, cur), hero: true },
    { k: 'Dinheiro', v: farm.cash, f: (v: number) => money(v, cur) },
    { k: 'Área', v: t.area, f: (v: number) => `${num(v, 1)} ha` },
    { k: 'Máquinas', v: t.machines, f: (v: number) => `${cur} ${compact(v)}` },
    { k: 'Animais', v: t.heads, f: (v: number) => num(v) },
  ];

  return (
    <div className="stack">
      <div className="row wrap" style={{ justifyContent: 'space-between' }}>
        <div>
          <div className="bold" style={{ fontSize: 18 }}>
            🏡 {farm.farmName}
          </div>
          <div className="small muted">
            {farm.map}
            {farm.period && ` · ${farm.period}`}
            {updatedAt && ` · atualizado em ${new Date(updatedAt).toLocaleDateString('pt-BR')}`}
          </div>
        </div>
      </div>

      <div className="stat-grid">
        {stats.map((s, i) => (
          <motion.div key={s.k} className={`stat ${s.hero ? 'stat-hero' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE_OUT, delay: i * 0.06 }}>
            <div className="k">{s.k}</div>
            <div className="v">
              <AnimatedNumber value={s.v} format={s.f} />
            </div>
          </motion.div>
        ))}
      </div>
      {farm.loan > 0 && <div className="tiny muted">Empréstimo de {money(farm.loan, cur)} já descontado do patrimônio.</div>}

      <div style={{ overflowX: 'auto' }}>
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { id: 'campos', label: `🌾 Campos (${farm.fields.length})` },
            { id: 'maquinas', label: `🚜 Máquinas (${farm.machines.length})` },
            { id: 'animais', label: `🐄 Animais (${farm.animals.length})` },
            { id: 'estoque', label: `🏚️ Silo (${farm.stock.length})` },
          ]}
        />
      </div>

      <motion.div key={tab} className="card list" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE_OUT}>
        {tab === 'campos' &&
          (farm.fields.length ? (
            farm.fields.map((f, i) => (
              <div key={i} className="list-item">
                <div className="icon-box" style={{ background: f.color ? `${f.color}33` : undefined }}>
                  <span className="dot" style={{ background: f.color || 'var(--faint)', width: 14, height: 14 }} />
                </div>
                <div className="grow">
                  <div className="bold">
                    {f.name}
                    {f.mapNo ? <span className="faint small"> · lote {f.mapNo}</span> : null}
                  </div>
                  <div className="small muted">{f.crop ? `${f.crop}${f.harvest ? ` · colheita em ${f.harvest}` : ''}` : 'Sem lavoura no momento'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="bold">{f.areaHa ? `${num(f.areaHa, 2)} ha` : <span className="faint small">área a conferir</span>}</div>
                  <span className={`tag ${f.owned ? 'tag-green' : 'tag-blue'}`}>{f.owned ? 'próprio' : 'arrendado'}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="empty small">Nenhum campo cadastrado.</div>
          ))}

        {tab === 'maquinas' &&
          (farm.machines.length ? (
            <div className="machine-grid" style={{ padding: 12 }}>
              {farm.machines.map((m, i) => (
                <motion.div key={i} className="machine-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ ...EASE_OUT, delay: Math.min(i, 10) * 0.04 }}>
                  <div className="machine-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {m.photo ? <img src={m.photo} alt={m.name} loading="lazy" /> : <span>{machineEmoji(m.category)}</span>}
                  </div>
                  <div style={{ padding: '10px 12px 12px' }}>
                    {m.brand && <div className="tiny muted bold">{m.brand}</div>}
                    <div className="bold ellipsis" title={m.name}>
                      {m.name}
                    </div>
                    <div className="tiny muted">{[m.category, m.powerCv ? `${m.powerCv} cv` : null, `${num(m.hours)} h`].filter(Boolean).join(' · ')}</div>
                    <div className="row" style={{ justifyContent: 'space-between', marginTop: 6 }}>
                      <span className="bold small">{money(m.value, cur)}</span>
                      {!m.owned && <span className="tag tag-blue">alugada</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="empty small">Nenhuma máquina cadastrada.</div>
          ))}

        {tab === 'animais' &&
          (farm.animals.length ? (
            farm.animals.map((a, i) => (
              <div key={i} className="list-item">
                <div className="icon-box">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {a.photo ? <img src={a.photo} alt="" /> : animalEmoji(a.species)}
                </div>
                <div className="grow">
                  <div className="bold">{a.name}</div>
                  <div className="small muted">
                    {a.count} de {a.capacity || '?'} · {a.species}
                    {a.product ? ` · ${a.product}` : ''}
                  </div>
                  <div className="bar" style={{ marginTop: 6, maxWidth: 220 }} title={`Saúde ${a.health}%`}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${a.health}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} style={{ background: a.health < 50 ? 'var(--danger)' : a.health < 80 ? 'var(--harvest)' : 'var(--primary)' }} />
                  </div>
                </div>
                <div className="bold">{money(a.value, cur)}</div>
              </div>
            ))
          ) : (
            <div className="empty small">Nenhum animal cadastrado.</div>
          ))}

        {tab === 'estoque' &&
          (farm.stock.length ? (
            farm.stock.map((s, i) => (
              <div key={i} className="list-item">
                <span className="dot" style={{ background: s.color || 'var(--harvest)' }} />
                <div className="grow bold">{s.name}</div>
                <div className="bold">
                  {num(s.qty)} {farm.qtyUnit}
                </div>
              </div>
            ))
          ) : (
            <div className="empty small">Silo vazio.</div>
          ))}
      </motion.div>
    </div>
  );
}
