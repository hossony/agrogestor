/// <reference types="node" />
/**
 * Testes da camada de dados (o "backend" local do app): senhas, contas,
 * saves, montagem do save a partir do mapa, assistente e avisos.
 * Rodar: npm test
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import {
  authenticate, changePassword, createSave, deleteSave, getLastSave, KEYS, KV, listSaves, listUsers, loadSave, migrateLegacy, normalizeData, register, renameSave, setLastSave, validateRegistration, writeSave,
} from '../src/accounts';
import { farmAlerts } from '../src/alerts';
import { demoData, emptyData } from '../src/data/demo';
import { MAPS } from '../src/data/maps';
import { buildSaveData, kitSummary, MODE_TIPS, START_KITS, START_MODES } from '../src/data/presets';
import { farmPrep, prepSteps } from '../src/prep';
import { activePlantings, plantingStatus } from '../src/selectors';
import { hashPassword, sha256 } from '../src/sha256';
import { periodIndex } from '../src/utils';

/** Armazenamento em memória no lugar do AsyncStorage. */
function memoryKV(seed: Record<string, string> = {}): KV & { dump: Map<string, string> } {
  const dump = new Map(Object.entries(seed));
  return {
    dump,
    getItem: async (k) => dump.get(k) ?? null,
    setItem: async (k, v) => void dump.set(k, v),
    removeItem: async (k) => void dump.delete(k),
  };
}

const okUser = { name: 'Ana Souza', username: 'Ana.Souza', password: 'segredo1', confirm: 'segredo1' };

describe('sha256', () => {
  it('bate com o SHA-256 do Node para textos variados', () => {
    for (const t of ['', 'abc', 'fazenda', 'ação com acentos ç ã é', '🚜 trator', 'x'.repeat(1000)]) {
      assert.equal(sha256(t), createHash('sha256').update(t, 'utf8').digest('hex'));
    }
  });
  it('hash de senha depende do sal e é determinístico', () => {
    assert.equal(hashPassword('abc123', 's1', 50), hashPassword('abc123', 's1', 50));
    assert.notEqual(hashPassword('abc123', 's1', 50), hashPassword('abc123', 's2', 50));
  });
});

describe('contas', () => {
  it('valida o cadastro', () => {
    assert.equal(validateRegistration(okUser), null);
    assert.match(validateRegistration({ ...okUser, name: ' ' })!, /nome/);
    assert.match(validateRegistration({ ...okUser, username: 'ab' })!, /3 letras/);
    assert.match(validateRegistration({ ...okUser, username: 'joão' })!, /sem acento/);
    assert.match(validateRegistration({ ...okUser, password: '123', confirm: '123' })!, /6 caracteres/);
    assert.match(validateRegistration({ ...okUser, confirm: 'outra' })!, /não conferem/);
  });

  it('cadastra, não guarda a senha em texto e entra sem diferenciar maiúsculas no usuário', async () => {
    const kv = memoryKV();
    const u = await register(kv, okUser);
    assert.equal(u.username, 'ana.souza');
    assert.ok(!kv.dump.get(KEYS.users)!.includes('segredo1'));
    const logged = await authenticate(kv, '  ANA.souza ', 'segredo1');
    assert.equal(logged.id, u.id);
    assert.equal((logged as any).hash, undefined);
  });

  it('recusa senha errada, usuário inexistente e usuário repetido', async () => {
    const kv = memoryKV();
    await register(kv, okUser);
    await assert.rejects(authenticate(kv, 'ana.souza', 'errada'), /incorretos/);
    await assert.rejects(authenticate(kv, 'ninguem', 'segredo1'), /incorretos/);
    await assert.rejects(register(kv, { ...okUser, username: 'ANA.SOUZA' }), /já existe/);
    assert.equal((await listUsers(kv)).length, 1);
  });

  it('troca a senha só com a senha atual certa', async () => {
    const kv = memoryKV();
    const u = await register(kv, okUser);
    await assert.rejects(changePassword(kv, u.id, 'errada', 'novasenha'), /não confere/);
    await changePassword(kv, u.id, 'segredo1', 'novasenha');
    await assert.rejects(authenticate(kv, 'ana.souza', 'segredo1'));
    assert.equal((await authenticate(kv, 'ana.souza', 'novasenha')).id, u.id);
  });
});

describe('saves', () => {
  it('cria, lista, grava, renomeia e apaga saves separados por conta', async () => {
    const kv = memoryKV();
    const a = await register(kv, okUser);
    const b = await register(kv, { ...okUser, username: 'beto' });
    const data = buildSaveData({ farmName: 'Fazenda A', map: 'riverbend', mode: 'novo', money: 100000, loan: 0, startMonth: 8 });
    const s1 = await createSave(kv, a.id, { name: 'Carreira 1', map: 'riverbend', mapName: 'Riverbend Springs', mode: 'novo' }, data);
    await createSave(kv, b.id, { name: 'Do Beto', map: 'zielonka', mapName: 'Zielonka', mode: 'gerente' }, emptyData());
    assert.equal((await listSaves(kv, a.id)).length, 1);
    assert.equal((await listSaves(kv, b.id)).length, 1);

    const loaded = await loadSave(kv, s1.id);
    assert.equal(loaded!.settings.farmName, 'Fazenda A');
    loaded!.settings.farmName = 'Fazenda A2';
    await writeSave(kv, a.id, s1.id, loaded!);
    assert.equal((await listSaves(kv, a.id))[0].farmName, 'Fazenda A2');

    await renameSave(kv, a.id, s1.id, 'Carreira nova');
    assert.equal((await listSaves(kv, a.id))[0].name, 'Carreira nova');
    await assert.rejects(renameSave(kv, a.id, s1.id, '  '));

    await setLastSave(kv, a.id, s1.id);
    await deleteSave(kv, a.id, s1.id);
    assert.equal((await listSaves(kv, a.id)).length, 0);
    assert.equal(await loadSave(kv, s1.id), null);
    assert.equal(await getLastSave(kv, a.id), null);
  });

  it('completa dados antigos sem os campos novos', () => {
    const d = normalizeData({ fields: [], settings: { farmName: 'Velha' } as any } as any);
    assert.deepEqual(d.guideRead, []);
    assert.equal(d.settings.farmName, 'Velha');
    assert.equal(d.settings.currency, '$');
    assert.ok(d.crops.length > 10);
  });

  it('migra os dados da versão sem contas uma única vez', async () => {
    const old = { ...emptyData(), settings: { ...emptyData().settings, farmName: 'Fazenda Antiga', demo: false }, fields: [{ id: 'x', name: 'T1', areaHa: 3, ownership: 'proprio', plowed: true, limed: true, fertLevel: 1, weeds: false }] };
    const kv = memoryKV({ [KEYS.legacy]: JSON.stringify(old) });
    const u = await register(kv, okUser);
    const s = await migrateLegacy(kv, u.id);
    assert.equal(s!.name, 'Fazenda Antiga');
    assert.equal((await loadSave(kv, s!.id))!.fields.length, 1);
    assert.equal(await migrateLegacy(kv, u.id), null);
  });

  it('não migra a fazenda de exemplo', async () => {
    const kv = memoryKV({ [KEYS.legacy]: JSON.stringify(demoData()) });
    const u = await register(kv, okUser);
    assert.equal(await migrateLegacy(kv, u.id), null);
  });
});

describe('novo save a partir do mapa', () => {
  const now = (d: ReturnType<typeof buildSaveData>) => ({ year: d.settings.gameYear, month: d.settings.gameMonth });

  it('Riverbend Springs, Novo fazendeiro: lotes 1–5, trigo pronto, máquinas e vacas', () => {
    const d = buildSaveData({ farmName: '  Rancho  ', map: 'riverbend', mode: 'novo', money: 100000, loan: 0, startMonth: 8 });
    assert.equal(d.settings.farmName, 'Rancho');
    assert.equal(d.settings.mapName, 'Riverbend Springs');
    assert.equal(d.settings.startMoney, 100000);
    assert.deepEqual(d.fields.map((f) => f.mapNo), [1, 2, 3, 4, 5]);
    assert.ok(d.fields.every((f) => f.areaPending && f.areaHa === 0));
    assert.ok(d.machines.some((m) => m.name === 'Massey Ferguson MF 8570' && m.category === 'Colheitadeira'));
    assert.ok(d.machines.some((m) => m.name === 'Challenger MT635'));
    assert.equal(d.animals[0].species, 'Vacas');
    const ready = activePlantings(d).filter((p) => plantingStatus(p, periodIndex(now(d).year, now(d).month)) === 'pronto');
    assert.equal(ready.length, 1);
    assert.equal(ready[0].cropId, 'trigo');
    assert.ok(farmAlerts(d, now(d)).some((a) => a.kind === 'colheita'));
  });

  it('Zielonka, Novo fazendeiro: lotes 45 e 46 com área e galinheiro', () => {
    const d = buildSaveData({ farmName: 'Gospodarstwo', map: 'zielonka', mode: 'novo', money: 100000, loan: 0, startMonth: 8 });
    assert.deepEqual(d.fields.map((f) => [f.mapNo, f.areaHa]), [[45, 2.43], [46, 1.27]]);
    assert.ok(d.fields.every((f) => !f.areaPending));
    assert.equal(d.animals[0].species, 'Galinhas');
    assert.ok(d.machines.some((m) => m.name === 'Challenger MT600'));
  });

  it('Hutan Pantai, Novo fazendeiro: 3 arrozais prontos e 2 campos para semear', () => {
    const d = buildSaveData({ farmName: 'Sawah', map: 'hutan', mode: 'novo', money: 100000, loan: 0, startMonth: 8 });
    assert.equal(d.fields.length, 5);
    assert.equal(d.fields.filter((f) => f.rice).length, 3);
    assert.ok(d.fields.filter((f) => f.rice).every((f) => f.flooded));
    assert.equal(d.plantings.filter((p) => p.cropId === 'arroz').length, 3);
    assert.ok(d.machines.some((m) => m.name === 'Iseki HJ6130'));
    assert.ok(d.machines.some((m) => m.name === 'Iseki PRJ8D'));
    const idx = periodIndex(1, 8);
    assert.equal(d.plantings.filter((p) => plantingStatus(p, idx) === 'pronto').length, 3);
  });

  it('pronto para colher em qualquer mês inicial escolhido', () => {
    for (let m = 1; m <= 12; m++) {
      const d = buildSaveData({ farmName: 'X', map: 'hutan', mode: 'novo', money: 1, loan: 0, startMonth: m });
      assert.ok(d.plantings.every((p) => p.harvestMonth === m && periodIndex(p.year, p.month) < periodIndex(p.harvestYear, p.harvestMonth)), `mês ${m}`);
    }
  });

  it('Gerente de fazenda e Começo do zero não trazem terra, máquinas nem animais', () => {
    for (const mode of ['gerente', 'zero'] as const) {
      for (const map of ['riverbend', 'zielonka', 'hutan'] as const) {
        const d = buildSaveData({ farmName: 'G', map, mode, money: 2000000, loan: mode === 'zero' ? 250000 : 0, startMonth: 3 });
        assert.equal(d.fields.length + d.machines.length + d.animals.length + d.plantings.length, 0, `${mode}/${map}`);
        assert.equal(d.tasks.length, 1);
      }
    }
  });

  it('mapa de mod começa vazio e guarda o nome do mapa', () => {
    const d = buildSaveData({ farmName: 'Mod', map: 'outro', mapName: '  Mapa Brasil  ', mode: 'novo', money: 50000, loan: 0, startMonth: 1 });
    assert.equal(d.settings.mapName, 'Mapa Brasil');
    assert.equal(d.fields.length, 0);
  });

  it('valores negativos e mês fora da faixa são corrigidos', () => {
    const d = buildSaveData({ farmName: 'Y', map: 'riverbend', mode: 'gerente', money: -5, loan: -1, startMonth: 40 });
    assert.equal(d.settings.startMoney, 0);
    assert.equal(d.settings.loan, 0);
    assert.equal(d.settings.gameMonth, 12);
  });

  it('todo mapa oficial tem kit, dicas e resumo coerentes', () => {
    for (const m of MAPS) {
      assert.ok(START_KITS[m.id], m.id);
      assert.ok(m.tips.length >= 3);
      const k = kitSummary(m.id, 'novo');
      assert.equal(k.fields, START_KITS[m.id]!.fields.length);
      assert.equal(kitSummary(m.id, 'gerente').fields, 0);
    }
    for (const mode of START_MODES) assert.ok(MODE_TIPS[mode.id].length >= 2);
  });
});

describe('assistente de preparo', () => {
  it('arrozal ganha a etapa de alagar; campo comum não', () => {
    const base = { id: 'f', name: 'F', areaHa: 1, ownership: 'proprio' as const, plowed: true, limed: true, fertLevel: 2, weeds: false };
    assert.ok(prepSteps({ ...base, rice: true, flooded: false }, false).some((s) => s.key === 'alagar' && !s.done));
    assert.ok(!prepSteps(base, false).some((s) => s.key === 'alagar'));
  });
  it('campo arado no Hutan Pantai fica pronto para semear depois do calcário e adubo', () => {
    const d = buildSaveData({ farmName: 'S', map: 'hutan', mode: 'novo', money: 1, loan: 0, startMonth: 8 });
    const p = farmPrep(d, 8).find((x) => x.field.mapNo === 27)!;
    assert.equal(p.steps.find((s) => s.key === 'arar')!.done, true);
    assert.equal(p.next!.key, 'adubo1');
  });
});
