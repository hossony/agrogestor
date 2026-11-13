import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route, str } from '@/lib/auth';
import { one } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

const saveId = async (ctx: Ctx) => {
  const { id } = await ctx.params;
  if (!/^[a-z0-9]{6,40}$/i.test(id)) throw new HttpError(400, 'Save inválido.');
  return id;
};
const isoOrNow = (v: unknown) => {
  const d = typeof v === 'string' ? new Date(v) : new Date();
  return Number.isNaN(d.getTime()) || d.getTime() > Date.now() + 5 * 60_000 ? new Date() : d;
};

/** Dados completos de um save. */
export const GET = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const id = await saveId(ctx);
  const row = await one<{ data: unknown; deleted: boolean; updated_at: Date }>('select data, deleted, updated_at from saves where user_id = $1 and id = $2', [me.id, id]);
  if (!row) throw new HttpError(404, 'Save não encontrado.');
  return NextResponse.json({ data: row.data, deleted: row.deleted, updatedAt: row.updated_at.toISOString() });
});

/**
 * Grava um save. Só substitui se a versão enviada for mais nova que a do
 * servidor; senão devolve `stale: true` e o app baixa a versão do servidor.
 */
export const PUT = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const id = await saveId(ctx);
  const b = await body<{ meta?: Record<string, unknown>; data?: unknown }>(req);
  const m = b.meta ?? {};
  if (!b.data || typeof b.data !== 'object') throw new HttpError(400, 'Save sem dados.');
  const json = JSON.stringify(b.data);
  if (json.length > 8_000_000) throw new HttpError(413, 'Esse save ficou grande demais para sincronizar.');
  const updated = isoOrNow(m.updatedAt);
  const row = await one<{ updated_at: Date }>(
    `insert into saves (user_id, id, name, farm_name, map, map_name, mode, data, deleted, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, false, $9, $10)
     on conflict (user_id, id) do update set name = excluded.name, farm_name = excluded.farm_name, map = excluded.map,
       map_name = excluded.map_name, mode = excluded.mode, data = excluded.data, deleted = false, updated_at = excluded.updated_at
     where saves.updated_at <= excluded.updated_at and not saves.deleted
     returning updated_at`,
    [me.id, id, str(m.name, 80), str(m.farmName, 80), str(m.map, 40), str(m.mapName, 80), str(m.mode, 20) || 'novo', json, isoOrNow(m.createdAt), updated],
  );
  return NextResponse.json({ ok: true, stale: !row });
});

/** Apaga (marca como apagado, para os outros aparelhos também apagarem). */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const id = await saveId(ctx);
  await one(
    `insert into saves (user_id, id, deleted, updated_at) values ($1, $2, true, now())
     on conflict (user_id, id) do update set deleted = true, data = null, updated_at = now()`,
    [me.id, id],
  );
  return NextResponse.json({ ok: true });
});
