import { NextResponse } from 'next/server';
import { body, HttpError, requireUser, route } from '@/lib/auth';
import { q } from '@/lib/db';

interface Sub {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
  /** App instalado: token do push da Expo (ExponentPushToken[...]). */
  expoToken?: string;
}

const EXPO = /^Expo(nent)?PushToken\[[\w-]+\]$/;

/** Guarda a inscrição de push deste aparelho (navegador ou app instalado). */
export const POST = route(async (req: Request) => {
  const me = await requireUser();
  const s = await body<Sub>(req);
  if (s.expoToken) {
    if (!EXPO.test(s.expoToken)) throw new HttpError(400, 'Token inválido.');
    await q('insert into expo_push_tokens (token, user_id) values ($1, $2) on conflict (token) do update set user_id = excluded.user_id', [s.expoToken, me.id]);
    return NextResponse.json({ ok: true });
  }
  if (!s.endpoint || !/^https:\/\//.test(s.endpoint) || !s.keys?.p256dh || !s.keys?.auth) throw new HttpError(400, 'Inscrição inválida.');
  await q(
    `insert into push_subscriptions (endpoint, user_id, p256dh, auth) values ($1, $2, $3, $4)
     on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth`,
    [s.endpoint.slice(0, 1000), me.id, s.keys.p256dh.slice(0, 200), s.keys.auth.slice(0, 100)],
  );
  return NextResponse.json({ ok: true });
});

export const DELETE = route(async (req: Request) => {
  const me = await requireUser();
  const s = await body<Sub>(req);
  if (s.expoToken) await q('delete from expo_push_tokens where token = $1 and user_id = $2', [s.expoToken, me.id]);
  else await q('delete from push_subscriptions where endpoint = $1 and user_id = $2', [s.endpoint ?? '', me.id]);
  return NextResponse.json({ ok: true });
});
