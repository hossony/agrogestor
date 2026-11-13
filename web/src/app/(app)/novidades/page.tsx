'use client';

import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import useSWR from 'swr';
import { listItem, Spinner } from '@/components/ui';
import { fetcher } from '@/lib/client';

interface Entry {
  version: string;
  date: string;
  title: string;
  items: { where: 'site' | 'app' | 'ambos'; text: string }[];
}
const WHERE: Record<string, string> = { site: 'Site', app: 'App', ambos: 'Site e app' };
export const SEEN_KEY = 'ag:novidades-vistas';

export default function ReleaseNotesPage() {
  const { data } = useSWR<{ latest: string; entries: Entry[] }>('/api/changelog', fetcher);
  useEffect(() => {
    if (data?.latest) {
      try {
        localStorage.setItem(SEEN_KEY, data.latest);
      } catch {}
    }
  }, [data]);
  return (
    <div className="page stack">
      <div className="page-head">
        <div>
          <h1>Notas de atualização</h1>
          <p>Tudo o que mudou no site e no app, versão por versão.</p>
        </div>
      </div>
      {!data && (
        <div className="row" style={{ justifyContent: 'center', padding: 30 }}>
          <Spinner />
        </div>
      )}
      <div className="stack" style={{ gap: 14 }}>
        {data?.entries.map((e, i) => (
          <motion.section key={e.version} className="release" variants={listItem} initial="hidden" animate="show" custom={i}>
            <span className="release-dot" data-latest={i === 0} />
            <div className="card card-pad stack" style={{ gap: 10 }}>
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="bold" style={{ fontSize: 17 }}>
                  {e.title}
                </span>
                {i === 0 && (
                  <span className="hot-badge">
                    <Sparkles size={12} /> Mais recente
                  </span>
                )}
              </div>
              <div className="tiny muted">
                Versão {e.version} · {new Date(e.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
              <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {e.items.map((it, j) => (
                  <li key={j} className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
                    <span className="where" data-w={it.where} style={{ marginTop: 3 }}>
                      {WHERE[it.where]}
                    </span>
                    <span className="small">{it.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.section>
        ))}
      </div>
    </div>
  );
}
