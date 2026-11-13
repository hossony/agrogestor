import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/auth';
import { one, tx } from '@/lib/db';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

/** Republicar / desfazer. A postagem aparece na aba "Republicados" do perfil de quem republicou. */
export const POST = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const post = /^[0-9a-f-]{36}$/i.test(id) ? await one<{ author_id: string; body: string }>('select author_id, body from posts where id = $1', [id]) : null;
  if (!post) throw new HttpError(404, 'Postagem não encontrada.');
  if (post.author_id === me.id) throw new HttpError(400, 'Você não pode republicar a própria postagem.');
  const r = await tx(async (c) => {
    const del = await c.query('delete from reposts where user_id = $1 and post_id = $2', [me.id, id]);
    const on = del.rowCount === 0;
    if (on) await c.query('insert into reposts (user_id, post_id) values ($1, $2) on conflict do nothing', [me.id, id]);
    const u = await c.query('update posts set repost_count = greatest(repost_count + $2, 0) where id = $1 returning repost_count', [id, on ? 1 : -1]);
    return { reposted: on, repost_count: (u.rows[0] as { repost_count: number }).repost_count };
  });
  if (r.reposted) {
    const snippet = post.body ? `: “${post.body.slice(0, 60)}${post.body.length > 60 ? '…' : ''}”` : '';
    await notify({ userId: post.author_id, actorId: me.id, type: 'repost', postId: id, text: `${me.name} republicou a sua postagem${snippet}` });
  }
  return NextResponse.json(r);
});
