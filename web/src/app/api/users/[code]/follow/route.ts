import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/auth';
import { tx } from '@/lib/db';
import { notify } from '@/lib/notify';
import { userByCode } from '@/lib/queries';

type Ctx = { params: Promise<{ code: string }> };

/** Seguir / deixar de seguir. Só o número de seguidores é público; a lista, não. */
export const POST = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { code } = await ctx.params;
  const u = await userByCode(decodeURIComponent(code));
  if (!u) throw new HttpError(404, 'Perfil não encontrado.');
  if (u.id === me.id) throw new HttpError(400, 'Você não pode seguir a si mesmo.');
  const result = await tx(async (c) => {
    const del = await c.query('delete from follows where follower_id = $1 and followed_id = $2', [me.id, u.id]);
    const on = del.rowCount === 0;
    if (on) await c.query('insert into follows (follower_id, followed_id) values ($1, $2) on conflict do nothing', [me.id, u.id]);
    const r = await c.query('update users set follower_count = greatest(follower_count + $2, 0) where id = $1 returning follower_count', [u.id, on ? 1 : -1]);
    return { following: on, followers: (r.rows[0] as { follower_count: number }).follower_count };
  });
  if (result.following) await notify({ userId: u.id, actorId: me.id, type: 'follow', text: `${me.name} começou a seguir você.` });
  return NextResponse.json(result);
});
