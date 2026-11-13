import 'server-only';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { one, q } from './db';
import { COOKIE, readSession } from './session';

export interface Me {
  id: string;
  code: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  badges: string[];
  privacy: 'public' | 'friends' | 'private';
  links: Record<string, string>;
  platform: string | null;
}

export const ME_COLS = 'id, code, username, name, bio, avatar_url, banner_url, badges, privacy, links, platform';

/** O dono da plataforma (selo preto) pode moderar tudo. */
export const isOwner = (me: Pick<Me, 'badges'>) => me.badges.includes('owner');

export const PLATFORMS = ['ps', 'xbox', 'pc'] as const;
export const cleanPlatform = (v: unknown) => (typeof v === 'string' && (PLATFORMS as readonly string[]).includes(v) ? v : null);

/** O dono (OWNER_USERNAME) ganha o selo preto na primeira vez que entra. */
export async function ensureOwnerBadge(userId: string, username: string) {
  const owner = (process.env.OWNER_USERNAME || '').trim().toLowerCase().replace(/^@/, '');
  if (owner && username === owner) await q(`update users set badges = array_append(badges, 'owner') where id = $1 and not ('owner' = any(badges))`, [userId]);
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const checkPassword = (p: string, h: string) => bcrypt.compare(p, h);

/** Sessão do site (cookie) ou do app do celular/Windows (Authorization: Bearer). */
export async function currentUser(): Promise<Me | null> {
  const auth = (await headers()).get('authorization');
  const token = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : (await cookies()).get(COOKIE)?.value;
  const id = await readSession(token);
  if (!id) return null;
  // Conta suspensa pelo dono: a sessão deixa de valer.
  const me = await one<Me>(`select ${ME_COLS} from users where id = $1 and banned_at is null`, [id]);
  // Presença (online/offline): marca no máximo a cada 30 s para não pesar no banco.
  if (me) q(`update users set last_seen_at = now() where id = $1 and (last_seen_at is null or last_seen_at < now() - interval '30 seconds')`, [id]).catch(() => {});
  return me;
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
      // Falta de variável de ambiente: mostra qual é, para facilitar a configuração na Vercel.
      if (e instanceof Error && /não configurado/.test(e.message)) return NextResponse.json({ error: `Servidor sem configuração: ${e.message} Adicione em Settings › Environment Variables na Vercel e faça um novo deploy.` }, { status: 500 });
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
