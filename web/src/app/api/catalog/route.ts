import { NextResponse } from 'next/server';
import { body, HttpError, isOwner, requireUser, route } from '@/lib/auth';
import { cleanCatalogInput, type CatalogMachine } from '@/lib/catalog';
import { one, q } from '@/lib/db';

const COLS = 'id, brand, model, category, price, hp_min, hp_max, speed, width::float as width, capacity, weight, upkeep, image_url, notes, verified';

/** Catálogo público (o app usa para cadastrar máquinas, mesmo sem conta no AgroSocial). */
export const GET = route(async () => {
  const rows = await q<CatalogMachine>(`select ${COLS} from machine_catalog order by category, brand, model`);
  return NextResponse.json(rows, { headers: { 'cache-control': 'no-store' } });
});

/** Nova máquina no catálogo (só o dono). */
export const POST = route(async (req: Request) => {
  const me = await requireUser();
  if (!isOwner(me)) throw new HttpError(403, 'Só o dono pode editar o catálogo.');
  const m = cleanCatalogInput(await body(req));
  if (!m.brand || !m.model) throw new HttpError(400, 'Informe a marca e o modelo.');
  const row = await one<CatalogMachine>(
    `insert into machine_catalog (brand, model, category, price, hp_min, hp_max, speed, width, capacity, weight, upkeep, image_url, notes, verified)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     on conflict (lower(brand), lower(model)) do nothing returning ${COLS}`,
    [m.brand, m.model, m.category, m.price, m.hp_min, m.hp_max, m.speed, m.width, m.capacity, m.weight, m.upkeep, m.image_url, m.notes, m.verified],
  );
  if (!row) throw new HttpError(409, 'Essa máquina já está no catálogo.');
  return NextResponse.json(row);
});
