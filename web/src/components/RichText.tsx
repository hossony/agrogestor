'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { EASE } from './ui';

const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'])/g;

/** Texto da postagem com os links clicáveis. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow ugc" className="post-link" onClick={(e) => e.stopPropagation()}>
            {p.replace(/^https?:\/\/(www\.)?/, '').slice(0, 60)}
            {p.replace(/^https?:\/\/(www\.)?/, '').length > 60 ? '…' : ''}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

export const EMOJI_GROUPS: { label: string; list: string[] }[] = [
  { label: 'Fazenda', list: ['🌾', '🚜', '🌱', '🌽', '🥔', '🍅', '🌻', '🍇', '🫘', '🥕', '🧅', '🌿', '🪵', '🌳', '🐄', '🐖', '🐑', '🐔', '🐐', '🐎', '🐝', '🥚', '🥛', '🧀', '🍯', '🚛', '🏡', '🏚️', '⛽', '💧', '☀️', '🌧️', '⛈️', '❄️', '🌙'] },
  { label: 'Reações', list: ['🔥', '❤️', '👍', '👏', '🙌', '💪', '😂', '🤣', '😍', '😎', '🤩', '😮', '😅', '😢', '😡', '🤔', '🙏', '👀', '💯', '✅', '❌', '⭐', '🏆', '🎉', '💰', '💸', '📈', '📉'] },
  { label: 'Jogo', list: ['🎮', '🕹️', '🖥️', '📸', '🎥', '🗺️', '🛠️', '⚙️', '🔧', '⏰', '📅', '📦', '🧾', '🤝', '👋'] },
];

/** Botão de emojis com um painel que abre e fecha suave. */
export function EmojiButton({ onPick, children }: { onPick: (e: string) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" className="btn btn-sm btn-ghost" style={{ border: 0 }} onClick={() => setOpen((o) => !o)} aria-label="Emojis" aria-expanded={open}>
        {children}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="emoji-panel card" initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.97 }} transition={EASE}>
            {EMOJI_GROUPS.map((g) => (
              <div key={g.label}>
                <div className="tiny bold muted" style={{ margin: '6px 4px 4px' }}>
                  {g.label}
                </div>
                <div className="emoji-grid">
                  {g.list.map((e) => (
                    <button key={e} type="button" onClick={() => onPick(e)} aria-label={e}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Data e hora completas: "13 nov 2026, 14:32". */
export const fullDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace('.', '');
