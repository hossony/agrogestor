import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route, str } from '@/lib/auth';
import { normalizeCode } from '@/lib/code';
import { one, q } from '@/lib/db';
import { farmTotals, type FarmSnapshot } from '@/lib/farm';
import { notify } from '@/lib/notify';
import { ONLINE } from '@/lib/queries';

const COLS = `u.id, u.code, u.username, u.name, u.avatar_url, u.badges, u.platform, u.banner_url, u.bio, u.farm is not null as has_farm, u.farm->>'farmName' as farm_name, ${ONLINE('u')} as online, u.last_seen_at`;

export const GET = route(async () => {
  const me = await requireUser();
  const [friends, received, sent] = await Promise.all([
    q<Record<string, unknown> & { farm: FarmSnapshot | null; privacy: string }>(
      `select ${COLS}, u.farm, u.privacy, f.accepted_at as since from friendships f
       join users u on u.id = case when f.requester_id = $1 then f.addressee_id else f.requester_id end and u.banned_at is null
       where f.status = 'accepted' and (f.requester_id = $1 or f.addressee_id = $1) order by u.name`,
      [me.id],
    ).then((rows) =>
      // Resumo para o cartão do amigo (patrimônio e máquinas), respeitando a fazenda privada.
      rows.map(({ farm, privacy, ...u }) => {
        const visible = farm && privacy !== 'private';
        const t = visible ? farmTotals(farm) : null;
        return { ...u, summary: t ? { worth: t.worth, currency: farm!.currency, machines: farm!.machines.length, area: t.area } : null };
      }),
    ),
    q(`select ${COLS}, f.created_at as since from friendships f join users u on u.id = f.requester_id where f.addressee_id = $1 and f.status = 'pending' order by f.created_at desc`, [me.id]),
    q(`select ${COLS}, f.created_at as since from friendships f join users u on u.id = f.addressee_id where f.requester_id = $1 and f.status = 'pending' order by f.created_at desc`, [me.id]),
  ]);
  return NextResponse.json({ friends, received, sent });
});

/** Pedido de amizade pelo ID (AG-XXXXXX). Se a outra pessoa já tinha pedido, vira amizade na hora. */
export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const { code } = await body<{ code?: string }>(req);
  const raw = str(code, 40);
  if (!raw) throw new HttpError(400, 'Digite o ID do amigo.');
  const target = await one<{ id: string; name: string }>('select id, name from users where code = $1 or username = $2', [normalizeCode(raw), raw.toLowerCase().replace(/^@/, '')]);
  if (!target) throw new HttpError(404, 'Nenhum fazendeiro com esse ID. Confira as letras e os números.');
  if (target.id === me.id) throw new HttpError(400, 'Esse é o seu próprio ID.');

  const existing = await one<{ requester_id: string; status: string }>(
    'select requester_id, status from friendships where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)',
    [me.id, target.id],
  );
  if (existing?.status === 'accepted') throw new HttpError(409, `Você e ${target.name} já são amigos.`);
  if (existing && existing.requester_id === me.id) throw new HttpError(409, `Você já mandou um pedido para ${target.name}. Agora é esperar.`);
  if (existing) {
    await q(`update friendships set status = 'accepted', accepted_at = now() where requester_id = $1 and addressee_id = $2`, [target.id, me.id]);
    await notify({ userId: target.id, actorId: me.id, type: 'friend_accept', text: `${me.name} aceitou o seu pedido de amizade.`, push: { title: 'Nova amizade', url: `/u/${me.code}` } });
    return NextResponse.json({ status: 'accepted', name: target.name });
  }
  await q('insert into friendships (requester_id, addressee_id) values ($1, $2)', [me.id, target.id]);
  await notify({ userId: target.id, actorId: me.id, type: 'friend_request', text: `${me.name} quer ser seu amigo.`, push: { title: 'Pedido de amizade', url: '/amigos' } });
  return NextResponse.json({ status: 'sent', name: target.name });
});
