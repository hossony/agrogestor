'use client';

import { sortBadges } from '@/lib/badges';

/**
 * Selos ao lado do nome. `size="sm"` para listas (feed, comentários),
 * `size="md"` para o perfil. O selo de dono tem o brilho holográfico.
 */
export function Badges({ ids, size = 'sm', max }: { ids?: string[] | null; size?: 'sm' | 'md'; max?: number }) {
  const list = sortBadges(ids);
  if (!list.length) return null;
  const shown = max ? list.slice(0, max) : list;
  return (
    <span className="badges" data-size={size}>
      {shown.map((b) => (
        <span key={b.id} className={`badge-seal ${b.id === 'owner' ? 'badge-owner' : ''}`} style={{ background: b.color, color: b.ink }} title={`${b.label}: ${b.desc}`} aria-label={b.label}>
          <BadgeIcon id={b.id} />
          {size === 'md' && <span>{b.short}</span>}
        </span>
      ))}
      {max && list.length > max ? <span className="tiny faint">+{list.length - max}</span> : null}
    </span>
  );
}

function BadgeIcon({ id }: { id: string }) {
  // Ícones simples em SVG, um por selo.
  const common = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (id) {
    case 'owner':
      return (
        <svg {...common}>
          <path d="M3 18h18M4 17l2-9 5 5 1-8 1 8 5-5 2 9" />
        </svg>
      );
    case 'verified':
      return (
        <svg {...common}>
          <path d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'creator':
      return (
        <svg {...common}>
          <path d="M6 5l12 7-12 7z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'streamer':
      return (
        <svg {...common}>
          <path d="M12 4v4M5 9a7 7 0 0014 0M9 20h6" />
        </svg>
      );
    case 'veteran':
      return (
        <svg {...common}>
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M12 21s-6-5-6-10a6 6 0 0112 0c0 5-6 10-6 10z" />
        </svg>
      );
  }
}

/** Nome + selos na mesma linha. */
export function NameWithBadges({ name, badges, className }: { name: string; badges?: string[] | null; className?: string }) {
  return (
    <span className={`row ${className ?? ''}`} style={{ gap: 5, display: 'inline-flex', minWidth: 0 }}>
      <span className="ellipsis">{name}</span>
      <Badges ids={badges} max={3} />
    </span>
  );
}
