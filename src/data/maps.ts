/**
 * Mapas padrão do Farming Simulator 25.
 *
 * Fontes: guias da comunidade e a wiki do jogo (farmingsimulator.wiki.gg,
 * holy.gg, BisectHosting, TheGamer, Gamepressure, Simulator Guides),
 * conferidos em nov/2026. O jogo recebe atualizações e a numeração dos lotes
 * pode mudar entre versões, então o app sempre deixa editar o que importa.
 *
 * A área de cada campo não é fixa aqui de propósito: no jogo, o menu de Terras
 * mostra a área exata de cada lote e ela muda se você juntar ou dividir campos.
 */

export type MapId = 'riverbend' | 'zielonka' | 'hutan' | 'outro';

export interface StartLot {
  /** Número do lote (farmland) no mapa do jogo. */
  no: number;
  /** Área em hectares, quando conhecida. */
  areaHa?: number;
  rice?: boolean;
  note?: string;
}

export interface GameMap {
  id: MapId;
  name: string;
  region: string;
  /** Sigla curta para a etiqueta. */
  tag: string;
  color: string;
  summary: string;
  facts: [string, string][];
  startLots: StartLot[];
  sellPoints: string[];
  productions: string[];
  tips: string[];
}

export const MAPS: GameMap[] = [
  {
    id: 'riverbend',
    name: 'Riverbend Springs',
    region: 'Estados Unidos (meio-oeste americano)',
    tag: 'EUA',
    color: '#2B78B8',
    summary: 'Mapa americano com terreno plano, estradas largas e campos grandes. É o mais indicado para quem está começando.',
    facts: [
      ['Região', 'Estados Unidos'],
      ['Campos', 'cerca de 70'],
      ['Terreno', 'plano, estradas largas'],
      ['Colecionáveis', '25, de $10.000 cada ($250.000 no total)'],
      ['Início recomendado', 'Novo fazendeiro, com tutorial ligado'],
    ],
    startLots: [],
    sellPoints: ['Terminais e elevador de grãos', 'Trem para Goldcrest Valley', 'Feira do produtor', 'Laticínio (Big Moo\'s Dairy)', 'Fábrica de brinquedos', 'Posto de combustível (extremo sul)'],
    productions: ['Moinho de grãos', 'Fábrica de papel', 'Serraria', 'Fiação', 'Fábrica de brinquedos', 'Fábrica de carroças'],
    tips: [
      'No modo Novo fazendeiro o jogo começa em agosto: a canola está na janela de plantio e você já tem as máquinas para ela.',
      'Loja, pontos de venda e comerciante de animais ficam perto da fazenda inicial: dá para vender sem viagens longas.',
      'Os campos grandes e planos rendem bem com máquinas largas: invista em largura antes de potência extra.',
      'Os 25 colecionáveis valem $250.000 no total: um ótimo reforço de caixa no começo.',
      'Venda grãos nos terminais e no elevador; compare com o trem, que às vezes paga melhor.',
      'Confira no menu de Terras a área de cada campo e cadastre aqui com o mesmo número do jogo.',
    ],
  },
  {
    id: 'zielonka',
    name: 'Zielonka',
    region: 'Europa (interior da Polônia)',
    tag: 'EU',
    color: '#5E9A2C',
    summary: 'Mapa europeu de 2 × 2 km com muitos campos retangulares, ideal para quem gosta de produções e cadeias de transformação.',
    facts: [
      ['Região', 'Europa Central (Polônia)'],
      ['Tamanho', '2 × 2 km'],
      ['Campos', 'muitos, a maioria retangulares'],
      ['Produções', 'nenhuma no início; 9 para comprar'],
      ['Pontos de venda', '7'],
    ],
    startLots: [
      { no: 45, areaHa: 2.43, note: 'Lote inicial (6 acres) com galinheiro' },
      { no: 46, areaHa: 1.27, note: 'Lote inicial (3,13 acres) com galinheiro' },
    ],
    sellPoints: ['Comerciante de animais', 'Supermercado', 'Moinho de grãos', 'Cooperativa de grãos (leste)', 'Usina de aquecimento a biomassa', 'Feira do produtor', 'Laticínio'],
    productions: ['Padaria', 'Usina de biogás', 'Fábrica de cimento', 'Fábrica de pianos', 'Processadora de batata', 'Fábrica de conservas', 'Serraria', 'Fábrica de sopa', 'Fiação'],
    tips: [
      'Ao criar o jogo, escolha começar com terra: você ganha os lotes 45 e 46 com galinheiros, que já rendem ovos desde o primeiro mês.',
      'O lote 49 fica perto do moinho de grãos: é uma boa primeira compra para quem vai plantar trigo e cevada.',
      'Os lotes 7 e 90 custam perto de $900.000 porque vêm com casa e silo: são fazendas opcionais, não a primeira compra.',
      'Nenhuma produção vem pronta: comece pela padaria ou pela processadora de batata, que usam o que você já colhe.',
      'Campos retangulares pequenos são ótimos para ajudantes (IA): menos faixas esquecidas nas bordas.',
      'A usina de biogás devolve digestato, que serve de adubo como o chorume.',
    ],
  },
  {
    id: 'hutan',
    name: 'Hutan Pantai',
    region: 'Leste e Sudeste da Ásia',
    tag: 'ÁSIA',
    color: '#C98A00',
    summary: 'Mapa asiático de 2 × 2 km com arrozais alagados, búfalos, estufas e muita floresta. Tem regras próprias para o arroz.',
    facts: [
      ['Região', 'Leste e Sudeste da Ásia'],
      ['Tamanho', '2 × 2 km, boa parte coberta por floresta'],
      ['Campos', '46 (sem contar grama e floresta)'],
      ['Produções', '11, duas delas na fazenda inicial'],
      ['Colecionáveis', '25 Farm Balls, de $10.000 cada (conquista "Over 9,000")'],
    ],
    startLots: [
      { no: 27, note: 'Lote inicial' },
      { no: 28, note: 'Lote inicial' },
      { no: 30, rice: true, note: 'Lote inicial com arrozal, bomba de alagamento e estufa' },
      { no: 31, rice: true, note: 'Lote inicial com arrozal' },
    ],
    sellPoints: ['Restaurante', 'Comerciante de animais', 'Armazém de grãos', 'Depósito', 'Laticínio', 'Feira do produtor', 'Navio', 'Templo (compra cimento)', 'Ponto que compra tábuas'],
    productions: ['Estufa de mudas de arroz (fazenda inicial)', 'Estufa de cogumelos: cogumelo-ostra e enoki (fazenda inicial)', 'Mussarela de búfala', 'Queijo de cabra', 'Outras produções espalhadas pelo mapa'],
    tips: [
      'O arroz precisa do campo alagado antes de plantar: encha o arrozal pela bomba antes de entrar com a plantadeira.',
      'As mudas de arroz saem da estufa da fazenda inicial: mantenha a estufa abastecida antes da época de plantio.',
      'As máquinas de arroz já estão à venda desde o começo; alugue se for usar só na temporada.',
      'Búfalos trabalham bem nos campos alagados e abrem a cadeia da mussarela de búfala.',
      'A estufa de cogumelos produz o ano todo: boa renda nos meses sem colheita.',
      'Se o ajudante (IA) não achar o arrozal para replantar, faça a passada você mesmo: há relatos disso, sobretudo no multijogador.',
      'Há muita floresta: tábuas e madeira têm comprador no mapa.',
    ],
  },
];

export const mapById = (id?: string) => MAPS.find((m) => m.id === id);
