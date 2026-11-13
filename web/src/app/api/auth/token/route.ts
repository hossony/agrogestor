import { NextResponse } from 'next/server';
import { requireUser, route } from '@/lib/auth';
import { signSession } from '@/lib/session';

/** Entrega um token para o app de gestão (/gestao) de quem já entrou no site. */
export const GET = route(async () => {
  const me = await requireUser();
  return NextResponse.json({ token: await signSession(me.id), user: me });
});
