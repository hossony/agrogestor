import { NextResponse } from 'next/server';
import { body, HttpError, isOwner, requireUser, route } from '@/lib/auth';
import { cleanCatalogInput, type CatalogMachine } from '@/lib/catalog';
import { one, q } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };
const COLS = 'id, brand, model, category, price, hp_min, hp_max, speed, width::float as width, capacity, weight, upkeep, image_url, notes, verified';

async function owner() {
  const me = await requireUser();
  if (!isOwner(me)) throw new HttpError(403, 'Só o dono pode editar o catálogo.');
}

export const PATCH = route(async (req: Request, ctx: Ctx) => {
  await owner();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Máquina não encontrada.');
  const m = cleanCatalogInput(await body(req));
  if (!m.brand || !m.model) throw new HttpError(400, 'Informe a marca e o modelo.');
  const row = await one<CatalogMachine>(
    `update machine_catalog set brand = $2, model = $3, category = $4, price = $5, hp_min = $6, hp_max = $7, speed = $8, width = $9, capacity = $10,
       weight = $11, upkeep = $12, image_url = $13, notes = $14, verified = $15, updated_at = now() where id = $1 returning ${COLS}`,
    [id, m.brand, m.model, m.category, m.price, m.hp_min, m.hp_max, m.speed, m.width, m.capacity, m.weight, m.upkeep, m.image_url, m.notes, m.verified],
  );
  if (!row) throw new HttpError(404, 'Máquina não encontrada.');
  return NextResponse.json(row);
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  await owner();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Máquina não encontrada.');
  await q('delete from machine_catalog where id = $1', [id]);
  return NextResponse.json({ ok: true });
});
