'use client';

import { ImagePlus, Send, Video, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { api, uploadMedia, useMe } from '@/lib/client';
import { CATEGORIES, Media, Post } from '@/lib/types';
import { Avatar, EASE, SPRING, Spinner } from './ui';

interface Item {
  key: string;
  preview: string;
  type: Media['type'];
  progress: number;
  media?: Media;
  error?: string;
}

export default function Composer({ onPosted }: { onPosted: (p: Post) => void }) {
  const { data: me } = useMe();
  const [text, setText] = useState('');
  const [category, setCategory] = useState('geral');
  const [items, setItems] = useState<Item[]>([]);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  const expanded = focused || text.length > 0 || items.length > 0;
  const uploading = items.some((i) => !i.media && !i.error);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    setError('');
    const room = 6 - items.length;
    Array.from(files)
      .slice(0, room)
      .forEach((file) => {
        const key = Math.random().toString(36).slice(2);
        const type: Media['type'] = file.type.startsWith('video/') ? 'video' : 'image';
        setItems((list) => [...list, { key, preview: URL.createObjectURL(file), type, progress: 2 }]);
        uploadMedia(file, (pct) => setItems((list) => list.map((i) => (i.key === key ? { ...i, progress: Math.max(i.progress, pct) } : i))))
          .then((media) => setItems((list) => list.map((i) => (i.key === key ? { ...i, media, progress: 100 } : i))))
          .catch((e: Error) => {
            setItems((list) => list.filter((i) => i.key !== key));
            setError(e.message);
          });
      });
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    setError('');
    setBusy(true);
    try {
      const post = await api<Post>('/api/posts', { body: { body: text, category, media: items.filter((i) => i.media).map((i) => i.media) } });
      setText('');
      setItems([]);
      setCategory('geral');
      setFocused(false);
      onPosted(post);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <motion.div className="card card-pad composer" layout transition={EASE} onDragOver={(e) => e.preventDefault()} onDrop={(e) => (e.preventDefault(), addFiles(e.dataTransfer.files))}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <Avatar user={me ?? null} size={42} />
        <textarea
          ref={area}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 320)}px`;
          }}
          onFocus={() => setFocused(true)}
          placeholder="Como está a fazenda hoje? Mostre a colheita, a máquina nova…"
          rows={2}
          maxLength={4000}
        />
      </div>

      <AnimatePresence initial={false}>
        {items.length > 0 && (
          <motion.div className="composer-media" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
            <AnimatePresence>
              {items.map((i) => (
                <motion.div key={i.key} className="thumb" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={SPRING}>
                  {i.type === 'video' ? <video src={i.preview} muted playsInline /> : /* eslint-disable-next-line @next/next/no-img-element */ <img src={i.preview} alt="" />}
                  {i.type === 'video' && (
                    <span className="tag" style={{ position: 'absolute', left: 6, bottom: 8, background: 'rgb(0 0 0 /.6)', color: '#fff' }}>
                      vídeo
                    </span>
                  )}
                  <button className="thumb-x" onClick={() => setItems((l) => l.filter((x) => x.key !== i.key))} aria-label="Remover">
                    <X size={14} />
                  </button>
                  {!i.media && (
                    <div className="thumb-progress">
                      <div style={{ width: `${i.progress}%` }} />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE} style={{ overflow: 'hidden' }}>
            <div className="chips" style={{ marginTop: 12 }}>
              {CATEGORIES.map((c) => (
                <button key={c.id} className="chip" data-active={category === c.id} onClick={() => setCategory(c.id)} style={{ height: 30, fontSize: 12.5 }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div className="error" style={{ marginTop: 10 }} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={EASE}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="row" style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
        <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => addFiles(e.target.files)} />
        <button className="btn btn-sm btn-ghost" style={{ border: 0 }} onClick={() => fileRef.current?.click()} disabled={items.length >= 6}>
          <ImagePlus size={17} color="var(--primary)" /> Foto
        </button>
        <button className="btn btn-sm btn-ghost" style={{ border: 0 }} onClick={() => fileRef.current?.click()} disabled={items.length >= 6}>
          <Video size={17} color="var(--fire)" /> Vídeo
        </button>
        <span className="grow" />
        <AnimatePresence>
          {text.length > 3500 && (
            <motion.span className="tiny faint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {4000 - text.length}
            </motion.span>
          )}
        </AnimatePresence>
        <button className="btn btn-sm" disabled={busy || uploading || (!text.trim() && !items.length)} onClick={submit}>
          {busy ? <Spinner size={15} /> : <Send size={15} />} {uploading ? 'Enviando…' : 'Publicar'}
        </button>
      </div>
    </motion.div>
  );
}
