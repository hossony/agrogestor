'use client';

import { ArrowLeft, Send, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Badges } from '@/components/Badges';
import PostCard from '@/components/PostCard';
import { Avatar, EASE, Empty, listItem, Spinner } from '@/components/ui';
import { useLive } from '@/components/Live';
import { api, timeAgo, useMe } from '@/lib/client';
import type { Comment, Post } from '@/lib/types';

function CommentBox({ onSend, placeholder, autoFocus }: { onSend: (text: string) => Promise<void>; placeholder: string; autoFocus?: boolean }) {
  const { data: me } = useMe();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSend(text);
      setText('');
    } catch (e) {
      alert((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <div className="row" style={{ alignItems: 'flex-end' }}>
      <Avatar user={me ?? null} size={32} />
      <textarea
        className="textarea"
        style={{ minHeight: 42, height: 42, borderRadius: 20, padding: '9px 14px' }}
        placeholder={placeholder}
        value={text}
        autoFocus={autoFocus}
        maxLength={1500}
        onChange={(e) => {
          setText(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
      />
      <button className="btn" style={{ width: 42, height: 42, padding: 0, borderRadius: '50%' }} disabled={busy || !text.trim()} onClick={send} aria-label="Enviar">
        {busy ? <Spinner size={15} /> : <Send size={16} />}
      </button>
    </div>
  );
}

function CommentItem({ c, onReply, onDelete, canDelete }: { c: Comment; onReply?: () => void; onDelete: () => void; canDelete: boolean }) {
  return (
    <div className="comment">
      <Link href={`/u/${c.author.code}`}>
        <Avatar user={c.author} size={32} />
      </Link>
      <div className="grow">
        <div className="comment-bubble">
          <Link href={`/u/${c.author.code}`} className="bold small row" style={{ gap: 5, display: 'inline-flex' }}>
            {c.author.name}
            <Badges ids={c.author.badges} max={2} />
          </Link>
          <div>{c.body}</div>
        </div>
        <div className="row" style={{ gap: 14, padding: '4px 12px' }}>
          <span className="tiny faint">{timeAgo(c.created_at)}</span>
          {onReply && (
            <button className="link-btn" onClick={onReply}>
              Responder
            </button>
          )}
          {canDelete && (
            <button className="link-btn" onClick={onDelete} aria-label="Apagar comentário">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const live = useLive();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [error, setError] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    api<{ post: Post; comments: Comment[] }>(`/api/posts/${id}`)
      .then((r) => {
        setPost(r.post);
        setComments(r.comments);
        first.current = false;
      })
      .catch((e) => setError(e.message));
  }, [id, live.version]);

  const tree = useMemo(() => {
    const top = comments.filter((c) => !c.parent_id);
    return top.map((c) => ({ c, replies: comments.filter((r) => r.parent_id === c.id) }));
  }, [comments]);

  const add = async (text: string, parent?: string) => {
    const c = await api<Comment>(`/api/posts/${id}/comments`, { body: { body: text, parent_id: parent ?? null } });
    setComments((l) => [...l, c]);
    setPost((p) => (p ? { ...p, comment_count: p.comment_count + 1 } : p));
    setReplyTo(null);
  };
  const del = async (c: Comment) => {
    if (!confirm('Apagar este comentário?')) return;
    const r = await api<{ removed: number }>(`/api/comments/${c.id}`, { method: 'DELETE' });
    setComments((l) => l.filter((x) => x.id !== c.id && x.parent_id !== c.id));
    setPost((p) => (p ? { ...p, comment_count: Math.max(0, p.comment_count - r.removed) } : p));
  };

  if (error) return <Empty emoji="🧐" title={error} />;
  if (!post)
    return (
      <div className="page row" style={{ justifyContent: 'center', padding: 40 }}>
        <Spinner />
      </div>
    );

  return (
    <div className="page stack">
      <button className="btn btn-sm btn-ghost" style={{ alignSelf: 'flex-start' }} onClick={() => (history.length > 1 ? router.back() : router.push('/feed'))}>
        <ArrowLeft size={16} /> Voltar
      </button>
      <PostCard key={`${post.id}-${post.comment_count}`} post={post} linkToPost={false} onDelete={() => router.push('/feed')} />
      <div className="card card-pad stack">
        <div className="bold">Comentários ({post.comment_count})</div>
        <CommentBox onSend={(t) => add(t)} placeholder="Escreva um comentário…" />
        {tree.length === 0 && <div className="small muted">Ninguém comentou ainda. Comece a conversa!</div>}
        <AnimatePresence initial={false}>
          {tree.map(({ c, replies }, i) => (
            <motion.div key={c.id} className="stack" style={{ gap: 10 }} variants={listItem} initial={first.current ? 'hidden' : { opacity: 0, y: 8 }} animate="show" exit="exit" custom={i}>
              <CommentItem c={c} canDelete={c.mine || post.mine} onReply={() => setReplyTo(replyTo === c.id ? null : c.id)} onDelete={() => del(c)} />
              {(replies.length > 0 || replyTo === c.id) && (
                <div className="comment-replies">
                  <AnimatePresence initial={false}>
                    {replies.map((r) => (
                      <motion.div key={r.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={EASE}>
                        <CommentItem c={r} canDelete={r.mine || post.mine} onReply={() => setReplyTo(c.id)} onDelete={() => del(r)} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <AnimatePresence>
                    {replyTo === c.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
                        <CommentBox autoFocus onSend={(t) => add(t, c.id)} placeholder={`Responder ${c.author.name}…`} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
