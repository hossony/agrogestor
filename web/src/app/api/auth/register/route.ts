import { NextResponse } from 'next/server';
import { body, hashPassword, HttpError, route, str } from '@/lib/auth';
import { newFriendCode } from '@/lib/code';
import { one } from '@/lib/db';
import { cookieOptions, COOKIE, signSession } from '@/lib/session';

export const POST = route(async (req: Request) => {
  const b = await body<{ name?: string; username?: string; password?: string }>(req);
  const name = str(b.name, 40);
  const username = str(b.username, 24).toLowerCase();
  const password = typeof b.password === 'string' ? b.password : '';
  if (name.length < 2) throw new HttpError(400, 'Informe o seu nome.');
  if (!/^[a-z0-9._-]{3,24}$/.test(username)) throw new HttpError(400, 'O usuário precisa ter de 3 a 24 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.');
  if (password.length < 6) throw new HttpError(400, 'A senha precisa ter pelo menos 6 caracteres.');
  if (await one('select 1 from users where username = $1', [username])) throw new HttpError(409, 'Esse usuário já existe. Escolha outro.');

  const hash = await hashPassword(password);
  let user: { id: string } | null = null;
  for (let i = 0; i < 5 && !user; i++) {
    user = await one<{ id: string }>('insert into users (code, username, name, password_hash) values ($1, $2, $3, $4) on conflict (code) do nothing returning id', [newFriendCode(), username, name, hash]);
  }
  if (!user) throw new HttpError(500, 'Não foi possível criar a conta agora. Tente de novo.');
  // O site usa o cookie; o app do celular guarda o token e manda no cabeçalho Authorization.
  const token = await signSession(user.id);
  const res = NextResponse.json({ ok: true, token });
  res.cookies.set(COOKIE, token, cookieOptions);
  return res;
});
