import { Data, Settings } from '../types';
import { DEFAULT_CROPS } from './crops';

export const DEFAULT_SETTINGS: Settings = {
  farmName: 'Fazenda Boaz',
  currency: '$',
  qtyUnit: 'L',
  pricePer: 1000,
  calendarMode: 'game',
  gameYear: 1,
  gameMonth: 3,
  demo: false,
  systemNotifications: false,
};

export const emptyData = (): Data => ({
  settings: { ...DEFAULT_SETTINGS },
  fields: [],
  crops: DEFAULT_CROPS.map((x) => ({ ...x })),
  plantings: [],
  sales: [],
  transactions: [],
  stockMoves: [],
  tasks: [],
  machines: [],
  animals: [],
  records: [],
  readAlerts: [],
});

/** Fazenda de exemplo: ano 2, agosto — meio da colheita de verão. */
export const demoData = (): Data => ({
  ...emptyData(),
  settings: { ...DEFAULT_SETTINGS, farmName: 'Fazenda Boaz', gameYear: 2, gameMonth: 8, demo: true },
  fields: [
    { id: 'f1', name: 'Talhão 1 (Sede)', areaHa: 4.2, ownership: 'proprio', plowed: true, limed: true, fertLevel: 2, weeds: false },
    { id: 'f2', name: 'Talhão 2 (Açude)', areaHa: 6.8, ownership: 'proprio', plowed: true, limed: true, fertLevel: 1, weeds: true },
    { id: 'f3', name: 'Talhão 3 (Estrada)', areaHa: 3.1, ownership: 'proprio', plowed: true, limed: false, fertLevel: 2, weeds: false },
    { id: 'f4', name: 'Talhão 4 (Morro)', areaHa: 9.5, ownership: 'arrendado', plowed: true, limed: true, fertLevel: 1, weeds: false },
    { id: 'f5', name: 'Talhão 5 (Baixada)', areaHa: 5.4, ownership: 'proprio', plowed: false, limed: false, fertLevel: 0, weeds: false },
    { id: 'f6', name: 'Talhão 6 (Divisa)', areaHa: 2.6, ownership: 'proprio', plowed: true, limed: true, fertLevel: 2, weeds: false },
  ],
  plantings: [
    { id: 'p1', fieldId: 'f1', cropId: 'trigo', year: 1, month: 9, harvestYear: 2, harvestMonth: 7, harvested: false, harvestedQty: 0 },
    { id: 'p2', fieldId: 'f2', cropId: 'milho', year: 2, month: 4, harvestYear: 2, harvestMonth: 10, harvested: false, harvestedQty: 0 },
    { id: 'p3', fieldId: 'f3', cropId: 'cevada', year: 1, month: 9, harvestYear: 2, harvestMonth: 6, harvested: true, harvestedQty: 31200 },
    { id: 'p4', fieldId: 'f4', cropId: 'soja', year: 2, month: 5, harvestYear: 2, harvestMonth: 10, harvested: false, harvestedQty: 0 },
    { id: 'p5', fieldId: 'f6', cropId: 'batata', year: 2, month: 3, harvestYear: 2, harvestMonth: 8, harvested: false, harvestedQty: 0 },
    { id: 'p6', fieldId: 'f5', cropId: 'canola', year: 1, month: 8, harvestYear: 2, harvestMonth: 7, harvested: true, harvestedQty: 30100 },
    { id: 'p7', fieldId: 'f2', cropId: 'milho', year: 1, month: 4, harvestYear: 1, harvestMonth: 10, harvested: true, harvestedQty: 60400 },
    { id: 'p8', fieldId: 'f4', cropId: 'soja', year: 1, month: 4, harvestYear: 1, harvestMonth: 10, harvested: true, harvestedQty: 41800 },
  ],
  sales: [
    { id: 's1', cropId: 'milho', qty: 60400, unitPrice: 1480, buyer: 'Moinho', year: 2, month: 1 },
    { id: 's2', cropId: 'soja', qty: 25000, unitPrice: 2410, buyer: 'Cooperativa', year: 2, month: 2 },
    { id: 's3', cropId: 'cevada', qty: 12000, unitPrice: 905, buyer: 'Cervejaria', year: 2, month: 7 },
    { id: 's4', cropId: 'canola', qty: 10000, unitPrice: 1720, buyer: 'Fábrica de óleo', year: 2, month: 7 },
  ],
  transactions: [
    { id: 't1', type: 'despesa', category: 'Sementes', description: 'Sementes de milho', amount: 4200, year: 2, month: 4, cropId: 'milho', fieldId: 'f2' },
    { id: 't2', type: 'despesa', category: 'Sementes', description: 'Sementes de soja', amount: 6100, year: 2, month: 5, cropId: 'soja', fieldId: 'f4' },
    { id: 't3', type: 'despesa', category: 'Fertilizante', description: 'Adubo sólido, 2 big bags', amount: 3840, year: 2, month: 5 },
    { id: 't4', type: 'despesa', category: 'Arrendamento', description: 'Arrendamento do Talhão 4', amount: 9500, year: 2, month: 3, fieldId: 'f4' },
    { id: 't5', type: 'despesa', category: 'Combustível', description: 'Diesel', amount: 2750, year: 2, month: 6 },
    { id: 't6', type: 'despesa', category: 'Manutenção', description: 'Revisão da colheitadeira', amount: 5200, year: 2, month: 6 },
    { id: 't7', type: 'receita', category: 'Contratos', description: 'Contrato de colheita para vizinho', amount: 7800, year: 2, month: 7 },
    { id: 't8', type: 'despesa', category: 'Calcário', description: 'Calcário para o Talhão 3', amount: 1900, year: 2, month: 8, fieldId: 'f3' },
    { id: 't9', type: 'despesa', category: 'Mão de obra', description: 'Ajudantes na colheita', amount: 3100, year: 2, month: 7 },
    { id: 't10', type: 'despesa', category: 'Sementes', description: 'Batata-semente', amount: 5600, year: 2, month: 3, cropId: 'batata', fieldId: 'f6' },
  ],
  stockMoves: [
    { id: 'm1', kind: 'insumo', item: 'Sementes', qty: 2400, unit: 'L', note: 'Compra', year: 2, month: 3 },
    { id: 'm2', kind: 'insumo', item: 'Fertilizante sólido', qty: 4000, unit: 'L', note: 'Compra', year: 2, month: 5 },
    { id: 'm3', kind: 'insumo', item: 'Fertilizante sólido', qty: -2600, unit: 'L', note: 'Aplicação nos talhões 2 e 4', year: 2, month: 6 },
    { id: 'm4', kind: 'insumo', item: 'Herbicida', qty: 1200, unit: 'L', note: 'Compra', year: 2, month: 5 },
    { id: 'm5', kind: 'insumo', item: 'Calcário', qty: 6000, unit: 'L', note: 'Compra', year: 2, month: 8 },
    { id: 'm6', kind: 'insumo', item: 'Diesel', qty: 900, unit: 'L', note: 'Tanque da sede', year: 2, month: 6 },
  ],
  tasks: [
    { id: 'k1', title: 'Revisar a colheitadeira antes do trigo', type: 'Manutenção', fieldId: undefined, year: 2, month: 8, done: false },
    { id: 'k2', title: 'Pulverizar herbicida', type: 'Pulverização', fieldId: 'f2', year: 2, month: 8, done: false },
    { id: 'k3', title: 'Aplicar calcário', type: 'Calcário', fieldId: 'f3', year: 2, month: 8, done: false },
    { id: 'k4', title: 'Arar e plantar canola', type: 'Plantio', fieldId: 'f5', year: 2, month: 9, done: false },
    { id: 'k5', title: 'Enfardar a palha da cevada', type: 'Outros', fieldId: 'f3', year: 2, month: 7, done: true },
    { id: 'k6', title: 'Segunda adubação da soja', type: 'Adubação', fieldId: 'f4', year: 2, month: 7, done: false },
  ],
  machines: [
    { id: 'q1', name: 'Trator grande 180 cv', brand: 'Exemplo', category: 'Trator', ownership: 'proprio', value: 142000, hours: 86, serviceAt: 100, powerCv: 180, speedKmh: 50, tankL: 310, upkeep: 180 },
    { id: 'q2', name: 'Trator médio 95 cv', brand: 'Exemplo', category: 'Trator', ownership: 'proprio', value: 61000, hours: 131, serviceAt: 150, powerCv: 95, speedKmh: 40, tankL: 150, upkeep: 90 },
    { id: 'q3', name: 'Colheitadeira média', brand: 'Exemplo', category: 'Colheitadeira', ownership: 'proprio', value: 238000, hours: 49, serviceAt: 50, powerCv: 354, speedKmh: 25, capacityL: 8600, widthM: 6.7, tankL: 620, upkeep: 320 },
    { id: 'q4', name: 'Plantadeira 6 m', category: 'Implemento', ownership: 'proprio', value: 48500, hours: 22, serviceAt: 80, requiredCv: 120, widthM: 6, capacityL: 2800, speedKmh: 15 },
    { id: 'q5', name: 'Pulverizador 24 m', category: 'Implemento', ownership: 'alugado', value: 37000, hours: 9, serviceAt: 60, requiredCv: 90, widthM: 24, capacityL: 3000, speedKmh: 12 },
    { id: 'q6', name: 'Caminhonete da fazenda', category: 'Veículo', ownership: 'proprio', value: 32000, hours: 64, serviceAt: 200, powerCv: 280, speedKmh: 130, tankL: 80 },
    { id: 'q7', name: 'Carreta graneleira', category: 'Carreta', ownership: 'proprio', value: 27500, hours: 0, serviceAt: 0, requiredCv: 80, capacityL: 18000 },
    { id: 'q8', name: 'Motosserra', category: 'Ferramenta', ownership: 'proprio', value: 600, hours: 3, serviceAt: 0 },
  ],
  animals: [
    { id: 'a1', name: 'Curral das vacas', species: 'Vacas', count: 18, capacity: 25, product: 'Leite', health: 92, productivity: 81, value: 36000 },
    { id: 'a2', name: 'Galinheiro', species: 'Galinhas', count: 60, capacity: 60, product: 'Ovos', health: 100, productivity: 96, value: 600 },
    { id: 'a3', name: 'Pasto das ovelhas', species: 'Ovelhas', count: 12, capacity: 30, product: 'Lã', health: 54, productivity: 47, value: 6000 },
  ],
  records: [
    { id: 'r1', title: 'Colheita da cevada', type: 'Colheita', fieldId: 'f3', date: '2026-11-02', year: 2, month: 6, notes: '31.200 L no silo.' },
    { id: 'r2', title: 'Colheita da canola', type: 'Colheita', fieldId: 'f5', date: '2026-11-05', year: 2, month: 7 },
    { id: 'r3', title: 'Enfardar a palha da cevada', type: 'Outros', fieldId: 'f3', taskId: 'k5', date: '2026-11-06', year: 2, month: 7 },
  ],
  readAlerts: [],
});
