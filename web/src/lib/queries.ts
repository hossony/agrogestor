import 'server-only';
import { one, q } from './db';
import { Comment, Invite, Post, Relation, UserLite } from './types';

/** Subconsulta com os ids dos amigos de $1. */
export const FRIEND_IDS = `(select case when f.requester_id = $1 then f.addressee_id else f.requester_id end
  from friendships f where f.status = 'accepted' and (f.requester_id = $1 or f.addressee_id = $1))`;

const lite = (prefix: string) => `json_build_object('id', ${prefix}.id, 'code', ${prefix}.code, 'username', ${prefix}.username, 'name', ${prefix}.name, 'avatar_url', ${prefix}.avatar_url)`;

export const POST_SELECT = `select p.id, p.body, p.category, p.media, p.like_count, p.fire_count, p.comment_count, p.created_at,
  ${lite('u')} as author,
  exists(select 1 from post_reactions r where r.post_id = p.id and r.user_id = $1 and r.kind = 'like') as liked,
  exists(select 1 from post_reactions r where r.post_id = p.id and r.user_id = $1 and r.kind = 'fire') as fired,
  (p.author_id = $1) as mine
  from posts p join users u on u.id = p.author_id`;

/** Ordenação "Em alta", no estilo do Reddit: foguinhos pesam mais, e o tempo puxa para baixo. */
export const HOT_ORDER = `(log(greatest(p.fire_count * 2 + p.like_count + p.comment_count, 1)) + extract(epoch from p.created_at - timestamptz '2025-01-01') / 45000) desc`;

export async function getPost(me: string, id: string): Promise<Post | null> {
  return one<Post>(`${POST_SELECT} where p.id = $2`, [me, id]);
}

export async function getComments(me: string, postId: string): Promise<Comment[]> {
  return q<Comment>(
    `select c.id, c.post_id, c.parent_id, c.body, c.created_at, ${lite('u')} as author, (c.author_id = $1) as mine
     from comments c join users u on u.id = c.author_id where c.post_id = $2 order by c.created_at asc limit 500`,
    [me, postId],
  );
}

export async function relation(me: string, other: string): Promise<Relation> {
  if (me === other) return 'self';
  const r = await one<{ requester_id: string; status: string }>(
    'select requester_id, status from friendships where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)',
    [me, other],
  );
  if (!r) return 'none';
  if (r.status === 'accepted') return 'friend';
  return r.requester_id === me ? 'sent' : 'received';
}

export async function areFriends(a: string, b: string) {
  return (await relation(a, b)) === 'friend';
}

export const INVITE_SELECT = `select i.id, i.game, i.server, i.password, i.message, i.status, i.created_at, i.responded_at,
  ${lite('fu')} as "from", ${lite('tu')} as "to", (i.to_id = $1) as incoming
  from invites i join users fu on fu.id = i.from_id join users tu on tu.id = i.to_id`;

export async function getInvite(me: string, id: string): Promise<Invite | null> {
  return one<Invite>(`${INVITE_SELECT} where i.id = $2 and (i.from_id = $1 or i.to_id = $1)`, [me, id]);
}

export async function userByCode(code: string) {
  return one<UserLite & { bio: string; banner_url: string | null; farm: unknown; farm_updated_at: string | null; created_at: string }>(
    'select id, code, username, name, avatar_url, bio, banner_url, farm, farm_updated_at, created_at from users where code = $1 or username = lower($1)',
    [code],
  );
}
