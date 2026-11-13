import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { emptyData } from '../src/data/demo';
import { farmTotals, sanitizeSnapshot, snapshotFromSave } from '../src/community/farm';
import { normalizeUrl } from '../src/community/url';

test('o resumo da fazenda do app é o mesmo arquivo do site', () => {
  // App e site precisam gerar o mesmo formato para o perfil (mesmo banco).
  assert.equal(readFileSync('src/community/farm.ts', 'utf8'), readFileSync('web/src/lib/farm.ts', 'utf8'));
});

test('resumo da fazenda a partir de um save', () => {
  const d = emptyData();
  d.settings = { ...d.settings, farmName: 'Sítio Teste', map: 'zielonka', startMoney: 50000, loan: 10000, pricePer: 1000 };
  d.fields = [{ id: 'f1', name: 'Campo 1', areaHa: 2.5, ownership: 'proprio', plowed: true, limed: true, fertLevel: 0, weeds: false }];
  d.machines = [{ id: 'm1', name: 'Trator', category: 'Trator', ownership: 'proprio', value: 80000, hours: 10, serviceAt: 100, photo: 'idb:abc' }];
  d.sales = [{ id: 's1', cropId: 'trigo', qty: 1000, unitPrice: 500, year: 1, month: 1 }];
  const snap = snapshotFromSave(d);
  assert.equal(snap.farmName, 'Sítio Teste');
  assert.equal(snap.map, 'Zielonka');
  assert.equal(snap.cash, 50500);
  assert.equal(snap.machines[0].photo, undefined, 'fotos locais não vão para o servidor');
  const t = farmTotals(snap);
  assert.equal(t.area, 2.5);
  assert.equal(t.worth, 50500 - 10000 + 80000);
});

test('rejeita texto que não é save e limita valores', () => {
  assert.throws(() => snapshotFromSave({ foo: 1 }));
  const s = sanitizeSnapshot({ animals: [{ name: 'x', health: 500, count: -3 }] });
  assert.equal(s.animals[0].health, 100);
  assert.equal(s.animals[0].count, 0);
});

test('endereço do site', () => {
  assert.equal(normalizeUrl('agrogestor.vercel.app/'), 'https://agrogestor.vercel.app');
  assert.equal(normalizeUrl(' https://x.com// '), 'https://x.com');
  assert.equal(normalizeUrl('localhost:3000'), 'http://localhost:3000');
  assert.equal(normalizeUrl(''), '');
});

test('os selos do app são o mesmo arquivo do site', () => {
  assert.equal(readFileSync('src/community/badges.ts', 'utf8'), readFileSync('web/src/lib/badges.ts', 'utf8'));
});

test('links sociais viram URLs https', async () => {
  const { normalizeLink, sanitizeLinks, canHaveLinks } = await import('../src/community/badges');
  assert.equal(normalizeLink('youtube', '@canal'), 'https://youtube.com/@canal');
  assert.equal(normalizeLink('twitch', 'meucanal'), 'https://twitch.tv/meucanal');
  assert.equal(normalizeLink('site', 'http://x.com'), 'https://x.com');
  assert.deepEqual(sanitizeLinks({ youtube: '', instagram: 'foto', hack: 'x' }), { instagram: 'https://instagram.com/foto' });
  assert.equal(canHaveLinks(['pioneer']), false);
  assert.equal(canHaveLinks(['creator']), true);
});

test('o catálogo de máquinas do app é o mesmo arquivo do site', () => {
  assert.equal(readFileSync('src/community/catalog.ts', 'utf8'), readFileSync('web/src/lib/catalog.ts', 'utf8'));
});

test('catálogo: limpa valores do painel e monta a potência', async () => {
  const { cleanCatalogInput, hpLabel } = await import('../src/community/catalog');
  const m = cleanCatalogInput({ brand: ' Fendt ', model: '1000 Vario', category: 'Trator', price: '450.000', hp_min: '396', hp_max: 517, image_url: 'javascript:x', verified: true });
  assert.equal(m.brand, 'Fendt');
  assert.equal(m.price, 450000);
  assert.equal(m.image_url, null);
  assert.equal(cleanCatalogInput({ category: 'Nave espacial' }).category, 'Outro');
  assert.equal(hpLabel({ hp_min: 396, hp_max: 517 }), '396–517 cv');
  assert.equal(hpLabel({ hp_min: null, hp_max: 112 }), '112 cv');
});

test('links clicáveis no texto das postagens', async () => {
  const { splitLinks } = await import('../src/community/types');
  const parts = splitLinks('Veja https://youtube.com/@canal, top!');
  assert.equal(parts[1].url, 'https://youtube.com/@canal');
  assert.equal(parts[2].text, ', top!');
});
