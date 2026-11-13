import { NextResponse } from 'next/server';
import { body, checkPassword, cleanPlatform, hashPassword, HttpError, ME_COLS, requireUser, route, str } from '@/lib/auth';
import { canHaveLinks, PRIVACY, sanitizeLinks } from '@/lib/badges';
import { one, q } from '@/lib/db';

const media = (v: unknown) => (v === null || v === '' ? null : typeof v === 'string' && /^(https:\/\/|\/uploads\/)/.test(v) && v.length < 600 ? v : undefined);

export const GET = route(async () => NextResponse.json(await requireUser()));

export const PATCH = route(async (req: Request) => {
  const me = await requireUser();
  const b = await body<{ name?: string; bio?: string; avatar_url?: string | null; banner_url?: string | null; password?: string; newPassword?: string; privacy?: string; links?: unknown; platform?: string | null }>(req);
  const name = b.name !== undefined ? str(b.name, 40) : me.name;
  if (name.length < 2) throw new HttpError(400, 'Informe o seu nome.');
  const bio = b.bio !== undefined ? str(b.bio, 280) : me.bio;
  const avatar = b.avatar_url !== undefined ? media(b.avatar_url) : me.avatar_url;
  const banner = b.banner_url !== undefined ? media(b.banner_url) : me.banner_url;
  if (avatar === undefined || banner === undefined) throw new HttpError(400, 'Imagem inválida.');
  const privacy = b.privacy !== undefined ? b.privacy : me.privacy;
  if (!PRIVACY.some((p) => p.id === privacy)) throw new HttpError(400, 'Privacidade inválida.');
  // Links sociais: só para criadores de conteúdo, streamers e o dono.
  const platform = b.platform !== undefined ? cleanPlatform(b.platform) : me.platform;
  const links = b.links !== undefined ? (canHaveLinks(me.badges) ? sanitizeLinks(b.links) : {}) : me.links;

  if (b.newPassword !== undefined) {
    const row = await one<{ password_hash: string }>('select password_hash from users where id = $1', [me.id]);
    if (!row || !(await checkPassword(String(b.password ?? ''), row.password_hash))) throw new HttpError(400, 'A senha atual não confere.');
    if (String(b.newPassword).length < 6) throw new HttpError(400, 'A nova senha precisa ter pelo menos 6 caracteres.');
    await q('update users set password_hash = $2 where id = $1', [me.id, await hashPassword(String(b.newPassword))]);
  }
  const updated = await one(`update users set name = $2, bio = $3, avatar_url = $4, banner_url = $5, privacy = $6, links = $7, platform = $8 where id = $1 returning ${ME_COLS}`, [me.id, name, bio, avatar, banner, privacy, JSON.stringify(links), platform]);
  return NextResponse.json(updated);
});
