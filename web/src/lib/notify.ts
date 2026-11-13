import 'server-only';
import { one } from './db';
import { pushTo } from './push';

export type NotifType = 'friend_request' | 'friend_accept' | 'like' | 'fire' | 'comment' | 'reply' | 'invite' | 'invite_accept' | 'invite_decline';

interface Opts {
  userId: string;
  actorId: string;
  type: NotifType;
  text: string;
  postId?: string;
  inviteId?: string;
  /** Também manda push para o celular/computador. */
  push?: { title: string; url: string };
}

export async function notify(o: Opts) {
  if (o.userId === o.actorId) return;
  // Curtidas e foguinhos repetidos no mesmo post viram uma notificação só.
  if ((o.type === 'like' || o.type === 'fire') && o.postId) {
    const dup = await one('select 1 from notifications where user_id = $1 and actor_id = $2 and type = $3 and post_id = $4', [o.userId, o.actorId, o.type, o.postId]);
    if (dup) return;
  }
  await one('insert into notifications (user_id, actor_id, type, text, post_id, invite_id) values ($1, $2, $3, $4, $5, $6) returning id', [
    o.userId,
    o.actorId,
    o.type,
    o.text,
    o.postId ?? null,
    o.inviteId ?? null,
  ]);
  if (o.push) await pushTo(o.userId, { title: o.push.title, body: o.text, url: o.push.url, tag: o.inviteId ? `convite-${o.inviteId}` : o.type, inviteId: o.type === 'invite' ? o.inviteId : undefined }).catch(() => {});
}
