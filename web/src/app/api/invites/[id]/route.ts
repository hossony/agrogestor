import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route } from '@/lib/auth';
import { one } from '@/lib/db';
import { notify } from '@/lib/notify';
import { getInvite } from '@/lib/queries';

type Ctx = { params: Promise<{ id: string }> };

/** Responder (aceitar/recusar) um convite recebido, ou cancelar um enviado. */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Convite não encontrado.');
  const { action } = await body<{ action?: string }>(req);
  const inv = await getInvite(me.id, id);
  if (!inv) throw new HttpError(404, 'Convite não encontrado.');
  if (inv.status !== 'pending') return NextResponse.json(inv);

  if (action === 'cancel') {
    if (inv.incoming) throw new HttpError(403, 'Só quem enviou pode cancelar.');
    await one(`update invites set status = 'canceled', responded_at = now() where id = $1`, [id]);
  } else if (action === 'accept' || action === 'decline') {
    if (!inv.incoming) throw new HttpError(403, 'Só quem recebeu pode responder.');
    const status = action === 'accept' ? 'accepted' : 'declined';
    await one('update invites set status = $2, responded_at = now() where id = $1', [id, status]);
    await notify({
      userId: inv.from.id,
      actorId: me.id,
      type: action === 'accept' ? 'invite_accept' : 'invite_decline',
      inviteId: id,
      text: action === 'accept' ? `${me.name} aceitou o convite e já está indo jogar ${inv.game}! 🚜` : `${me.name} não pode jogar agora.`,
      push: { title: action === 'accept' ? 'Convite aceito' : 'Convite recusado', url: '/convites' },
    });
  } else throw new HttpError(400, 'Ação inválida.');

  return NextResponse.json(await getInvite(me.id, id));
});
