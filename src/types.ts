export type CalendarMode = 'game' | 'real';

export interface Settings {
  farmName: string;
  currency: string;
  qtyUnit: string;
  /** O preço é informado para cada N unidades (1000 no FS25, 1 na vida real). */
  pricePer: number;
  calendarMode: CalendarMode;
  gameYear: number;
  gameMonth: number;
  demo: boolean;
  systemNotifications: boolean;
  /** Já viu o tutorial de boas-vindas. */
  tutorialSeen?: boolean;
}

export interface Field {
  id: string;
  name: string;
  areaHa: number;
  ownership: 'proprio' | 'arrendado';
  plowed: boolean;
  limed: boolean;
  fertLevel: number;
  weeds: boolean;
  /** Pedras no campo (aparecem depois de arar ou cultivar). */
  stones?: boolean;
  notes?: string;
}

export interface Crop {
  id: string;
  name: string;
  color: string;
  plantMonths: number[];
  harvestMonths: number[];
  yieldPerHa: number;
  seedPerHa: number;
  avgPrice: number;
  bestPrice: number;
  bestMonth: number;
}

export interface Planting {
  id: string;
  fieldId: string;
  cropId: string;
  year: number;
  month: number;
  harvestYear: number;
  harvestMonth: number;
  harvested: boolean;
  harvestedQty: number;
  lost?: boolean;
  notes?: string;
}

export interface Sale {
  id: string;
  cropId: string;
  qty: number;
  unitPrice: number;
  buyer?: string;
  year: number;
  month: number;
}

export interface Transaction {
  id: string;
  type: 'receita' | 'despesa';
  category: string;
  description: string;
  amount: number;
  year: number;
  month: number;
  cropId?: string;
  fieldId?: string;
}

export interface StockMove {
  id: string;
  kind: 'insumo' | 'producao';
  /** Nome do insumo, ou id da cultura quando kind = producao. */
  item: string;
  qty: number;
  unit?: string;
  note?: string;
  year: number;
  month: number;
}

export interface Task {
  id: string;
  title: string;
  type: string;
  fieldId?: string;
  year: number;
  month: number;
  done: boolean;
}

export interface Machine {
  id: string;
  name: string;
  brand?: string;
  category: string;
  ownership: 'proprio' | 'alugado' | 'leasing';
  photo?: string;
  value: number;
  hours: number;
  serviceAt: number;
  powerCv?: number;
  requiredCv?: number;
  speedKmh?: number;
  widthM?: number;
  capacityL?: number;
  tankL?: number;
  upkeep?: number;
  notes?: string;
}

export interface Animal {
  id: string;
  name: string;
  species: string;
  count: number;
  capacity: number;
  photo?: string;
  product?: string;
  health: number;
  productivity: number;
  value: number;
  notes?: string;
}

/** Registro do diário de campo: o que foi feito, quando, com foto. */
export interface LogEntry {
  id: string;
  title: string;
  type: string;
  fieldId?: string;
  taskId?: string;
  /** Data real em que foi feito, AAAA-MM-DD. */
  date: string;
  /** Mês e ano do jogo no momento do registro. */
  year: number;
  month: number;
  photo?: string;
  /** Vídeo do trabalho (colhendo, plantando...). */
  video?: string;
  notes?: string;
}

export interface Data {
  settings: Settings;
  fields: Field[];
  crops: Crop[];
  plantings: Planting[];
  sales: Sale[];
  transactions: Transaction[];
  stockMoves: StockMove[];
  tasks: Task[];
  machines: Machine[];
  animals: Animal[];
  records: LogEntry[];
  readAlerts: string[];
  /** Tópicos do guia marcados como lidos. */
  guideRead: string[];
}

export type Collection = 'fields' | 'crops' | 'plantings' | 'sales' | 'transactions' | 'stockMoves' | 'tasks' | 'machines' | 'animals' | 'records';
