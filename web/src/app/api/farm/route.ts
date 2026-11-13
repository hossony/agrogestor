import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route } from '@/lib/auth';
import { q } from '@/lib/db';
import { sanitizeSnapshot } from '@/lib/farm';

/** Publica (ou atualiza) o resumo da fazenda que os amigos veem no perfil. */
export const PUT = route(async (req: Request) => {
  const me = await requireUser();
  const raw = await body<unknown>(req);
  const farm = sanitizeSnapshot(raw);
  const json = JSON.stringify(farm);
  if (json.length > 400_000) throw new HttpError(413, 'A fazenda ficou grande demais para publicar.');
  await q('update users set farm = $2, farm_updated_at = now() where id = $1', [me.id, json]);
  return NextResponse.json({ ok: true, farm });
});

export const DELETE = route(async () => {
  const me = await requireUser();
  await q('update users set farm = null, farm_updated_at = null where id = $1', [me.id]);
  return NextResponse.json({ ok: true });
});
