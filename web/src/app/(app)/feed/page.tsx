'use client';

import { Clock, Flame, Trophy } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import Composer from '@/components/Composer';
import PostCard from '@/components/PostCard';
import { Empty, listItem, Segmented, Spinner } from '@/components/ui';
import { api } from '@/lib/client';
import { CATEGORIES, Post } from '@/lib/types';

type Sort = 'hot' | 'new' | 'top';
type Scope = 'all' | 'friends';

export default function FeedPage() {
  const [sort, setSort] = useState<Sort>('hot');
  const [scope, setScope] = useState<Scope>('all');
  const [category, setCategory] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const sentinel = useRef<HTMLDivElement>(null);
  const req = useRef(0);

  const load = useCallback(
    async (p: number) => {
      const id = ++req.current;
      setLoading(true);
      setError('');
      try {
        const qs = new URLSearchParams({ sort, scope, page: String(p), ...(category ? { category } : {}) });
        const res = await api<{ posts: Post[]; more: boolean }>(`/api/posts?${qs}`);
        if (id !== req.current) return;
        setPosts((prev) => (p === 0 ? res.posts : [...prev, ...res.posts.filter((x) => !prev.some((y) => y.id === x.id))]));
        setMore(res.more);
        setPage(p);
      } catch (e) {
        if (id === req.current) setError((e as Error).message);
      }
      if (id === req.current) setLoading(false);
    },
    [sort, scope, category],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  // Rolagem infinita.
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && more && !loading && load(page + 1), { rootMargin: '600px' });
    io.observe(el);
    return () => io.disconnect();
  }, [more, loading, page, load]);

  return (
    <div className="two-col page-wide">
      <div className="stack">
        <div className="page-head" style={{ marginBottom: 4 }}>
          <div>
            <h1>Feed</h1>
            <p>O que a comunidade está colhendo hoje.</p>
          </div>
        </div>

        <Composer onPosted={(p) => setPosts((list) => [p, ...list])} />

        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <Segmented<Sort>
            value={sort}
            onChange={setSort}
            options={[
              { id: 'hot', label: <><Flame size={15} /> Em alta</> },
              { id: 'new', label: <><Clock size={15} /> Novos</> },
              { id: 'top', label: <><Trophy size={15} /> Top</> },
            ]}
          />
          <Segmented<Scope>
            value={scope}
            onChange={setScope}
            options={[
              { id: 'all', label: 'Todos' },
              { id: 'friends', label: 'Amigos' },
            ]}
          />
        </div>

        <div className="chips">
          <button className="chip" data-active={category === ''} onClick={() => setCategory('')}>
            Tudo
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className="chip" data-active={category === c.id} onClick={() => setCategory(c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        {error && <div className="error">{error}</div>}

        <AnimatePresence mode="popLayout" initial={false}>
          {posts.map((p, i) => (
            <motion.div key={p.id} layout="position" variants={listItem} initial="hidden" animate="show" exit="exit" custom={i % 12}>
              <PostCard post={p} onDelete={() => setPosts((l) => l.filter((x) => x.id !== p.id))} />
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && page === 0 && posts.length === 0 && (
          <div className="stack">
            {[0, 1].map((i) => (
              <div key={i} className="card card-pad stack">
                <div className="row">
                  <div className="skeleton" style={{ width: 42, height: 42, borderRadius: '50%' }} />
                  <div className="grow stack" style={{ gap: 6 }}>
                    <div className="skeleton" style={{ height: 12, width: '40%' }} />
                    <div className="skeleton" style={{ height: 10, width: '25%' }} />
                  </div>
                </div>
                <div className="skeleton" style={{ height: 180 }} />
              </div>
            ))}
          </div>
        )}
        {!loading && !error && posts.length === 0 && (
          <Empty emoji={scope === 'friends' ? '🤝' : '🌱'} title={scope === 'friends' ? 'Seus amigos ainda não postaram' : 'Nada por aqui ainda'}>
            {scope === 'friends' ? 'Adicione amigos pelo ID ou veja o feed de todos.' : 'Seja o primeiro: mostre a sua fazenda!'}
          </Empty>
        )}
        <div ref={sentinel} />
        {loading && page > 0 && (
          <div className="row" style={{ justifyContent: 'center', padding: 16, color: 'var(--muted)' }}>
            <Spinner />
          </div>
        )}
      </div>

      <aside className="hide-narrow sticky stack">
        <div className="card card-pad">
          <div className="bold" style={{ marginBottom: 6 }}>
            🔥 Como funciona o foguinho
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            O foguinho é o voto da comunidade. Quanto mais 🔥 uma postagem recebe nas primeiras horas, mais alto ela aparece em <b>Em alta</b>. As curtidas e os comentários também contam, mas pesam menos.
          </p>
        </div>
        <div className="card card-pad">
          <div className="bold" style={{ marginBottom: 6 }}>
            🎮 Bora jogar?
          </div>
          <p className="small muted" style={{ margin: '0 0 10px' }}>
            Chame um amigo para o seu servidor. Ele recebe o aviso na hora, até no celular.
          </p>
          <a href="/convites" className="btn btn-sm btn-soft">
            Chamar para jogar
          </a>
        </div>
      </aside>
    </div>
  );
}
