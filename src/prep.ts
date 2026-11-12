import { activePlantings } from './selectors';
import { Crop, Data, Field } from './types';

/**
 * Assistente de preparo: diz, para cada talhão, as etapas que faltam na ordem
 * certa e o que muda no talhão quando a etapa é concluída.
 */

export type PrepKey = 'pedras' | 'calcario' | 'arar' | 'alagar' | 'adubo1' | 'adubo2' | 'ervas';

export interface PrepStep {
  key: PrepKey;
  title: string;
  why: string;
  how: string;
  tool: string;
  /** Tipo do registro no Diário. */
  workType: string;
  done: boolean;
  /** Alteração no talhão ao concluir. */
  patch: Partial<Field>;
  /** Id do tópico/situação do guia com mais detalhes. */
  guide: string;
}

export function prepSteps(f: Field, planted: boolean): PrepStep[] {
  const fert = f.fertLevel ?? 0;
  const steps: PrepStep[] = [
    {
      key: 'pedras',
      title: 'Recolher pedras',
      why: 'Pedras danificam cultivador, semeadora e colheitadeira.',
      how: 'Passe o catador de pedras por toda a área marcada no mapa de solo.',
      tool: 'Catador de pedras',
      workType: 'Pedras',
      done: !f.stones,
      patch: { stones: false },
      guide: 'pedras',
    },
    {
      key: 'calcario',
      title: 'Aplicar calcário',
      why: 'Solo ácido produz menos. Vale por cerca de 3 colheitas.',
      how: 'Espalhe com o distribuidor de calcário, antes de arar ou cultivar.',
      tool: 'Distribuidor de calcário',
      workType: 'Calcário',
      done: f.limed,
      patch: { limed: true },
      guide: 'calcario',
    },
    {
      key: 'arar',
      title: planted ? 'Arar depois da colheita' : 'Arar ou cultivar',
      why: 'Quando o campo pede aração, a produção cai até você arar.',
      how: planted ? 'A lavoura está no campo: deixe para depois da colheita.' : 'Use arado ou subsolador. Depois recolha pedras que subirem.',
      tool: 'Arado / subsolador',
      workType: 'Aração',
      done: f.plowed,
      patch: { plowed: true },
      guide: 'arar',
    },
    {
      key: 'adubo1',
      title: '1ª adubação',
      why: 'Cada nível de adubo aumenta a produção. O máximo são 2.',
      how: 'Esterco ou chorume antes de cultivar, ou semeadora com tanque de adubo.',
      tool: 'Adubadora / semeadora com adubo',
      workType: 'Adubação',
      done: fert >= 1,
      patch: { fertLevel: Math.max(fert, 1) },
      guide: 'adubos-tipos',
    },
    {
      key: 'adubo2',
      title: '2ª adubação',
      why: 'Completa a adubação máxima do ciclo.',
      how: 'Fertilizante sólido ou líquido nas primeiras fases de crescimento.',
      tool: 'Distribuidor ou pulverizador',
      workType: 'Adubação',
      done: fert >= 2,
      patch: { fertLevel: 2 },
      guide: 'adubos-quando',
    },
    {
      key: 'ervas',
      title: 'Eliminar ervas daninhas',
      why: 'Ervas daninhas roubam boa parte da produção.',
      how: planted ? 'Lavoura pequena: capinadeira mecânica. Lavoura alta: herbicida.' : 'Campo vazio: cultive ou aplique herbicida antes de semear.',
      tool: 'Capinadeira ou pulverizador',
      workType: 'Pulverização',
      done: !f.weeds,
      patch: { weeds: false },
      guide: planted ? 'ervas-pequena' : 'ervas-antes',
    },
  ];
  if (f.rice) {
    // Arrozal: precisa estar alagado antes do plantio.
    steps.splice(3, 0, {
      key: 'alagar',
      title: 'Alagar o arrozal',
      why: 'O arroz só pode ser plantado com o campo alagado.',
      how: planted ? 'Mantenha o nível da água durante o crescimento.' : 'Encha o campo pela bomba de alagamento antes de entrar com a plantadeira de mudas.',
      tool: 'Bomba de alagamento',
      workType: 'Outros',
      done: !!f.flooded || planted,
      patch: { flooded: true },
      guide: 'arroz-agua',
    });
  }
  return steps;
}

export interface FieldPrep {
  field: Field;
  planted: boolean;
  steps: PrepStep[];
  done: number;
  next?: PrepStep;
  /** Culturas que podem ser plantadas neste mês (quando o talhão está livre). */
  canPlant: Crop[];
}

export function farmPrep(d: Data, month: number): FieldPrep[] {
  const active = new Set(activePlantings(d).map((p) => p.fieldId));
  const canPlant = d.crops.filter((x) => x.plantMonths.includes(month));
  return d.fields.map((field) => {
    const planted = active.has(field.id);
    const steps = prepSteps(field, planted);
    const done = steps.filter((s) => s.done).length;
    return { field, planted, steps, done, next: steps.find((s) => !s.done), canPlant: planted ? [] : canPlant };
  });
}

/** Dica contextual a partir do estado da fazenda (para o Painel). */
export function contextTips(d: Data, month: number): { text: string; field?: string }[] {
  const out: { text: string; field?: string }[] = [];
  farmPrep(d, month).forEach((p) => {
    if (p.next) out.push({ text: `${p.field.name}: próxima etapa é "${p.next.title.toLowerCase()}". ${p.next.how}`, field: p.field.id });
    else if (!p.planted && p.canPlant.length) out.push({ text: `${p.field.name} está pronto e livre. Dá para plantar ${p.canPlant.slice(0, 3).map((x) => x.name.toLowerCase()).join(', ')} neste mês.`, field: p.field.id });
  });
  return out;
}
