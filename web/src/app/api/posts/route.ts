import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route, str } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { FRIEND_IDS, getPost, HOT_ORDER, POST_SELECT } from '@/lib/queries';
import { CATEGORIES, Media, Post } from '@/lib/types';

const PAGE = 12;

export const GET = route(async (req: Request) => {
  const me = await requireUser();
  const sp = new URL(req.url).searchParams;
  const sort = sp.get('sort') ?? 'hot';
  const page = Math.max(0, Number(sp.get('page')) || 0);
  const where: string[] = [];
  const params: unknown[] = [me.id];

  if (sp.get('scope') === 'friends') where.push(`(p.author_id in ${FRIEND_IDS} or p.author_id = $1)`);
  const author = sp.get('author');
  if (author) {
    params.push(author);
    where.push(`u.code = $${params.length}`);
  }
  const cat = sp.get('category');
  if (cat && CATEGORIES.some((c) => c.id === cat)) {
    params.push(cat);
    where.push(`p.category = $${params.length}`);
  }
  if (sort === 'top') where.push(`p.created_at > now() - interval '30 days'`);

  // Aba "Republicados" do perfil: o que a pessoa republicou, do mais recente.
  const repostedBy = sp.get('reposted_by');
  if (repostedBy) {
    params.push(repostedBy, PAGE + 1, page * PAGE);
    const n = params.length;
    const rows = await q<Post>(
      `select * from (${POST_SELECT.replace('select p.id,', 'select rr.created_at as reposted_at, p.id,')} join reposts rr on rr.post_id = p.id join users ru on ru.id = rr.user_id where ru.code = $${n - 2}) x order by reposted_at desc limit $${n - 1} offset $${n}`,
      params,
    );
    return NextResponse.json({ posts: rows.slice(0, PAGE), more: rows.length > PAGE });
  }

  const order = sort === 'new' ? 'p.created_at desc' : sort === 'top' ? '(p.fire_count + p.like_count + p.repost_count) desc, p.created_at desc' : HOT_ORDER;
  params.push(PAGE + 1, page * PAGE);
  const rows = await q<Post>(`${POST_SELECT} ${where.length ? 'where ' + where.join(' and ') : ''} order by ${order} limit $${params.length - 1} offset $${params.length}`, params);
  return NextResponse.json({ posts: rows.slice(0, PAGE), more: rows.length > PAGE });
});

function cleanMedia(v: unknown): Media[] {
  if (!Array.isArray(v)) return [];
  return v
    .slice(0, 6)
    .filter((m) => m && typeof m.url === 'string' && /^(https:\/\/|\/uploads\/)/.test(m.url) && m.url.length < 600)
    .map((m) => ({ url: m.url, type: m.type === 'video' ? 'video' : 'image', w: Number(m.w) || undefined, h: Number(m.h) || undefined }));
}

export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const b = await body<{ body?: string; category?: string; media?: unknown }>(req);
  const text = str(b.body, 4000);
  const media = cleanMedia(b.media);
  if (!text && !media.length) throw new HttpError(400, 'Escreva algo ou adicione uma imagem ou vídeo.');
  const category = CATEGORIES.some((c) => c.id === b.category) ? b.category : 'geral';
  // Limite simples contra spam: 10 posts a cada 10 minutos.
  const recent = await one<{ n: number }>(`select count(*)::int as n from posts where author_id = $1 and created_at > now() - interval '10 minutes'`, [me.id]);
  if ((recent?.n ?? 0) >= 10) throw new HttpError(429, 'Muitas postagens seguidas. Espere alguns minutos.');
  const row = await one<{ id: string }>('insert into posts (author_id, body, category, media) values ($1, $2, $3, $4) returning id', [me.id, text, category, JSON.stringify(media)]);
  return NextResponse.json(await getPost(me.id, row!.id));
});
