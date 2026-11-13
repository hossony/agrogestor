import { NextResponse } from 'next/server';
import { body, HttpError, isOwner, requireUser, route, str } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { getComments, getPost } from '@/lib/queries';
import { CATEGORIES } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export const GET = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const post = UUID.test(id) ? await getPost(me.id, id) : null;
  if (!post) throw new HttpError(404, 'Postagem não encontrada.');
  return NextResponse.json({ post, comments: await getComments(me.id, id) });
});

/** Editar o texto (ou a categoria) da própria postagem. Ela passa a mostrar "(editada)". */
export const PATCH = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw new HttpError(404, 'Postagem não encontrada.');
  const b = await body<{ body?: string; category?: string }>(req);
  const cur = await one<{ author_id: string; body: string; category: string; media: unknown[] }>('select author_id, body, category, media from posts where id = $1', [id]);
  if (!cur || cur.author_id !== me.id) throw new HttpError(404, 'Postagem não encontrada.');
  const text = b.body !== undefined ? str(b.body, 4000) : cur.body;
  if (!text && !cur.media.length) throw new HttpError(400, 'A postagem não pode ficar vazia.');
  const category = b.category && CATEGORIES.some((c) => c.id === b.category) ? b.category : cur.category;
  if (text !== cur.body || category !== cur.category) await q('update posts set body = $2, category = $3, edited_at = now() where id = $1', [id, text, category]);
  return NextResponse.json(await getPost(me.id, id));
});

/** Apagar: o autor apaga a sua; o dono da plataforma apaga qualquer uma (moderação). */
export const DELETE = route(async (_req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  if (!UUID.test(id)) throw new HttpError(404, 'Postagem não encontrada.');
  const rows = isOwner(me) ? await q('delete from posts where id = $1 returning id', [id]) : await q('delete from posts where id = $1 and author_id = $2 returning id', [id, me.id]);
  if (!rows.length) throw new HttpError(404, 'Postagem não encontrada.');
  return NextResponse.json({ ok: true });
});
