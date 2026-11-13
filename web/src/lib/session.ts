import { jwtVerify, SignJWT } from 'jose';

/** Sessão em cookie assinado (JWT). Usado pelo proxy e pelas rotas. */
export const COOKIE = 'ag_session';
const MAX_AGE = 60 * 60 * 24 * 60; // 60 dias

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET não configurado.');
  return new TextEncoder().encode(s || 'dev-secret-agrogestor-nao-use-em-producao');
}

export async function signSession(userId: string) {
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(secret());
}

export async function readSession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE,
};
