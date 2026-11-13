import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route, str } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { notify } from '@/lib/notify';
import { areFriends, getInvite, INVITE_SELECT } from '@/lib/queries';
import { Invite } from '@/lib/types';

export const GET = route(async () => {
  const me = await requireUser();
  const rows = await q<Invite>(`${INVITE_SELECT} where (i.from_id = $1 or i.to_id = $1) and i.created_at > now() - interval '14 days' order by i.created_at desc limit 60`, [me.id]);
  return NextResponse.json(rows);
});

/** Chamar um amigo para jogar. Ele recebe um aviso na hora (app aberto) e no celular (push). */
export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const b = await body<{ to?: string; game?: string; server?: string; password?: string; message?: string }>(req);
  const to = str(b.to, 40);
  if (!/^[0-9a-f-]{36}$/i.test(to) || !(await areFriends(me.id, to))) throw new HttpError(403, 'Você só pode chamar amigos para jogar.');
  const recent = await one(`select 1 from invites where from_id = $1 and to_id = $2 and status = 'pending' and created_at > now() - interval '1 minute'`, [me.id, to]);
  if (recent) throw new HttpError(429, 'Você acabou de chamar essa pessoa. Espere um minutinho.');

  const game = str(b.game, 60) || 'Farming Simulator 25';
  const server = str(b.server, 80);
  const row = await one<{ id: string }>('insert into invites (from_id, to_id, game, server, password, message) values ($1, $2, $3, $4, $5, $6) returning id', [
    me.id,
    to,
    game,
    server,
    str(b.password, 40),
    str(b.message, 200),
  ]);
  const msg = str(b.message, 200);
  await notify({
    userId: to,
    actorId: me.id,
    type: 'invite',
    inviteId: row!.id,
    text: `${me.name} está chamando você para jogar ${game}${server ? ` no servidor “${server}”` : ''}.${msg ? ` “${msg}”` : ''}`,
    push: { title: '🎮 Bora jogar?', url: `/convites?abrir=${row!.id}` },
  });
  return NextResponse.json(await getInvite(me.id, row!.id));
});
