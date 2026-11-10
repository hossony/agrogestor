import { Crop, Data, Planting } from './types';
import { periodIndex, priceAt } from './utils';

export type PlantingStatus = 'crescendo' | 'pronto' | 'colhido' | 'perdido';

export function plantingStatus(p: Planting, nowIdx: number): PlantingStatus {
  if (p.lost) return 'perdido';
  if (p.harvested) return 'colhido';
  return nowIdx >= periodIndex(p.harvestYear, p.harvestMonth) ? 'pronto' : 'crescendo';
}

export const STATUS_LABEL: Record<PlantingStatus, string> = {
  crescendo: 'Em crescimento',
  pronto: 'Pronto para colher',
  colhido: 'Colhido',
  perdido: 'Perdido',
};

export const activePlantings = (d: Data) => d.plantings.filter((p) => !p.harvested && !p.lost);

export const saleTotal = (qty: number, unitPrice: number, pricePer: number) => (qty * unitPrice) / (pricePer || 1);

/** Estoque de produção por cultura: colhido − vendido ± ajustes manuais. */
export function cropStock(d: Data): { crop: Crop; harvested: number; sold: number; adjust: number; balance: number }[] {
  return d.crops
    .map((crop) => {
      const harvested = d.plantings.filter((p) => p.cropId === crop.id && p.harvested).reduce((a, p) => a + p.harvestedQty, 0);
      const sold = d.sales.filter((s) => s.cropId === crop.id).reduce((a, s) => a + s.qty, 0);
      const adjust = d.stockMoves.filter((m) => m.kind === 'producao' && m.item === crop.id).reduce((a, m) => a + m.qty, 0);
      return { crop, harvested, sold, adjust, balance: harvested - sold + adjust };
    })
    .filter((x) => x.harvested || x.sold || x.adjust);
}

export function inputStock(d: Data): { item: string; unit: string; balance: number }[] {
  const map = new Map<string, { item: string; unit: string; balance: number }>();
  d.stockMoves
    .filter((m) => m.kind === 'insumo')
    .forEach((m) => {
      const cur = map.get(m.item) ?? { item: m.item, unit: m.unit || '', balance: 0 };
      cur.balance += m.qty;
      if (m.unit) cur.unit = m.unit;
      map.set(m.item, cur);
    });
  return [...map.values()].sort((a, b) => a.item.localeCompare(b.item));
}

export interface MonthFlow {
  month: number;
  income: number;
  expense: number;
}

export function yearFlow(d: Data, year: number): MonthFlow[] {
  const out: MonthFlow[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, income: 0, expense: 0 }));
  d.sales.filter((s) => s.year === year).forEach((s) => (out[s.month - 1].income += saleTotal(s.qty, s.unitPrice, d.settings.pricePer)));
  d.transactions
    .filter((t) => t.year === year)
    .forEach((t) => {
      if (t.type === 'receita') out[t.month - 1].income += t.amount;
      else out[t.month - 1].expense += t.amount;
    });
  return out;
}

export interface SellAdvice {
  crop: Crop;
  balance: number;
  priceNow: number;
  valueNow: number;
  bestMonth: number;
  valueBest: number;
  gainPct: number;
  sellNow: boolean;
}

/** Para cada produto em estoque, compara o preço estimado deste mês com o pico do ano. */
export function sellAdvice(d: Data, month: number): SellAdvice[] {
  return cropStock(d)
    .filter((x) => x.balance > 0 && x.crop.avgPrice > 0)
    .map(({ crop, balance }) => {
      const priceNow = priceAt(crop, month);
      const priceBest = priceAt(crop, crop.bestMonth);
      const per = d.settings.pricePer || 1;
      const gainPct = priceNow > 0 ? (priceBest / priceNow - 1) * 100 : 0;
      return {
        crop,
        balance,
        priceNow,
        valueNow: (balance * priceNow) / per,
        bestMonth: crop.bestMonth,
        valueBest: (balance * priceBest) / per,
        gainPct,
        sellNow: gainPct < 3,
      };
    })
    .sort((a, b) => b.valueNow - a.valueNow);
}

export function cropProfit(d: Data, year: number) {
  return d.crops
    .map((crop) => {
      const revenue = d.sales.filter((s) => s.cropId === crop.id && s.year === year).reduce((a, s) => a + saleTotal(s.qty, s.unitPrice, d.settings.pricePer), 0);
      const cost = d.transactions.filter((t) => t.cropId === crop.id && t.year === year && t.type === 'despesa').reduce((a, t) => a + t.amount, 0);
      return { crop, revenue, cost, profit: revenue - cost };
    })
    .filter((x) => x.revenue || x.cost)
    .sort((a, b) => b.profit - a.profit);
}
