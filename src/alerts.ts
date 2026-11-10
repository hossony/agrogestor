import { activePlantings, plantingStatus, sellAdvice } from './selectors';
import { Data } from './types';
import { MONTHS_FULL, money, periodIndex } from './utils';

export type AlertTone = 'yellow' | 'blue' | 'green' | 'red';
export interface FarmAlert {
  id: string;
  tone: AlertTone;
  kind: 'colheita' | 'venda' | 'tarefa' | 'revisao' | 'solo' | 'plantio' | 'animal';
  title: string;
  detail: string;
  route: 'safras' | 'vendas' | 'tarefas' | 'frota' | 'talhoes' | 'calendario' | 'animais';
}

/** Tudo o que pede atenção agora, calculado a partir do estado da fazenda. */
export function farmAlerts(d: Data, now: { year: number; month: number }): FarmAlert[] {
  const st = d.settings;
  const nowIdx = periodIndex(now.year, now.month);
  const stamp = `${now.year}-${now.month}`;
  const out: FarmAlert[] = [];
  const cropName = (id: string) => d.crops.find((x) => x.id === id)?.name ?? 'lavoura';
  const fieldName = (id?: string) => d.fields.find((x) => x.id === id)?.name;

  const active = activePlantings(d);
  active
    .filter((p) => plantingStatus(p, nowIdx) === 'pronto')
    .forEach((p) => out.push({ id: `colher:${p.id}`, tone: 'yellow', kind: 'colheita', title: `Colher ${cropName(p.cropId).toLowerCase()}`, detail: `${fieldName(p.fieldId) ?? 'O talhão'} está pronto para a colheita.`, route: 'safras' }));

  sellAdvice(d, now.month)
    .filter((a) => a.sellNow)
    .forEach((a) => out.push({ id: `vender:${a.crop.id}:${stamp}`, tone: 'blue', kind: 'venda', title: `Vender ${a.crop.name.toLowerCase()}`, detail: `Preço perto do pico do ano. O estoque vale cerca de ${money(a.valueNow, st)}.`, route: 'vendas' }));

  d.tasks
    .filter((t) => !t.done)
    .forEach((t) => {
      const diff = periodIndex(t.year, t.month) - nowIdx;
      if (diff < 0) out.push({ id: `atrasada:${t.id}`, tone: 'red', kind: 'tarefa', title: `Atrasada: ${t.title}`, detail: `Estava prevista para ${MONTHS_FULL[t.month - 1].toLowerCase()}${fieldName(t.fieldId) ? `, ${fieldName(t.fieldId)}` : ''}.`, route: 'tarefas' });
      else if (diff === 0) out.push({ id: `mes:${t.id}`, tone: 'green', kind: 'tarefa', title: t.title, detail: `Para este mês${fieldName(t.fieldId) ? `, ${fieldName(t.fieldId)}` : ''}.`, route: 'tarefas' });
    });

  d.machines
    .filter((m) => m.serviceAt > 0 && m.hours >= m.serviceAt * 0.9)
    .forEach((m) => out.push({ id: `revisao:${m.id}:${m.serviceAt}`, tone: m.hours >= m.serviceAt ? 'red' : 'yellow', kind: 'revisao', title: m.hours >= m.serviceAt ? `Revisão vencida: ${m.name}` : `Revisão chegando: ${m.name}`, detail: `${Math.round(m.hours)} de ${Math.round(m.serviceAt)} horas.`, route: 'frota' }));

  d.fields.filter((f) => f.weeds).forEach((f) => out.push({ id: `ervas:${f.id}`, tone: 'yellow', kind: 'solo', title: `Ervas daninhas em ${f.name}`, detail: 'Pulverize ou capine antes que a produtividade caia.', route: 'talhoes' }));

  d.animals.forEach((a) => {
    if (a.health < 60) out.push({ id: `saude:${a.id}:${stamp}`, tone: 'red', kind: 'animal', title: `Saúde baixa: ${a.name}`, detail: `${a.species} com ${Math.round(a.health)}% de saúde. Confira comida, água e palha.`, route: 'animais' });
    else if (a.capacity > 0 && a.count >= a.capacity) out.push({ id: `lotado:${a.id}:${a.count}`, tone: 'yellow', kind: 'animal', title: `${a.name} está cheio`, detail: `${a.count} de ${a.capacity} vagas. Venda animais ou amplie o espaço.`, route: 'animais' });
  });

  const planted = new Set(active.map((p) => p.fieldId));
  const free = d.fields.filter((f) => !planted.has(f.id));
  const closing = d.crops.filter((x) => x.plantMonths.includes(now.month) && !x.plantMonths.includes((now.month % 12) + 1));
  if (free.length && closing.length)
    out.push({ id: `janela:${stamp}`, tone: 'green', kind: 'plantio', title: `Último mês para plantar ${closing.length === 1 ? closing[0].name.toLowerCase() : `${closing.length} culturas`}`, detail: `${free.length} ${free.length === 1 ? 'talhão livre' : 'talhões livres'}. ${closing.slice(0, 4).map((x) => x.name).join(', ')}.`, route: 'calendario' });

  const order: Record<AlertTone, number> = { red: 0, yellow: 1, blue: 2, green: 3 };
  return out.sort((a, b) => order[a.tone] - order[b.tone]);
}
