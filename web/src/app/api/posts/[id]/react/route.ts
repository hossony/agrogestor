import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route } from '@/lib/auth';
import { one, tx } from '@/lib/db';
import { notify } from '@/lib/notify';

type Ctx = { params: Promise<{ id: string }> };

/** Liga/desliga a curtida ou o foguinho da pessoa na postagem. */
export const POST = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const { kind } = await body<{ kind?: string }>(req);
  if (kind !== 'like' && kind !== 'fire') throw new HttpError(400, 'Reação inválida.');
  const post = /^[0-9a-f-]{36}$/i.test(id) ? await one<{ author_id: string; body: string }>('select author_id, body from posts where id = $1', [id]) : null;
  if (!post) throw new HttpError(404, 'Postagem não encontrada.');
  const col = kind === 'like' ? 'like_count' : 'fire_count';

  const result = await tx(async (c) => {
    const del = await c.query('delete from post_reactions where post_id = $1 and user_id = $2 and kind = $3', [id, me.id, kind]);
    const on = del.rowCount === 0;
    if (on) await c.query('insert into post_reactions (post_id, user_id, kind) values ($1, $2, $3) on conflict do nothing', [id, me.id, kind]);
    const r = await c.query(`update posts set ${col} = greatest(${col} + $2, 0) where id = $1 returning like_count, fire_count`, [id, on ? 1 : -1]);
    return { on, ...(r.rows[0] as { like_count: number; fire_count: number }) };
  });

  if (result.on) {
    const snippet = post.body ? `: “${post.body.slice(0, 60)}${post.body.length > 60 ? '…' : ''}”` : '';
    await notify({
      userId: post.author_id,
      actorId: me.id,
      type: kind,
      postId: id,
      text: kind === 'fire' ? `${me.name} deu um 🔥 na sua postagem${snippet}` : `${me.name} curtiu a sua postagem${snippet}`,
    });
  }
  return NextResponse.json(result);
});
