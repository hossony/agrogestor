import { NextResponse } from 'next/server';
import { HttpError, requireUser, route } from '@/lib/auth';
import { q } from '@/lib/db';
import { getComments, getPost } from '@/lib/queries';

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const post = UUID.test(id) ? await getPost(me.id, id) : null;
  if (!post) throw new HttpError(404, 'Postagem não encontrada.');
  return NextResponse.json({ post, comments: await getComments(me.id, id) });
});

export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw new HttpError(404, 'Postagem não encontrada.');
  const rows = await q('delete from posts where id = $1 and author_id = $2 returning id', [id, me.id]);
  if (!rows.length) throw new HttpError(404, 'Postagem não encontrada.');
  return NextResponse.json({ ok: true });
});
