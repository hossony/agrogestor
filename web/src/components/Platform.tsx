'use client';

/** Plataformas em que a pessoa joga (opcional no cadastro). */
export const PLATFORMS = [
  { id: 'ps', label: 'PlayStation', color: '#0070D1' },
  { id: 'xbox', label: 'Xbox', color: '#107C10' },
  { id: 'pc', label: 'PC', color: '#3A4750' },
] as const;

export const platformLabel = (id?: string | null) => PLATFORMS.find((p) => p.id === id)?.label ?? '';

/** Ícone desenhado à mão para cada plataforma (inspirado nos botões de cada console). */
export function PlatformIcon({ id, size = 18, color }: { id?: string | null; size?: number; color?: string }) {
  const p = PLATFORMS.find((x) => x.id === id);
  if (!p) return null;
  const c = color ?? p.color;
  if (p.id === 'ps')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-label="PlayStation" role="img">
        <path d="M7 3.5l3.2 5.5H3.8z" />
        <circle cx="17" cy="7" r="3.2" />
        <path d="M4 15l5 5M9 15l-5 5" />
        <rect x="14" y="14.5" width="6" height="6" rx="0.8" />
      </svg>
    );
  if (p.id === 'xbox')
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" aria-label="Xbox" role="img">
        <circle cx="12" cy="12" r="9.5" />
        <path d="M6.5 6.8c3 1.6 7.6 6.6 10.4 11M17.5 6.8c-3 1.6-7.6 6.6-10.4 11" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-label="PC" role="img">
      <rect x="2.5" y="4" width="19" height="12.5" rx="2" />
      <path d="M8 20.5h8M12 16.5v4" />
    </svg>
  );
}

/** Escolha da plataforma: três botões grandes com o ícone; tocar de novo desmarca. */
export function PlatformPicker({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) {
  return (
    <div className="platform-picker" role="radiogroup" aria-label="Plataforma">
      {PLATFORMS.map((p) => {
        const on = value === p.id;
        return (
          <button key={p.id} type="button" role="radio" aria-checked={on} className="platform-opt" data-on={on} style={{ ['--pc' as string]: p.color }} onClick={() => onChange(on ? null : p.id)}>
            <PlatformIcon id={p.id} size={26} color={on ? '#fff' : p.color} />
            <span>{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
