import { Crop } from '../types';

const r = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

/**
 * Catálogo padrão do Farming Simulator 25 (hemisfério norte, preço por 1000 L
 * na dificuldade normal). Tudo pode ser editado na tela Culturas — na vida
 * real, ajuste janelas, produtividade e preços para a sua região.
 */
export const DEFAULT_CROPS: Crop[] = [
  { id: 'trigo', name: 'Trigo', color: '#D9A441', plantMonths: [9, 10], harvestMonths: [7, 8], yieldPerHa: 8900, seedPerHa: 308, avgPrice: 1011, bestPrice: 1224, bestMonth: 1 },
  { id: 'cevada', name: 'Cevada', color: '#C9B458', plantMonths: [9, 10], harvestMonths: [6, 7], yieldPerHa: 9600, seedPerHa: 265, avgPrice: 938, bestPrice: 1137, bestMonth: 1 },
  { id: 'canola', name: 'Canola', color: '#E3C800', plantMonths: [8, 9], harvestMonths: [7, 8], yieldPerHa: 5800, seedPerHa: 7, avgPrice: 1808, bestPrice: 2190, bestMonth: 12 },
  { id: 'aveia', name: 'Aveia', color: '#BFA76A', plantMonths: [3, 4], harvestMonths: [7, 8], yieldPerHa: 5700, seedPerHa: 340, avgPrice: 1596, bestPrice: 1932, bestMonth: 1 },
  { id: 'milho', name: 'Milho', color: '#F0B429', plantMonths: [4, 5], harvestMonths: [10, 11], yieldPerHa: 9200, seedPerHa: 53, avgPrice: 1139, bestPrice: 1515, bestMonth: 1 },
  { id: 'girassol', name: 'Girassol', color: '#F2A000', plantMonths: [3, 4], harvestMonths: [10, 11], yieldPerHa: 5200, seedPerHa: 143, avgPrice: 2018, bestPrice: 2424, bestMonth: 3 },
  { id: 'soja', name: 'Soja', color: '#8FA83A', plantMonths: [4, 5], harvestMonths: [10, 11], yieldPerHa: 4500, seedPerHa: 214, avgPrice: 2333, bestPrice: 3711, bestMonth: 7 },
  { id: 'batata', name: 'Batata', color: '#B98A4E', plantMonths: [3, 4], harvestMonths: [8, 9], yieldPerHa: 41300, seedPerHa: 3733, avgPrice: 666, bestPrice: 765, bestMonth: 12 },
  { id: 'beterraba-acucareira', name: 'Beterraba açucareira', color: '#A98FB8', plantMonths: [3, 4], harvestMonths: [10, 11], yieldPerHa: 57800, seedPerHa: 34, avgPrice: 516, bestPrice: 594, bestMonth: 12 },
  { id: 'cana', name: 'Cana-de-açúcar', color: '#6FA65A', plantMonths: [3, 4], harvestMonths: [10, 11], yieldPerHa: 113400, seedPerHa: 12000, avgPrice: 357, bestPrice: 375, bestMonth: 7 },
  { id: 'algodao', name: 'Algodão', color: '#9DB7C4', plantMonths: [2, 3], harvestMonths: [10, 11], yieldPerHa: 4970, seedPerHa: 50, avgPrice: 3755, bestPrice: 4170, bestMonth: 3 },
  { id: 'sorgo', name: 'Sorgo', color: '#B5653A', plantMonths: [4, 5], harvestMonths: [8, 9], yieldPerHa: 8200, seedPerHa: 35, avgPrice: 1290, bestPrice: 1575, bestMonth: 1 },
  { id: 'arroz', name: 'Arroz', color: '#7FB7A3', plantMonths: [4, 5], harvestMonths: [8, 9], yieldPerHa: 6600, seedPerHa: 156, avgPrice: 3300, bestPrice: 3465, bestMonth: 7 },
  { id: 'arroz-agulhinha', name: 'Arroz agulhinha', color: '#9CC7B0', plantMonths: [4], harvestMonths: [9], yieldPerHa: 9000, seedPerHa: 500, avgPrice: 1589, bestPrice: 1668, bestMonth: 7 },
  { id: 'vagem', name: 'Vagem', color: '#4E9A55', plantMonths: r(4, 6), harvestMonths: r(8, 11), yieldPerHa: 6975, seedPerHa: 280, avgPrice: 2160, bestPrice: 2272, bestMonth: 8 },
  { id: 'ervilha', name: 'Ervilha', color: '#7DBB5A', plantMonths: [3, 4], harvestMonths: r(7, 9), yieldPerHa: 9600, seedPerHa: 250, avgPrice: 3119, bestPrice: 3432, bestMonth: 12 },
  { id: 'espinafre', name: 'Espinafre', color: '#2F7D4A', plantMonths: r(3, 5), harvestMonths: r(5, 11), yieldPerHa: 23100, seedPerHa: 10, avgPrice: 659, bestPrice: 693, bestMonth: 10 },
  { id: 'cenoura', name: 'Cenoura', color: '#E57B2E', plantMonths: r(4, 7), harvestMonths: r(8, 11), yieldPerHa: 77000, seedPerHa: 10, avgPrice: 395, bestPrice: 456, bestMonth: 1 },
  { id: 'pastinaca', name: 'Pastinaca', color: '#D8C9A0', plantMonths: r(4, 6), harvestMonths: r(8, 11), yieldPerHa: 69500, seedPerHa: 10, avgPrice: 392, bestPrice: 432, bestMonth: 1 },
  { id: 'beterraba', name: 'Beterraba', color: '#9B2D4E', plantMonths: r(4, 6), harvestMonths: r(8, 11), yieldPerHa: 57800, seedPerHa: 40, avgPrice: 366, bestPrice: 420, bestMonth: 1 },
  { id: 'uva', name: 'Uva', color: '#6B4A9B', plantMonths: r(3, 5), harvestMonths: [9, 10], yieldPerHa: 18400, seedPerHa: 0, avgPrice: 1808, bestPrice: 2172, bestMonth: 5 },
  { id: 'azeitona', name: 'Azeitona', color: '#6E7B3A', plantMonths: r(3, 6), harvestMonths: [10], yieldPerHa: 18400, seedPerHa: 0, avgPrice: 1808, bestPrice: 2172, bestMonth: 6 },
  { id: 'choupo', name: 'Choupo', color: '#557A6B', plantMonths: r(3, 8), harvestMonths: r(1, 12), yieldPerHa: 66270, seedPerHa: 1500, avgPrice: 119, bestPrice: 130, bestMonth: 3 },
  { id: 'grama', name: 'Grama', color: '#58A55C', plantMonths: r(3, 11), harvestMonths: r(5, 11), yieldPerHa: 43700, seedPerHa: 160, avgPrice: 135, bestPrice: 150, bestMonth: 1 },
  { id: 'nabo-forrageiro', name: 'Nabo forrageiro (cobertura)', color: '#A3B18A', plantMonths: r(3, 10), harvestMonths: [], yieldPerHa: 0, seedPerHa: 340, avgPrice: 0, bestPrice: 0, bestMonth: 1 },
];
