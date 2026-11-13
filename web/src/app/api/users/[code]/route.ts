import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/auth';
import { canHaveLinks } from '@/lib/badges';
import { one } from '@/lib/db';
import { relation, userByCode } from '@/lib/queries';

type Ctx = { params: Promise<{ code: string }> };

/**
 * Perfil. A fazenda (patrimônio) segue a privacidade da pessoa:
 * público = todos; só amigos = amigos aceitos; privado = só ela mesma.
 */
export const GET = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { code } = await ctx.params;
  const u = await userByCode(decodeURIComponent(code));
  if (!u) throw new HttpError(404, 'Perfil não encontrado.');
  const rel = await relation(me.id, u.id);
  const canSeeFarm = rel === 'self' || u.privacy === 'public' || (u.privacy === 'friends' && rel === 'friend');
  const [stats, following] = await Promise.all([
    one<{ posts: number; friends: number; fires: number }>(
      `select (select count(*)::int from posts where author_id = $1) as posts,
              (select count(*)::int from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1)) as friends,
              (select coalesce(sum(fire_count), 0)::int from posts where author_id = $1) as fires`,
      [u.id],
    ),
    one('select 1 from follows where follower_id = $1 and followed_id = $2', [me.id, u.id]),
  ]);
  return NextResponse.json({
    user: { id: u.id, code: u.code, username: u.username, name: u.name, avatar_url: u.avatar_url, banner_url: u.banner_url, bio: u.bio, created_at: u.created_at, badges: u.badges, links: canHaveLinks(u.badges) ? u.links : {}, privacy: u.privacy },
    relation: rel,
    stats: { ...stats, followers: u.follower_count },
    following: Boolean(following),
    hasFarm: Boolean(u.farm),
    farm: canSeeFarm ? u.farm : null,
    farmUpdatedAt: canSeeFarm ? u.farm_updated_at : null,
    /** Por que a fazenda não aparece (para a tela explicar). */
    farmHidden: canSeeFarm ? null : u.privacy === 'private' ? 'private' : 'friends',
  });
});
