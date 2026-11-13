import 'server-only';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { one } from './db';
import { COOKIE, readSession } from './session';

export interface Me {
  id: string;
  code: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

export async function currentUser(): Promise<Me | null> {
  // O app (celular/Windows/gestão) manda "Authorization: Bearer <token>"; o site usa o cookie.
  const bearer = (await headers()).get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const id = await readSession(bearer ?? (await cookies()).get(COOKIE)?.value);
  if (!id) return null;
  return one<Me>('select id, code, username, name, bio, avatar_url, banner_url from users where id = $1', [id]);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function requireUser(): Promise<Me> {
  const me = await currentUser();
  if (!me) throw new HttpError(401, 'Entre na sua conta para continuar.');
  return me;
}

/** Envolve uma rota: converte erros em JSON com a mensagem para a pessoa. */
export function route<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      return NextResponse.json({ error: 'Algo deu errado no servidor. Tente de novo em instantes.' }, { status: 500 });
    }
  };
}

export async function body<T>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    throw new HttpError(400, 'Requisição inválida.');
  }
}

export const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
