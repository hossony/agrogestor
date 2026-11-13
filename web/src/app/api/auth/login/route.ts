import { NextResponse } from 'next/server';
import { body, checkPassword, HttpError, route, str } from '@/lib/auth';
import { one } from '@/lib/db';
import { cookieOptions, COOKIE, signSession } from '@/lib/session';

export const POST = route(async (req: Request) => {
  const b = await body<{ username?: string; password?: string }>(req);
  const username = str(b.username, 40).toLowerCase().replace(/^@/, '');
  const user = await one<{ id: string; password_hash: string }>('select id, password_hash from users where username = $1', [username]);
  if (!user || !(await checkPassword(String(b.password ?? ''), user.password_hash))) throw new HttpError(401, 'Usuário ou senha incorretos.');
  // O token também volta no corpo para o app do celular/Windows (que não usa cookie).
  const token = await signSession(user.id);
  const me = await one('select id, code, username, name from users where id = $1', [user.id]);
  const res = NextResponse.json({ ok: true, token, user: me });
  res.cookies.set(COOKIE, token, cookieOptions);
  return res;
});
