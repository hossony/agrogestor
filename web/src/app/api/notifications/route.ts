import { NextResponse } from 'next/server';
import { body, requireUser, route } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { Notification } from '@/lib/types';

const SELECT = `select n.id::text, n.type, n.text, n.post_id, n.invite_id, (n.read_at is not null) as read, n.created_at,
  case when a.id is null then null else json_build_object('id', a.id, 'code', a.code, 'username', a.username, 'name', a.name, 'avatar_url', a.avatar_url) end as actor,
  i.status as invite_status
  from notifications n left join users a on a.id = n.actor_id left join invites i on i.id = n.invite_id`;

/**
 * Sem `after`: as 60 mais recentes. Com `after` (id da última vista): só as novas,
 * usadas pelas telas abertas para mostrar o aviso na hora.
 */
export const GET = route(async (req: Request) => {
  const me = await requireUser();
  const sp = new URL(req.url).searchParams;
  const after = Number(sp.get('after'));
  const items = sp.get('initial')
    ? // Primeira consulta da tela: convites ainda em aberto (para não perder um chamado feito enquanto o site estava fechado).
      await q<Notification>(`${SELECT} where n.user_id = $1 and n.type = 'invite' and n.read_at is null and i.status = 'pending' and i.created_at > now() - interval '3 hours' order by n.id desc limit 3`, [me.id])
    : Number.isFinite(after) && after > 0
      ? await q<Notification>(`${SELECT} where n.user_id = $1 and n.id > $2 order by n.id desc limit 20`, [me.id, after])
      : await q<Notification>(`${SELECT} where n.user_id = $1 order by n.id desc limit 60`, [me.id]);
  const counts = await one<{ unread: number; friend_requests: number; invites: number }>(
    `select (select count(*)::int from notifications where user_id = $1 and read_at is null) as unread,
            (select count(*)::int from friendships where addressee_id = $1 and status = 'pending') as friend_requests,
            (select count(*)::int from invites where to_id = $1 and status = 'pending' and created_at > now() - interval '3 hours') as invites`,
    [me.id],
  );
  const newest = await one<{ id: string }>('select coalesce(max(id), 0)::text as id from notifications where user_id = $1', [me.id]);
  return NextResponse.json({ items, ...counts, newest: Number(newest?.id ?? 0) });
});

/** Marca como lidas: todas, ou só os ids enviados. */
export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const b = await body<{ ids?: unknown }>(req);
  const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isFinite).slice(0, 200) : null;
  if (ids) await q('update notifications set read_at = now() where user_id = $1 and id = any($2::bigint[]) and read_at is null', [me.id, ids]);
  else await q('update notifications set read_at = now() where user_id = $1 and read_at is null', [me.id]);
  return NextResponse.json({ ok: true });
});
