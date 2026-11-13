/// <reference types="node" />
/**
 * Sincronização dos saves com o site, com um servidor falso em memória que
 * segue as mesmas regras de /api/saves (a versão mais nova vence).
 * Rodar: npm test
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSave, deleteSave, KV, listSaves, loadSave, register, upsertCloudUser, writeSave } from '../src/accounts';
import { CloudSession } from '../src/cloud';
import { emptyData } from '../src/data/demo';
import { syncAll } from '../src/sync';

function memoryKV(): KV {
  const m = new Map<string, string>();
  return { getItem: async (k) => m.get(k) ?? null, setItem: async (k, v) => void m.set(k, v), removeItem: async (k) => void m.delete(k) };
}

type Row = { meta: Record<string, any>; data: unknown; deleted: boolean; updatedAt: string };

/** Servidor falso: responde como as rotas /api/saves do site. */
function fakeServer() {
  const rows = new Map<string, Row>();
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    const path = new URL(input).pathname;
    const method = init.method ?? 'GET';
    if (path === '/api/saves') return json({ saves: [...rows.entries()].map(([id, r]) => ({ ...r.meta, id, deleted: r.deleted, updatedAt: r.updatedAt })) });
    const id = path.split('/').pop()!;
    const row = rows.get(id);
    if (method === 'GET') return row ? json({ data: row.data, deleted: row.deleted, updatedAt: row.updatedAt }) : json({ error: 'x' }, 404);
    if (method === 'DELETE') {
      rows.set(id, { meta: row?.meta ?? {}, data: null, deleted: true, updatedAt: new Date().toISOString() });
      return json({ ok: true });
    }
    const b = JSON.parse(String(init.body));
    if (row && (row.deleted || row.updatedAt > b.meta.updatedAt)) return json({ ok: true, stale: true });
    rows.set(id, { meta: b.meta, data: b.data, deleted: false, updatedAt: b.meta.updatedAt });
    return json({ ok: true, stale: false });
  }) as typeof fetch;
  return rows;
}

const later = () => new Date(Date.now() + 1000).toISOString();

describe('sincronização com o site', () => {
  const cloudUser = { id: 'u-site-1', username: 'joao', name: 'João' };
  const session: CloudSession = { url: 'https://site.test', token: 't', user: cloudUser };

  it('leva saves de um aparelho para o outro, nos dois sentidos, e apaga nos dois', async () => {
    const server = fakeServer();
    const phone = memoryKV();
    const pc = memoryKV();
    await upsertCloudUser(phone, cloudUser, 'segredo1');
    await upsertCloudUser(pc, cloudUser, 'segredo1');

    const d = emptyData();
    d.settings.farmName = 'Fazenda Rio';
    const s = await createSave(phone, cloudUser.id, { name: 'Rio', map: 'riverbend', mapName: 'Riverbend Springs', mode: 'novo' }, d);
    assert.deepEqual((await syncAll(phone, cloudUser.id, session)).pushed, [s.id]);
    assert.ok(server.has(s.id));

    assert.deepEqual((await syncAll(pc, cloudUser.id, session)).pulled, [s.id]);
    assert.equal((await loadSave(pc, s.id))?.settings.farmName, 'Fazenda Rio');

    // Edita no computador; o celular recebe a versão nova.
    const d2 = (await loadSave(pc, s.id))!;
    d2.settings.farmName = 'Fazenda Rio Novo';
    await writeSave(pc, cloudUser.id, s.id, d2, later());
    await syncAll(pc, cloudUser.id, session);
    assert.deepEqual((await syncAll(phone, cloudUser.id, session)).pulled, [s.id]);
    assert.equal((await loadSave(phone, s.id))?.settings.farmName, 'Fazenda Rio Novo');

    // Nada mudou: nenhuma transferência.
    const idle = await syncAll(phone, cloudUser.id, session);
    assert.deepEqual([idle.pulled, idle.pushed, idle.removed], [[], [], []]);

    // Apaga no celular; some no computador.
    await deleteSave(phone, cloudUser.id, s.id);
    await syncAll(phone, cloudUser.id, session);
    assert.equal(server.get(s.id)?.deleted, true);
    assert.deepEqual((await syncAll(pc, cloudUser.id, session)).removed, [s.id]);
    assert.equal((await listSaves(pc, cloudUser.id)).length, 0);
  });

  it('a conta local com o mesmo usuário passa os saves para a conta do site', async () => {
    fakeServer();
    const kv = memoryKV();
    const local = await register(kv, { name: 'João', username: 'joao', password: 'segredo1', confirm: 'segredo1' });
    const s = await createSave(kv, local.id, { name: 'Antigo', map: 'outro', mapName: '', mode: 'novo' }, emptyData());
    const u = await upsertCloudUser(kv, cloudUser, 'segredo1');
    assert.equal(u.id, cloudUser.id);
    assert.deepEqual((await listSaves(kv, cloudUser.id)).map((x) => x.id), [s.id]);
    assert.deepEqual((await syncAll(kv, cloudUser.id, session)).pushed, [s.id]);
  });
});
