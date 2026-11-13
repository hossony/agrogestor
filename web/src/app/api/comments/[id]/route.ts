import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/auth';
import { tx } from '@/lib/db';

type Ctx = { params: Promise<{ id: string }> };

/** Apaga o comentário (do autor do comentário ou do dono da postagem) e as respostas dele. */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new HttpError(404, 'Comentário não encontrado.');
  const removed = await tx(async (c) => {
    const r = await c.query(
      `select c.post_id, 1 + (select count(*)::int from comments x where x.parent_id = c.id) as n
       from comments c join posts p on p.id = c.post_id where c.id = $1 and (c.author_id = $2 or p.author_id = $2)`,
      [id, me.id],
    );
    if (!r.rows.length) return null;
    const { post_id, n } = r.rows[0] as { post_id: string; n: number };
    await c.query('delete from comments where id = $1', [id]);
    await c.query('update posts set comment_count = greatest(comment_count - $2, 0) where id = $1', [post_id, n]);
    return n;
  });
  if (removed === null) throw new HttpError(404, 'Comentário não encontrado.');
  return NextResponse.json({ ok: true, removed });
});
