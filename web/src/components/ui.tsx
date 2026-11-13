'use client';

import { Check, Copy, X } from 'lucide-react';
import { AnimatePresence, motion, type Transition, type Variants } from 'motion/react';
import { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';

/** Curvas padrão: suave (ease-in-out) para trocas, mola para toques e entradas. */
export const EASE: Transition = { duration: 0.32, ease: [0.45, 0, 0.55, 1] };
export const EASE_OUT: Transition = { duration: 0.45, ease: [0.16, 1, 0.3, 1] };
export const SPRING: Transition = { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 };

/** Entrada em cascata para listas. */
export const listItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number = 0) => ({ opacity: 1, y: 0, transition: { ...EASE_OUT, delay: Math.min(i, 8) * 0.045 } }),
  exit: { opacity: 0, scale: 0.97, transition: { ...EASE, duration: 0.2 } },
};

export function Avatar({ user, size = 40 }: { user: { name: string; avatar_url: string | null } | null; size?: number }) {
  const initials = (user?.name ?? '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  if (user?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={user.avatar_url} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>
      {initials}
    </span>
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spinner" style={{ width: size, height: size }} aria-label="Carregando" />;
}

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

/** Janela: centralizada no computador, folha que sobe de baixo no celular. */
export function Modal({ open, onClose, children, label }: { open: boolean; onClose: () => void; children: React.ReactNode; label?: string }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => setNarrow(window.matchMedia('(max-width: 599px)').matches), [open]);

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
            <motion.div
              className="modal"
              role="dialog"
              aria-modal
              aria-label={label}
              initial={narrow ? { y: '100%' } : { opacity: 0, scale: 0.94, y: 12 }}
              animate={narrow ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={narrow ? { y: '100%' } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={narrow ? { duration: 0.42, ease: [0.16, 1, 0.3, 1] } : SPRING}
            >
              {children}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, onClose]);
  return (
    <Portal>
      <AnimatePresence>
        {src && (
          <motion.div className="lightbox" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={EASE}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <motion.img src={src} alt="" initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={EASE_OUT} />
            <button className="btn btn-icon" style={{ position: 'fixed', top: 16, right: 16, color: '#fff' }} aria-label="Fechar">
              <X />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Abas com a pílula deslizando entre as opções. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.id} role="tab" aria-selected={value === o.id} data-active={value === o.id} onClick={() => onChange(o.id)}>
          {value === o.id && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={SPRING} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function CopyCode({ code }: { code: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="code-pill"
      title="Copiar ID"
      onClick={async () => {
        await navigator.clipboard.writeText(code).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {code}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={String(done)} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} transition={{ duration: 0.18 }} style={{ display: 'inline-flex' }}>
          {done ? <Check size={14} color="var(--primary)" /> : <Copy size={14} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

export function Empty({ emoji, title, children }: { emoji: string; title: string; children?: React.ReactNode }) {
  return (
    <motion.div className="empty" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={EASE_OUT}>
      <div className="emoji">{emoji}</div>
      <div className="bold" style={{ color: 'var(--ink)' }}>
        {title}
      </div>
      {children && <div className="small" style={{ marginTop: 4 }}>{children}</div>}
    </motion.div>
  );
}

/** Número que sobe/desce com animação quando muda (curtidas, foguinhos). */
export function Count({ value }: { value: number }) {
  return (
    <span className="count" style={{ display: 'inline-grid', overflow: 'hidden' }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: '-90%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '90%', opacity: 0 }} transition={{ duration: 0.28, ease: [0.45, 0, 0.55, 1] }}>
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
