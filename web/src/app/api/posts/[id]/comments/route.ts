import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route, str } from '@/lib/auth';
import { one, tx } from '@/lib/db';
import { notify } from '@/lib/notify';
import { Comment } from '@/lib/types';

type Ctx = { params: Promise<{ id: string }> };

export const POST = route(async (req: Request, ctx: Ctx) => {
  const me = await requireUser();
  const { id } = await ctx.params;
  const b = await body<{ body?: string; parent_id?: string | null }>(req);
  const text = str(b.body, 1500);
  if (!text) throw new HttpError(400, 'Escreva o comentário.');
  const post = /^[0-9a-f-]{36}$/i.test(id) ? await one<{ author_id: string }>('select author_id from posts where id = $1', [id]) : null;
  if (!post) throw new HttpError(404, 'Postagem não encontrada.');

  let parent: { id: string; author_id: string } | null = null;
  if (b.parent_id) {
    if (!/^[0-9a-f-]{36}$/i.test(b.parent_id)) throw new HttpError(404, 'Comentário não encontrado.');
    // Respostas ficam em um nível só: responder uma resposta vai para o comentário de cima.
    parent = await one<{ id: string; author_id: string }>('select coalesce(parent_id, id) as id, author_id from comments where id = $1 and post_id = $2', [b.parent_id, id]);
    if (!parent) throw new HttpError(404, 'Comentário não encontrado.');
  }

  const row = await tx(async (c) => {
    const r = await c.query('insert into comments (post_id, author_id, parent_id, body) values ($1, $2, $3, $4) returning id, created_at', [id, me.id, parent?.id ?? null, text]);
    await c.query('update posts set comment_count = comment_count + 1 where id = $1', [id]);
    return r.rows[0] as { id: string; created_at: string };
  });

  const short = `“${text.slice(0, 80)}${text.length > 80 ? '…' : ''}”`;
  const url = `/post/${id}`;
  if (parent && parent.author_id !== me.id) await notify({ userId: parent.author_id, actorId: me.id, type: 'reply', postId: id, text: `${me.name} respondeu o seu comentário: ${short}`, push: { title: 'Nova resposta', url } });
  if (post.author_id !== parent?.author_id) await notify({ userId: post.author_id, actorId: me.id, type: 'comment', postId: id, text: `${me.name} comentou: ${short}`, push: { title: 'Novo comentário', url } });

  const comment: Comment = {
    id: row.id,
    post_id: id,
    parent_id: parent?.id ?? null,
    body: text,
    created_at: row.created_at,
    mine: true,
    author: { id: me.id, code: me.code, username: me.username, name: me.name, avatar_url: me.avatar_url },
  };
  return NextResponse.json(comment);
});
