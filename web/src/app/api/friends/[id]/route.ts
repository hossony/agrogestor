import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route } from '@/lib/auth';
import { q } from '@/lib/db';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };
const check = (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Pedido não encontrado.');
};

/** Aceitar ou recusar um pedido recebido. `id` é o id de quem pediu. */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  check(id);
  const { action } = await body<{ action?: string }>(req);
  if (action === 'accept') {
    const rows = await q(`update friendships set status = 'accepted', accepted_at = now() where requester_id = $1 and addressee_id = $2 and status = 'pending' returning 1`, [id, me.id]);
    if (!rows.length) throw new HttpError(404, 'Pedido não encontrado.');
    await notify({ userId: id, actorId: me.id, type: 'friend_accept', text: `${me.name} aceitou o seu pedido de amizade.`, push: { title: 'Nova amizade', url: `/u/${me.code}` } });
    return NextResponse.json({ status: 'accepted' });
  }
  if (action === 'decline') {
    await q(`delete from friendships where requester_id = $1 and addressee_id = $2 and status = 'pending'`, [id, me.id]);
    return NextResponse.json({ status: 'none' });
  }
  throw new HttpError(400, 'Ação inválida.');
});

/** Desfazer amizade ou cancelar um pedido enviado. */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  check(id);
  await q('delete from friendships where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)', [me.id, id]);
  return NextResponse.json({ status: 'none' });
});
