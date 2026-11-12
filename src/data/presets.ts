import { StartMode } from '../accounts';
import { Animal, Data, Field, Machine, Planting, Task } from '../types';
import { DEFAULT_CROPS } from './crops';
import { emptyData } from './demo';
import { mapById, MapId } from './maps';

/**
 * Início de jogo do Farming Simulator 25: o que cada mapa entrega no modo
 * Novo fazendeiro (fazenda inicial com terra, máquinas e animais) e o que os
 * outros modos mudam.
 *
 * Fontes (nov/2026): wiki do jogo (farmingsimulator.wiki.gg, páginas de cada
 * mapa e de animais), holy.gg, BisectHosting, Gamepressure, modland.net e
 * fs25modhub. Onde as fontes não dão o número exato (área de cada campo,
 * quantidade de animais, preço de loja), o app marca o item para conferir no
 * jogo em vez de inventar um valor.
 */

export const START_MODES: { id: Exclude<StartMode, 'exemplo' | 'importado'>; name: string; summary: string; money: number; loan: number; withFarm: boolean }[] = [
  { id: 'novo', name: 'Novo fazendeiro', summary: 'Fazenda inicial com terra, máquinas básicas e animais. Economia fácil. O melhor para aprender.', money: 100000, loan: 0, withFarm: true },
  { id: 'gerente', name: 'Gerente de fazenda', summary: 'Sem terra e sem máquinas, mas com bastante dinheiro e sem dívidas. Você monta tudo do seu jeito.', money: 1000000, loan: 0, withFarm: false },
  { id: 'zero', name: 'Começo do zero', summary: 'Economia difícil, pouco dinheiro e dívida no banco. Para quem já domina o jogo.', money: 500000, loan: 250000, withFarm: false },
];

type StartStatus = 'vazio' | 'preparar' | 'pronto';

interface StartField {
  /** Número do lote (farmland) no mapa. */
  lot: number;
  name: string;
  areaHa?: number;
  rice?: boolean;
  status: StartStatus;
  cropId?: string;
  plowed?: boolean;
  note: string;
}

interface StartKit {
  fields: StartField[];
  machines: Omit<Machine, 'id' | 'value' | 'hours' | 'serviceAt'>[];
  animals: Omit<Animal, 'id'>[];
  /** Tarefas sugeridas para o primeiro mês. */
  tasks: { title: string; type: string; lot?: number }[];
  /** Estufas e prédios que vêm junto e não são talhões, máquinas nem animais. */
  extras: string[];
}

const SEEDER = { name: 'Great Plains SOLID STAND 1500', brand: 'Great Plains', category: 'Implemento', ownership: 'proprio' as const, notes: 'Semeadora da fazenda inicial.' };
const CULTIVATOR = { name: 'John Deere 980', brand: 'John Deere', category: 'Implemento', ownership: 'proprio' as const, notes: 'Cultivador da fazenda inicial.' };
const COMBINE = { name: 'Massey Ferguson MF 8570', brand: 'Massey Ferguson', category: 'Colheitadeira', ownership: 'proprio' as const, notes: 'Colheitadeira da fazenda inicial.' };
const HEADER = { name: 'Plataforma de grãos (da MF 8570)', brand: 'Massey Ferguson', category: 'Implemento', ownership: 'proprio' as const, notes: 'Plataforma de corte da colheitadeira inicial.' };
const HEADER_TRAILER = { name: 'Carreta da plataforma', category: 'Carreta', ownership: 'proprio' as const, notes: 'Transporta a plataforma de corte pela estrada.' };
const GRAIN_TRAILER = { name: 'Farmtech EDK 650', brand: 'Farmtech', category: 'Carreta', ownership: 'proprio' as const, notes: 'Carreta graneleira da fazenda inicial.' };

export const START_KITS: Partial<Record<MapId, StartKit>> = {
  riverbend: {
    fields: [
      { lot: 1, name: 'Lote 1', status: 'pronto', cropId: 'trigo', note: 'Trigo pronto para colher (é o campo da colheita do tour guiado).' },
      { lot: 2, name: 'Lote 2', status: 'preparar', plowed: false, note: 'Campo para cultivar e plantar canola em agosto, como no tour guiado.' },
      { lot: 3, name: 'Lote 3', status: 'vazio', note: 'Lote da fazenda inicial.' },
      { lot: 4, name: 'Lote 4', status: 'vazio', note: 'Lote da fazenda inicial.' },
      { lot: 5, name: 'Lote 5', status: 'vazio', note: 'Lote da fazenda inicial.' },
    ],
    machines: [
      { name: 'Challenger MT635', brand: 'Challenger', category: 'Trator', ownership: 'proprio', notes: 'Trator da fazenda inicial.' },
      { name: 'John Deere 3650', brand: 'John Deere', category: 'Trator', ownership: 'proprio', notes: 'Trator pequeno da fazenda inicial.' },
      COMBINE,
      HEADER,
      HEADER_TRAILER,
      CULTIVATOR,
      SEEDER,
      GRAIN_TRAILER,
    ],
    animals: [{ name: 'Pasto das vacas', species: 'Vacas', count: 3, capacity: 0, product: 'Leite', health: 100, productivity: 100, value: 0, notes: 'Pasto pequeno da fazenda inicial. Confira no jogo quantas vacas vieram.' }],
    tasks: [
      { title: 'Colher o trigo', type: 'Colheita', lot: 1 },
      { title: 'Cultivar e plantar canola', type: 'Plantio', lot: 2 },
      { title: 'Conferir a área dos lotes no menu de Terras', type: 'Outros' },
    ],
    extras: ['Casa da fazenda', 'Silo', 'Pasto das vacas'],
  },
  zielonka: {
    fields: [
      { lot: 45, name: 'Lote 45', areaHa: 2.43, status: 'vazio', note: 'Lote inicial (6 acres), com galinheiro.' },
      { lot: 46, name: 'Lote 46', areaHa: 1.27, status: 'vazio', note: 'Lote inicial (3,13 acres), com galinheiro.' },
    ],
    machines: [
      { name: 'Challenger MT600', brand: 'Challenger', category: 'Trator', ownership: 'proprio', notes: 'Trator médio da fazenda inicial.' },
      { name: 'John Deere 3650', brand: 'John Deere', category: 'Trator', ownership: 'proprio', notes: 'Trator pequeno da fazenda inicial.' },
      COMBINE,
      HEADER,
      CULTIVATOR,
      SEEDER,
      GRAIN_TRAILER,
    ],
    animals: [{ name: 'Galinheiro inicial', species: 'Galinhas', count: 0, capacity: 0, product: 'Ovos', health: 100, productivity: 100, value: 0, notes: 'Os lotes iniciais vêm com galinheiro e galinhas. Informe a quantidade que aparece no jogo.' }],
    tasks: [
      { title: 'Recolher os ovos do galinheiro', type: 'Animais' },
      { title: 'Conferir o estado do solo dos lotes 45 e 46', type: 'Outros' },
    ],
    extras: ['Galinheiro'],
  },
  hutan: {
    fields: [
      { lot: 27, name: 'Lote 27 (arado)', status: 'vazio', plowed: true, note: 'Pronto para semear: o campo já está arado.' },
      { lot: 28, name: 'Lote 28 (cultivado)', status: 'vazio', plowed: true, note: 'Pronto para semear: o campo já está cultivado.' },
      { lot: 30, name: 'Arrozal 1 (lote 30)', rice: true, status: 'pronto', cropId: 'arroz', note: 'Arroz pronto para colher.' },
      { lot: 30, name: 'Arrozal 2 (lote 30)', rice: true, status: 'pronto', cropId: 'arroz', note: 'Arroz pronto para colher.' },
      { lot: 31, name: 'Arrozal 3 (lote 31)', rice: true, status: 'pronto', cropId: 'arroz', note: 'Arroz pronto para colher.' },
    ],
    machines: [
      { name: 'AGCO 8510', brand: 'AGCO', category: 'Trator', ownership: 'proprio', notes: 'Trator da fazenda inicial.' },
      COMBINE,
      HEADER,
      HEADER_TRAILER,
      CULTIVATOR,
      SEEDER,
      { name: 'Iseki PRJ8D', brand: 'Iseki', category: 'Outros', ownership: 'proprio', notes: 'Plantadeira de mudas de arroz (autopropelida).' },
      { name: 'Iseki HJ6130', brand: 'Iseki', category: 'Colheitadeira', ownership: 'proprio', notes: 'Colheitadeira de arroz.' },
      { name: 'Piaggio Ape 50', brand: 'Piaggio', category: 'Veículo', ownership: 'proprio', notes: 'Triciclo de carga da fazenda inicial.' },
      { name: 'Lizard Dragon', brand: 'Lizard', category: 'Veículo', ownership: 'proprio', notes: 'Veículo da fazenda inicial.' },
    ],
    animals: [],
    tasks: [
      { title: 'Colher o arroz dos três arrozais', type: 'Colheita', lot: 30 },
      { title: 'Semear os lotes 27 e 28', type: 'Plantio', lot: 27 },
      { title: 'Abastecer a estufa de mudas de arroz', type: 'Outros' },
    ],
    extras: ['Estufa de mudas de arroz', 'Estufa de cogumelos'],
  },
};

export interface NewSaveOptions {
  farmName: string;
  map: MapId;
  /** Nome do mapa quando é mod/outro. */
  mapName?: string;
  mode: Exclude<StartMode, 'exemplo' | 'importado'>;
  money: number;
  loan: number;
  startMonth: number;
  currency?: string;
}

/** Monta os dados de um save novo a partir das escolhas do jogador. */
export function buildSaveData(o: NewSaveOptions): Data {
  const d = emptyData();
  const year = 1;
  const month = Math.min(12, Math.max(1, Math.round(o.startMonth || 8)));
  d.settings = {
    ...d.settings,
    farmName: o.farmName.trim() || 'Minha fazenda',
    currency: o.currency ?? d.settings.currency,
    gameYear: year,
    gameMonth: month,
    map: o.map,
    mapName: o.map === 'outro' ? (o.mapName ?? '').trim() : mapById(o.map)?.name ?? '',
    mode: o.mode,
    startMoney: Math.max(0, o.money),
    loan: Math.max(0, o.loan),
    demo: false,
    tutorialSeen: false,
  };
  d.crops = DEFAULT_CROPS.map((x) => ({ ...x }));

  const kit = START_MODES.find((m) => m.id === o.mode)?.withFarm ? START_KITS[o.map] : undefined;
  if (!kit) {
    d.tasks = modeTasks(o.mode, year, month);
    return d;
  }

  let n = 0;
  const id = (p: string) => `${p}${++n}`;
  const fields: Field[] = kit.fields.map((f) => ({
    id: id('f'),
    name: f.name,
    mapNo: f.lot,
    areaHa: f.areaHa ?? 0,
    areaPending: !f.areaHa,
    ownership: 'proprio',
    plowed: f.plowed ?? true,
    limed: true,
    fertLevel: f.status === 'pronto' ? 2 : 0,
    weeds: false,
    stones: false,
    rice: !!f.rice,
    flooded: !!f.rice && f.status === 'pronto',
    notes: f.note,
  }));
  d.fields = fields;

  const plantings: Planting[] = [];
  kit.fields.forEach((f, i) => {
    if (f.status !== 'pronto' || !f.cropId) return;
    const crop = d.crops.find((x) => x.id === f.cropId);
    if (!crop) return;
    // Plantada no ciclo anterior e pronta agora: a colheita prevista é o mês inicial.
    const planted = crop.plantMonths[0] ?? month;
    const plantYear = planted < month ? year : year - 1;
    plantings.push({ id: id('p'), fieldId: fields[i].id, cropId: crop.id, year: plantYear, month: planted, harvestYear: year, harvestMonth: month, harvested: false, harvestedQty: 0, notes: 'Lavoura que veio com a fazenda inicial, pronta para colher no início do jogo.' });
  });
  d.plantings = plantings;

  d.machines = kit.machines.map((m) => ({ ...m, id: id('q'), value: 0, hours: 0, serviceAt: 0 }));
  d.animals = kit.animals.map((a) => ({ ...a, id: id('a') }));
  d.tasks = [
    ...kit.tasks.map<Task>((t) => ({ id: id('k'), title: t.title, type: t.type, fieldId: t.lot ? fields.find((f) => f.mapNo === t.lot)?.id : undefined, year, month, done: false })),
    ...modeTasks(o.mode, year, month, id),
  ];
  return d;
}

function modeTasks(mode: NewSaveOptions['mode'], year: number, month: number, id: (p: string) => string = (p) => `${p}${Math.random().toString(36).slice(2, 8)}`): Task[] {
  if (mode === 'gerente') return [{ id: id('k'), title: 'Comprar o primeiro lote de terra', type: 'Outros', year, month, done: false }];
  if (mode === 'zero') return [{ id: id('k'), title: 'Pegar contratos para fazer caixa', type: 'Outros', year, month, done: false }];
  return [];
}

/** Resumo do que o save novo vai trazer (para a tela de criação). */
export function kitSummary(map: MapId, mode: NewSaveOptions['mode']) {
  const withFarm = START_MODES.find((m) => m.id === mode)?.withFarm;
  const kit = withFarm ? START_KITS[map] : undefined;
  return {
    fields: kit?.fields.length ?? 0,
    ready: kit?.fields.filter((f) => f.status === 'pronto').length ?? 0,
    machines: kit?.machines.length ?? 0,
    animals: kit?.animals.length ?? 0,
    extras: kit?.extras ?? [],
    kit,
  };
}

/** Dicas que dependem do modo de início escolhido. */
export const MODE_TIPS: Record<NewSaveOptions['mode'], string[]> = {
  novo: [
    'No Novo fazendeiro a economia é fácil: aproveite para aprender o ciclo completo sem medo de errar.',
    'Comece colhendo o que já está pronto na fazenda inicial: é o primeiro dinheiro do jogo.',
    'Antes de comprar máquinas, faça contratos com as que você já tem.',
  ],
  gerente: [
    'Como Gerente de fazenda você não tem terra: compre um lote perto de um ponto de venda antes de gastar com máquinas.',
    'Alugue as máquinas de temporada no começo e compre só o trator principal.',
    'Cadastre cada lote comprado em Talhões > Talhões do mapa, com o número do jogo.',
  ],
  zero: [
    'No Começo do zero há dívida no banco: os juros comem o caixa, pague assim que puder.',
    'Contratos com máquinas emprestadas são a forma mais segura de fazer o primeiro dinheiro.',
    'Evite comprar terra cedo demais: arrende ou faça contratos até ter folga no caixa.',
  ],
};
