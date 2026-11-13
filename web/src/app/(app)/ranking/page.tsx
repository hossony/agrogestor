'use client';

import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Badges } from '@/components/Badges';
import { PlatformIcon } from '@/components/Platform';
import { Avatar, Empty, listItem, Segmented, Spinner } from '@/components/ui';
import { compact, fetcher, money, num } from '@/lib/client';

interface Row {
  id: string;
  code: string;
  name: string;
  avatar_url: string | null;
  badges: string[];
  platform: string | null;
  me: boolean;
  hidden: boolean;
  farmName: string | null;
  currency: string;
  worth: number;
  machines: number;
  area: number;
  animals: number;
}
type Key = 'worth' | 'machines' | 'area' | 'animals';
const MEDAL = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const { data } = useSWR<Row[]>('/api/leaderboard', fetcher);
  const [by, setBy] = useState<Key>('worth');
  const rows = useMemo(() => {
    const list = (data ?? []).slice();
    // Quem não mostra a fazenda fica no fim, sem posição.
    return list.sort((a, b) => Number(a.hidden) - Number(b.hidden) || b[by] - a[by]);
  }, [data, by]);
  const fmt = (r: Row) => (by === 'worth' ? money(r.worth, r.currency) : by === 'area' ? `${num(r.area, 1)} ha` : by === 'machines' ? `${num(r.machines)} ${r.machines === 1 ? 'máquina' : 'máquinas'}` : `${num(r.animals)} animais`);

  return (
    <div className="page stack">
      <div className="page-head">
        <div>
          <h1>Ranking dos amigos</h1>
          <p>Quem tem a maior fazenda entre você e os seus contatos.</p>
        </div>
      </div>
      <Segmented
        value={by}
        onChange={setBy}
        options={[
          { id: 'worth', label: '💰 Patrimônio' },
          { id: 'machines', label: '🚜 Máquinas' },
          { id: 'area', label: '🌾 Área' },
          { id: 'animals', label: '🐄 Animais' },
        ]}
      />
      {!data && (
        <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
          <Spinner />
        </div>
      )}
      {data && rows.length <= 1 && (
        <div className="card">
          <Empty emoji="🏆" title="Ainda não tem ninguém para competir">
            Adicione amigos pelo ID e publiquem as fazendas.
          </Empty>
        </div>
      )}
      {data && rows.length > 0 && (
        <div className="card" style={{ overflow: 'hidden' }}>
          {rows.map((r, i) => (
            <motion.div key={r.id + by} layout className="rank-row" data-me={r.me} variants={listItem} initial="hidden" animate="show" custom={i}>
              <span className="rank-pos">{r.hidden ? '–' : MEDAL[i] ?? `${i + 1}º`}</span>
              <Link href={`/u/${r.code}`}>
                <Avatar user={r} size={44} />
              </Link>
              <Link href={`/u/${r.code}`} style={{ minWidth: 0 }}>
                <span className="row" style={{ gap: 5 }}>
                  <span className="bold ellipsis">
                    {r.name}
                    {r.me ? ' (você)' : ''}
                  </span>
                  <Badges ids={r.badges} max={2} />
                  {r.platform && <PlatformIcon id={r.platform} size={14} />}
                </span>
                <span className="tiny muted ellipsis" style={{ display: 'block' }}>
                  {r.hidden ? (r.me ? 'publique a sua fazenda em Minha fazenda' : '🔒 fazenda privada ou não publicada') : `🏡 ${r.farmName}`}
                </span>
              </Link>
              <span className="bold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {r.hidden ? (
                  <Lock size={15} color="var(--faint)" />
                ) : (
                  <>
                    <span>{fmt(r)}</span>
                    <span className="tiny muted" style={{ display: 'block', fontWeight: 600 }}>
                      {by === 'worth' ? `${r.machines} máq. · ${num(r.area, 1)} ha` : `${r.currency} ${compact(r.worth)}`}
                    </span>
                  </>
                )}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
