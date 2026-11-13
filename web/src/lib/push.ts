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

/** Envia para todos os aparelhos da pessoa; remove inscrições que expiraram. */
export async function pushTo(userId: string, payload: PushPayload) {
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
