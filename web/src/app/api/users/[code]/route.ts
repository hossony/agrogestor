import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/auth';
import { one } from '@/lib/db';
import { relation, userByCode } from '@/lib/queries';

type Ctx = { params: Promise<{ code: string }> };

/** Perfil público. A fazenda (patrimônio) só aparece para amigos e para a própria pessoa. */
export const GET = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { code } = await ctx.params;
  const u = await userByCode(decodeURIComponent(code));
  if (!u) throw new HttpError(404, 'Perfil não encontrado.');
  const rel = await relation(me.id, u.id);
  const canSeeFarm = rel === 'self' || rel === 'friend';
  const stats = await one<{ posts: number; friends: number; fires: number }>(
    `select (select count(*)::int from posts where author_id = $1) as posts,
            (select count(*)::int from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1)) as friends,
            (select coalesce(sum(fire_count), 0)::int from posts where author_id = $1) as fires`,
    [u.id],
  );
  return NextResponse.json({
    user: { id: u.id, code: u.code, username: u.username, name: u.name, avatar_url: u.avatar_url, banner_url: u.banner_url, bio: u.bio, created_at: u.created_at },
    relation: rel,
    stats,
    hasFarm: Boolean(u.farm),
    farm: canSeeFarm ? u.farm : null,
    farmUpdatedAt: canSeeFarm ? u.farm_updated_at : null,
  });
});
