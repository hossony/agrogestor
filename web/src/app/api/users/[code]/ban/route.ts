import { NextResponse } from 'next/server';
import { body, HttpError, isOwner, requireUser, route } from '@/lib/auth';
import { q } from '@/lib/db';
import { userByCode } from '@/lib/queries';

type Ctx = { params: Promise<{ code: string }> };

/**
 * Suspender (banir) ou reativar uma conta. Só o dono. A pessoa não consegue
 * mais entrar e as postagens e os comentários dela somem (sem serem apagados).
 */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  if (!isOwner(me)) throw new HttpError(403, 'Só o dono da plataforma pode suspender contas.');
  const { code } = await ctx.params;
  const u = await userByCode(decodeURIComponent(code));
  if (!u) throw new HttpError(404, 'Perfil não encontrado.');
  if (u.id === me.id || u.badges.includes('owner')) throw new HttpError(400, 'Não é possível suspender a conta do dono.');
  const { ban } = await body<{ ban?: boolean }>(req);
  await q(`update users set banned_at = ${ban ? 'now()' : 'null'} where id = $1`, [u.id]);
  if (ban) {
    await q('delete from push_subscriptions where user_id = $1', [u.id]);
    await q('delete from expo_push_tokens where user_id = $1', [u.id]);
  }
  return NextResponse.json({ banned: Boolean(ban) });
});
