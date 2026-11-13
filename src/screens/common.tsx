import { FieldDef, Option, StripCell } from '../ui';
import { Crop, Data, Planting } from '../types';
import { periodIndex } from '../utils';

export type Route = 'painel' | 'talhoes' | 'safras' | 'calendario' | 'estoque' | 'vendas' | 'financeiro' | 'tarefas' | 'diario' | 'frota' | 'animais' | 'avisos' | 'culturas' | 'ajustes' | 'guia';
export interface Nav {
  /** `intent: 'novo'` abre a tela já com o formulário de cadastro. */
  go: (r: Route, intent?: string) => void;
  intent?: string;
}

export const WORK_TYPES = ['Aração', 'Calcário', 'Adubação', 'Plantio', 'Pulverização', 'Pedras', 'Colheita', 'Transporte', 'Manutenção', 'Venda', 'Animais', 'Outros'];

/** Formulário do diário de campo, usado em Diário e ao concluir uma tarefa. */
export const recordFields = (d: Data): FieldDef[] => [
  { key: 'title', label: 'O que foi feito', type: 'text', required: true, placeholder: 'Ex.: Colheita do trigo' },
  { key: 'type', label: 'Tipo', type: 'select', required: true, half: true, options: WORK_TYPES.map((x) => ({ value: x, label: x })) },
  { key: 'date', label: 'Feito em', type: 'date', required: true, half: true, placeholder: 'dd/mm/aaaa' },
  { key: 'fieldId', label: 'Talhão (opcional)', type: 'select', options: [{ value: '', label: 'Nenhum' }, ...fieldOptions(d)] },
  { key: 'photo', label: 'Imagem', type: 'photo' },
  { key: 'video', label: 'Vídeo', type: 'video', hint: 'Ex.: um vídeo colhendo, plantando ou arando.' },
  { key: 'notes', label: 'Anotações', type: 'multiline' },
];

export const periodFields = (monthLabel = 'Mês'): FieldDef[] => [
  { key: 'month', label: monthLabel, type: 'month', required: true },
  { key: 'year', label: 'Ano', type: 'number', required: true, half: true },
];

export const fieldOptions = (d: Data): Option[] => d.fields.map((f) => ({ value: f.id, label: `${f.name} (${String(f.areaHa).replace('.', ',')} ha)` }));
export const cropOptions = (d: Data, sellableOnly = false): Option[] =>
  d.crops
    .filter((x) => !sellableOnly || x.avgPrice > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((x) => ({ value: x.id, label: x.name }));

export const cropById = (d: Data, id?: string) => d.crops.find((x) => x.id === id);
export const fieldById = (d: Data, id?: string) => d.fields.find((x) => x.id === id);

/** Janela fixa da cultura: plantio, colheita e melhor mês de venda. */
export function cropCells(crop: Crop): StripCell[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    if (crop.plantMonths.includes(m)) return 'plant';
    if (crop.harvestMonths.includes(m)) return 'harvest';
    return 'empty';
  });
}

/** Ciclo de uma lavoura dentro do ano mostrado. */
export function plantingCells(p: Planting, year: number): StripCell[] {
  const start = periodIndex(p.year, p.month);
  const end = periodIndex(p.harvestYear, p.harvestMonth);
  return Array.from({ length: 12 }, (_, i) => {
    const idx = periodIndex(year, i + 1);
    if (idx === start) return 'plant';
    if (idx === end) return 'harvest';
    if (idx > start && idx < end) return 'grow';
    return 'empty';
  });
}
