/**
 * Resumo público da fazenda (patrimônio) que os amigos podem ver.
 * Montado no navegador a partir de um save do app de gestão (ou de um backup
 * colado) e validado de novo no servidor.
 */

export interface FarmField {
  name: string;
  areaHa: number;
  mapNo?: number;
  owned: boolean;
  crop?: string;
  color?: string;
  harvest?: string;
}
export interface FarmMachine {
  name: string;
  brand?: string;
  category: string;
  value: number;
  hours: number;
  powerCv?: number;
  owned: boolean;
  photo?: string;
}
export interface FarmAnimal {
  name: string;
  species: string;
  count: number;
  capacity: number;
  health: number;
  product?: string;
  value: number;
  photo?: string;
}
export interface FarmStock {
  name: string;
  color?: string;
  qty: number;
}
export interface FarmSnapshot {
  farmName: string;
  map: string;
  currency: string;
  qtyUnit: string;
  period: string;
  cash: number;
  loan: number;
  fields: FarmField[];
  machines: FarmMachine[];
  animals: FarmAnimal[];
  stock: FarmStock[];
}

const MAPS: Record<string, string> = { riverbend: 'Riverbend Springs', zielonka: 'Zielonka', hutan: 'Hutan Pantai' };
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

type AnyRec = Record<string, unknown>;
const arr = (v: unknown): AnyRec[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === 'object') as AnyRec[]) : []);
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const s = (v: unknown, max = 80) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const optS = (v: unknown, max = 80) => s(v, max) || undefined;
const optN = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);
const url = (v: unknown) => (typeof v === 'string' && /^https:\/\//.test(v) && v.length < 600 ? v : undefined);

/** Converte os dados de um save (formato do app de gestão) no resumo público. */
export function snapshotFromSave(raw: unknown): FarmSnapshot {
  const d = (raw && typeof raw === 'object' ? raw : {}) as AnyRec;
  const st = (d.settings && typeof d.settings === 'object' ? d.settings : {}) as AnyRec;
  if (!Array.isArray(d.fields) && !Array.isArray(d.machines) && !Array.isArray(d.animals)) throw new Error('Esse texto não parece um save do AgroGestor.');

  const crops = new Map(arr(d.crops).map((c) => [s(c.id), { name: s(c.name), color: s(c.color, 12) }]));
  const plantings = arr(d.plantings).filter((p) => !p.harvested && !p.lost);
  const pricePer = n(st.pricePer) || 1;

  const sales = arr(d.sales).reduce((a, x) => a + (n(x.qty) * n(x.unitPrice)) / pricePer, 0);
  const tx = arr(d.transactions).reduce((a, t) => a + (t.type === 'receita' ? n(t.amount) : -n(t.amount)), 0);

  const stock = new Map<string, number>();
  arr(d.plantings).filter((p) => p.harvested).forEach((p) => stock.set(s(p.cropId), (stock.get(s(p.cropId)) ?? 0) + n(p.harvestedQty)));
  arr(d.sales).forEach((x) => stock.set(s(x.cropId), (stock.get(s(x.cropId)) ?? 0) - n(x.qty)));
  arr(d.stockMoves).filter((m) => m.kind === 'producao').forEach((m) => stock.set(s(m.item), (stock.get(s(m.item)) ?? 0) + n(m.qty)));

  const map = s(st.map);
  const year = n(st.gameYear);
  const month = n(st.gameMonth);
  const calendar = st.calendarMode === 'real' ? String(year) : `ano ${year}`;

  return sanitizeSnapshot({
    farmName: s(st.farmName) || 'Minha fazenda',
    map: MAPS[map] ?? (s(st.mapName) || 'Outro mapa'),
    currency: s(st.currency, 6) || '$',
    qtyUnit: s(st.qtyUnit, 6) || 'L',
    period: month >= 1 && month <= 12 ? `${MONTHS[month - 1]} · ${calendar}` : '',
    cash: n(st.startMoney) + sales + tx,
    loan: n(st.loan),
    fields: arr(d.fields).map((f) => {
      const p = plantings.find((x) => x.fieldId === f.id);
      const c = p ? crops.get(s(p.cropId)) : undefined;
      return {
        name: s(f.name),
        areaHa: n(f.areaHa),
        mapNo: optN(f.mapNo),
        owned: f.ownership !== 'arrendado',
        crop: c?.name,
        color: c?.color,
        harvest: p ? `${MONTHS[(n(p.harvestMonth) || 1) - 1]}` : undefined,
      };
    }),
    machines: arr(d.machines).map((m) => ({
      name: s(m.name),
      brand: optS(m.brand),
      category: s(m.category, 40),
      value: n(m.value),
      hours: n(m.hours),
      powerCv: optN(m.powerCv),
      owned: m.ownership === 'proprio' || !m.ownership,
      photo: url(m.photo),
    })),
    animals: arr(d.animals).map((a) => ({
      name: s(a.name),
      species: s(a.species, 40),
      count: n(a.count),
      capacity: n(a.capacity),
      health: n(a.health),
      product: optS(a.product, 40),
      value: n(a.value),
      photo: url(a.photo),
    })),
    stock: [...stock.entries()]
      .filter(([, q]) => q > 0)
      .map(([id, qty]) => ({ name: crops.get(id)?.name || id, color: crops.get(id)?.color, qty }))
      .sort((a, b) => b.qty - a.qty),
  });
}

/** Limita tamanhos e tipos (usado no servidor antes de gravar). */
export function sanitizeSnapshot(raw: unknown): FarmSnapshot {
  const d = (raw && typeof raw === 'object' ? raw : {}) as AnyRec;
  return {
    farmName: s(d.farmName) || 'Minha fazenda',
    map: s(d.map, 60),
    currency: s(d.currency, 6) || '$',
    qtyUnit: s(d.qtyUnit, 6) || 'L',
    period: s(d.period, 40),
    cash: n(d.cash),
    loan: Math.max(0, n(d.loan)),
    fields: arr(d.fields)
      .slice(0, 300)
      .map((f) => ({ name: s(f.name), areaHa: Math.max(0, n(f.areaHa)), mapNo: optN(f.mapNo), owned: f.owned !== false, crop: optS(f.crop, 40), color: optS(f.color, 12), harvest: optS(f.harvest, 12) })),
    machines: arr(d.machines)
      .slice(0, 300)
      .map((m) => ({ name: s(m.name), brand: optS(m.brand), category: s(m.category, 40), value: Math.max(0, n(m.value)), hours: Math.max(0, n(m.hours)), powerCv: optN(m.powerCv), owned: m.owned !== false, photo: url(m.photo) })),
    animals: arr(d.animals)
      .slice(0, 100)
      .map((a) => ({ name: s(a.name), species: s(a.species, 40), count: Math.max(0, n(a.count)), capacity: Math.max(0, n(a.capacity)), health: Math.min(100, Math.max(0, n(a.health))), product: optS(a.product, 40), value: Math.max(0, n(a.value)), photo: url(a.photo) })),
    stock: arr(d.stock)
      .slice(0, 60)
      .map((x) => ({ name: s(x.name, 40), color: optS(x.color, 12), qty: Math.max(0, n(x.qty)) })),
  };
}

export function farmTotals(f: FarmSnapshot) {
  const machines = f.machines.filter((m) => m.owned).reduce((a, m) => a + m.value, 0);
  const animals = f.animals.reduce((a, x) => a + x.value, 0);
  const area = f.fields.reduce((a, x) => a + x.areaHa, 0);
  const ownedArea = f.fields.filter((x) => x.owned).reduce((a, x) => a + x.areaHa, 0);
  const heads = f.animals.reduce((a, x) => a + x.count, 0);
  const planted = f.fields.filter((x) => x.crop).length;
  return { machines, animals, area, ownedArea, heads, planted, worth: f.cash - f.loan + machines + animals };
}
