import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route } from '@/lib/auth';
import { ALL_BADGE_IDS, badgeById } from '@/lib/badges';
import { one } from '@/lib/db';
import { notify } from '@/lib/notify';
import { userByCode } from '@/lib/queries';

type Ctx = { params: Promise<{ code: string }> };

/** Só o dono concede ou tira selos. O selo de dono não pode ser dado a ninguém. */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  if (!me.badges.includes('owner')) throw new HttpError(403, 'Só o dono da plataforma pode conceder selos.');
  const { code } = await ctx.params;
  const u = await userByCode(decodeURIComponent(code));
  if (!u) throw new HttpError(404, 'Perfil não encontrado.');
  const b = await body<{ badges?: unknown }>(req);
  if (!Array.isArray(b.badges)) throw new HttpError(400, 'Lista de selos inválida.');
  const wanted = b.badges.filter((x): x is string => typeof x === 'string' && ALL_BADGE_IDS.includes(x as never) && x !== 'owner');
  const keepOwner = u.badges.includes('owner') ? ['owner'] : [];
  const next = [...new Set([...keepOwner, ...wanted])];
  const row = await one<{ badges: string[] }>('update users set badges = $2 where id = $1 returning badges', [u.id, next]);
  const gained = next.filter((x) => !u.badges.includes(x));
  for (const g of gained) {
    const def = badgeById(g);
    if (def) await notify({ userId: u.id, actorId: me.id, type: 'badge', text: `Você recebeu o selo “${def.label}” 🎖️` });
  }
  return NextResponse.json({ badges: row?.badges ?? next });
});
