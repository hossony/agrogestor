/**
 * Catálogo de máquinas do FS25. O mesmo arquivo existe no app (src/community/catalog.ts).
 * Os dados ficam no banco e são editados pelo dono no painel; aqui só o formato.
 */
export interface CatalogMachine {
  id: string;
  brand: string;
  model: string;
  category: string;
  price: number | null;
  hp_min: number | null;
  hp_max: number | null;
  speed: number | null;
  width: number | null;
  capacity: number | null;
  weight: number | null;
  upkeep: number | null;
  image_url: string | null;
  notes: string;
  verified: boolean;
}

export const CATALOG_CATEGORIES = [
  'Trator',
  'Colheitadeira',
  'Plataforma de corte',
  'Carregadeira',
  'Caminhão',
  'Reboque',
  'Plantadeira',
  'Pulverizador',
  'Adubadora',
  'Arado / grade',
  'Enfardadeira',
  'Forrageira',
  'Florestal',
  'Outro',
];

export const machineName = (m: Pick<CatalogMachine, 'brand' | 'model'>) => `${m.brand} ${m.model}`.trim();

export function hpLabel(m: Pick<CatalogMachine, 'hp_min' | 'hp_max'>): string {
  if (!m.hp_max && !m.hp_min) return '';
  if (m.hp_min && m.hp_max && m.hp_min !== m.hp_max) return `${m.hp_min}–${m.hp_max} cv`;
  return `${m.hp_max ?? m.hp_min} cv`;
}

/** Limpa o que vem do painel do dono antes de gravar. */
export function cleanCatalogInput(raw: unknown): Omit<CatalogMachine, 'id' | 'verified'> & { verified: boolean } {
  const d = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const n = (v: unknown) => {
    const x = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v.replace(/\./g, '').replace(',', '.')) : NaN;
    return Number.isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : null;
  };
  const img = s(d.image_url, 600);
  return {
    brand: s(d.brand, 60),
    model: s(d.model, 80),
    category: CATALOG_CATEGORIES.includes(s(d.category, 40)) ? s(d.category, 40) : 'Outro',
    price: n(d.price),
    hp_min: n(d.hp_min),
    hp_max: n(d.hp_max),
    speed: n(d.speed),
    width: n(d.width),
    capacity: n(d.capacity),
    weight: n(d.weight),
    upkeep: n(d.upkeep),
    image_url: /^(https:\/\/|\/uploads\/)/.test(img) ? img : null,
    notes: s(d.notes, 400),
    verified: d.verified === true,
  };
}
