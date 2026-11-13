'use client';

import { Heart, MessageCircle, MoreHorizontal, Share2, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { api, timeAgo } from '@/lib/client';
import { categoryOf, Media, Post } from '@/lib/types';
import { Avatar, Count, EASE, Lightbox, SPRING } from './ui';

function Burst({ emoji }: { emoji: string }) {
  // Pequena explosão de emojis subindo quando a pessoa reage.
  const parts = Array.from({ length: 7 }, (_, i) => i);
  return (
    <span style={{ position: 'absolute', left: '50%', top: '50%', pointerEvents: 'none' }} aria-hidden>
      {parts.map((i) => {
        const angle = -90 + (i - 3) * 22;
        const dist = 26 + (i % 3) * 10;
        return (
          <motion.span
            key={i}
            style={{ position: 'absolute', fontSize: 12 + (i % 3) * 3, left: -7, top: -9 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
            animate={{ x: Math.cos((angle * Math.PI) / 180) * dist, y: Math.sin((angle * Math.PI) / 180) * dist, opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            {emoji}
          </motion.span>
        );
      })}
    </span>
  );
}

export function MediaGrid({ media }: { media: Media[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (!media.length) return null;
  return (
    <>
      <div className="media-grid" data-n={media.length}>
        {media.map((m) =>
          m.type === 'video' ? (
            <div key={m.url} className="media-item">
              <video src={m.url} controls playsInline preload="metadata" />
            </div>
          ) : (
            <div key={m.url} className="media-item" onClick={() => setOpen(m.url)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" loading="lazy" />
            </div>
          ),
        )}
      </div>
      <Lightbox src={open} onClose={() => setOpen(null)} />
    </>
  );
}

export default function PostCard({ post, onChange, onDelete, linkToPost = true }: { post: Post; onChange?: (p: Post) => void; onDelete?: () => void; linkToPost?: boolean }) {
  const [p, setP] = useState(post);
  const [burst, setBurst] = useState<{ kind: string; n: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const [shared, setShared] = useState(false);
  const cat = categoryOf(p.category);
  const hot = p.fire_count >= 5;

  const update = (next: Post) => {
    setP(next);
    onChange?.(next);
  };

  const react = async (kind: 'like' | 'fire') => {
    const key = kind === 'like' ? 'liked' : 'fired';
    const col = kind === 'like' ? 'like_count' : 'fire_count';
    const on = !p[key];
    const prev = p;
    update({ ...p, [key]: on, [col]: Math.max(0, p[col] + (on ? 1 : -1)) });
    if (on) setBurst({ kind, n: Date.now() });
    try {
      const r = await api<{ on: boolean; like_count: number; fire_count: number }>(`/api/posts/${p.id}/react`, { body: { kind } });
      update({ ...prev, [key]: r.on, like_count: r.like_count, fire_count: r.fire_count });
    } catch {
      update(prev);
    }
  };

  const share = async () => {
    const url = `${location.origin}/post/${p.id}`;
    if (navigator.share) await navigator.share({ url, title: 'AgroGestor' }).catch(() => {});
    else {
      await navigator.clipboard.writeText(url).catch(() => {});
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    }
  };

  const remove = async () => {
    setMenu(false);
    if (!confirm('Apagar esta postagem? Não dá para desfazer.')) return;
    await api(`/api/posts/${p.id}`, { method: 'DELETE' });
    onDelete?.();
  };

  const body = p.body && (
    <div className="post-body" style={{ fontSize: p.body.length < 90 && !p.media.length ? 19 : undefined, fontWeight: p.body.length < 90 && !p.media.length ? 600 : undefined }}>
      {p.body}
    </div>
  );

  return (
    <article className="card post">
      <div className="post-head">
        <Link href={`/u/${p.author.code}`}>
          <Avatar user={p.author} size={42} />
        </Link>
        <div className="grow">
          <div className="row" style={{ gap: 6 }}>
            <Link href={`/u/${p.author.code}`} className="bold ellipsis">
              {p.author.name}
            </Link>
            {hot && (
              <motion.span className="hot-badge" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING}>
                🔥 Em alta
              </motion.span>
            )}
          </div>
          <div className="row tiny muted" style={{ gap: 6 }}>
            <span>@{p.author.username}</span>·<span>{timeAgo(p.created_at)}</span>·
            <span className="post-cat">
              {cat.emoji} {cat.label}
            </span>
          </div>
        </div>
        {p.mine && (
          <div style={{ position: 'relative' }}>
            <button className="btn btn-icon btn-sm" aria-label="Opções" onClick={() => setMenu((m) => !m)}>
              <MoreHorizontal size={18} />
            </button>
            <AnimatePresence>
              {menu && (
                <motion.div
                  className="card"
                  style={{ position: 'absolute', right: 0, top: 36, zIndex: 5, padding: 6, minWidth: 170, boxShadow: 'var(--shadow)' }}
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={EASE}
                >
                  <button className="btn btn-sm btn-block" style={{ justifyContent: 'flex-start', background: 'transparent', color: 'var(--danger)' }} onClick={remove}>
                    <Trash2 size={15} /> Apagar postagem
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {linkToPost && p.body ? <Link href={`/post/${p.id}`}>{body}</Link> : body}
      <MediaGrid media={p.media} />

      <div className="post-actions">
        <motion.button className="react" data-kind="fire" data-on={p.fired} onClick={() => react('fire')} whileTap={{ scale: 0.88 }} style={{ position: 'relative' }} aria-label="Foguinho" title="Foguinho: manda a postagem para o topo">
          <motion.span className="fire-emoji" key={`f${p.fired}`} initial={p.fired ? { scale: 0.3, rotate: -20 } : false} animate={{ scale: 1, rotate: 0 }} transition={SPRING}>
            🔥
          </motion.span>
          <Count value={p.fire_count} />
          {burst?.kind === 'fire' && <Burst key={burst.n} emoji="🔥" />}
        </motion.button>
        <motion.button className="react" data-kind="like" data-on={p.liked} onClick={() => react('like')} whileTap={{ scale: 0.88 }} style={{ position: 'relative' }} aria-label="Curtir">
          <motion.span key={`l${p.liked}`} initial={p.liked ? { scale: 0.3 } : false} animate={{ scale: 1 }} transition={SPRING} style={{ display: 'inline-flex' }}>
            <Heart size={18} fill={p.liked ? 'currentColor' : 'none'} />
          </motion.span>
          <Count value={p.like_count} />
          {burst?.kind === 'like' && <Burst key={burst.n} emoji="❤️" />}
        </motion.button>
        {linkToPost ? (
          <Link href={`/post/${p.id}`} className="react" aria-label="Comentários">
            <MessageCircle size={18} />
            <Count value={p.comment_count} />
          </Link>
        ) : (
          <span className="react" style={{ cursor: 'default' }}>
            <MessageCircle size={18} />
            <Count value={p.comment_count} />
          </span>
        )}
        <span className="grow" />
        <button className="react" onClick={share} aria-label="Compartilhar">
          <Share2 size={17} />
          <AnimatePresence>
            {shared && (
              <motion.span className="tiny" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} transition={EASE}>
                Link copiado
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </article>
  );
}
