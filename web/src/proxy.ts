import { NextResponse, type NextRequest } from 'next/server';

/**
 * CORS da API para o app do celular e do Windows (que rodam fora deste domínio).
 * Eles se autenticam com "Authorization: Bearer <token>", nunca com cookie,
 * então liberar qualquer origem não abre brecha para o login do site.
 */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-version',
  'Access-Control-Max-Age': '86400',
};

export function proxy(request: NextRequest) {
  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: CORS });
  const res = NextResponse.next();
  Object.entries(CORS).forEach(([k, v]) => res.headers.set(k, v));
  return res;
}

export const config = { matcher: '/api/:path*' };
