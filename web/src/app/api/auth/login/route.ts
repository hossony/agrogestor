import { NextResponse } from 'next/server';
import { body, checkPassword, HttpError, route, str } from '@/lib/auth';
import { one } from '@/lib/db';
import { cookieOptions, COOKIE, signSession } from '@/lib/session';

export const POST = route(async (req: Request) => {
  const b = await body<{ username?: string; password?: string }>(req);
  const username = str(b.username, 40).toLowerCase().replace(/^@/, '');
  const user = await one<{ id: string; password_hash: string }>('select id, password_hash from users where username = $1', [username]);
  if (!user || !(await checkPassword(String(b.password ?? ''), user.password_hash))) throw new HttpError(401, 'Usuário ou senha incorretos.');
  // O site usa o cookie; o app do celular guarda o token e manda no cabeçalho Authorization.
  const token = await signSession(user.id);
  const res = NextResponse.json({ ok: true, token });
  res.cookies.set(COOKIE, token, cookieOptions);
  return res;
});
