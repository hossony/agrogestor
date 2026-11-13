import 'server-only';
import webpush from 'web-push';
import { q } from './db';

let configured: boolean | null = null;
function ready() {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  configured = Boolean(pub && priv);
  if (configured) webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contato@agrogestor.app', pub!, priv!);
  return configured;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag?: string;
  inviteId?: string;
}

/** Navegadores (Web Push com VAPID). */
async function pushWeb(userId: string, payload: PushPayload) {
  if (!ready()) return;
  const subs = await q<{ endpoint: string; p256dh: string; auth: string }>('select endpoint, p256dh, auth from push_subscriptions where user_id = $1', [userId]);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60, urgency: payload.inviteId ? 'high' : 'normal' });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await q('delete from push_subscriptions where endpoint = $1', [s.endpoint]);
      }
    }),
  );
}

/**
 * App instalado no celular: serviço de push da Expo (gratuito). Convites usam a
 * categoria "convite", que mostra os botões Bora jogar! / Agora não.
 */
async function pushExpo(userId: string, payload: PushPayload) {
  const rows = await q<{ token: string }>('select token from expo_push_tokens where user_id = $1', [userId]);
  if (!rows.length) return;
  const messages = rows.map((r) => ({
    to: r.token,
    title: payload.title,
    body: payload.body,
    sound: 'default',
    priority: payload.inviteId ? 'high' : 'default',
    channelId: payload.inviteId ? 'convites' : 'comunidade',
    categoryId: payload.inviteId ? 'convite' : undefined,
    data: { url: payload.url, inviteId: payload.inviteId ?? null },
  }));
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify(messages),
    });
    const out = (await res.json().catch(() => null)) as { data?: { status: string; details?: { error?: string } }[] } | null;
    // Aparelho desinstalou o app ou trocou de token: apaga para não insistir.
    await Promise.all(
      (out?.data ?? []).map((t, i) => (t.status === 'error' && t.details?.error === 'DeviceNotRegistered' ? q('delete from expo_push_tokens where token = $1', [rows[i].token]) : null)),
    );
  } catch {
    // Sem rede até a Expo: o aviso continua aparecendo dentro do app.
  }
}

/** Envia para todos os aparelhos da pessoa (navegadores e app instalado). */
export async function pushTo(userId: string, payload: PushPayload) {
  await Promise.all([pushWeb(userId, payload).catch(() => {}), pushExpo(userId, payload).catch(() => {})]);
}
