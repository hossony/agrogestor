import { Crop, Settings } from './types';

export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
export const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/** Formata números no padrão brasileiro sem depender de Intl (ausente em alguns Androids). */
export function num(v: number, decimals = 0): string {
  if (!isFinite(v)) return '0';
  const neg = v < 0;
  const fixed = Math.abs(v).toFixed(decimals);
  const [int, dec] = fixed.split('.');
  const withDots = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + withDots + (dec ? ',' + dec : '');
}

export const money = (v: number, s: Settings) => `${v < 0 ? '-' : ''}${s.currency} ${num(Math.abs(v), 0)}`;
export const qty = (v: number, s: Settings) => `${num(v, 0)} ${s.qtyUnit}`;

export function parseNum(text: string): number {
  const t = String(text ?? '').trim().replace(/\s/g, '');
  if (!t) return NaN;
  const normalized = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t;
  return Number(normalized);
}

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const isoToBr = (iso: string) => {
  const [y, m, d] = String(iso || '').split('-');
  return y && m && d ? `${d}/${m}/${y}` : '';
};
/** Aceita DD/MM/AAAA e devolve AAAA-MM-DD, ou null se a data não existir. */
export function brToIso(text: string): string | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(text || '').trim());
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export const periodIndex = (year: number, month: number) => year * 12 + (month - 1);

export function now(s: Settings): { year: number; month: number } {
  if (s.calendarMode === 'game') return { year: s.gameYear, month: s.gameMonth };
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export const yearLabel = (year: number, s: Settings) => (s.calendarMode === 'game' ? `ano ${year}` : String(year));
/** "do ano 2" no jogo, "de 2026" na vida real. */
export const ofYear = (year: number, s: Settings) => (s.calendarMode === 'game' ? `do ano ${year}` : `de ${year}`);
export const inYear = (year: number, s: Settings) => (s.calendarMode === 'game' ? `no ano ${year}` : `em ${year}`);
export const periodLabel = (year: number, month: number, s: Settings) =>
  s.calendarMode === 'game' ? `${MONTHS[month - 1]}, ano ${year}` : `${MONTHS[month - 1]}/${year}`;

const circ = (a: number, b: number) => {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
};

/**
 * Curva de preço estimada ao longo do ano: pico no melhor mês de venda e
 * vale na colheita, quando o mercado está cheio.
 */
export function priceFactor(crop: Crop, month: number): number {
  if (!crop.avgPrice) return 0;
  const amp = Math.max(0, crop.bestPrice / crop.avgPrice - 1);
  const peak = crop.bestMonth;
  let low = crop.harvestMonths[0] ?? ((peak + 5) % 12) + 1;
  if (low === peak) low = ((peak + 5) % 12) + 1;
  const dPeak = circ(month, peak);
  const dLow = circ(month, low);
  return 1 + (amp * (dLow - dPeak)) / (dLow + dPeak || 1);
}

export const priceAt = (crop: Crop, month: number) => crop.avgPrice * priceFactor(crop, month);

/** Primeiro mês de colheita possível depois do plantio. */
export function expectedHarvest(crop: Crop, year: number, month: number): { year: number; month: number } {
  for (let k = 2; k <= 13; k++) {
    const idx = periodIndex(year, month) + k;
    const m = (idx % 12) + 1;
    if (crop.harvestMonths.includes(m)) return { year: Math.floor(idx / 12), month: m };
  }
  const idx = periodIndex(year, month) + 6;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
