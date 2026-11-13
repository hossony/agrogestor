/* Service worker do AgroGestor: notificações push (convites, amizades, comentários). */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: 'AgroGestor', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'AgroGestor';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || undefined,
    renotify: Boolean(data.inviteId),
    requireInteraction: Boolean(data.inviteId),
    vibrate: data.inviteId ? [120, 60, 120, 60, 240] : [80],
    data: { url: data.url || '/feed', inviteId: data.inviteId || null },
    actions: data.inviteId
      ? [
          { action: 'accept', title: 'Bora jogar!' },
          { action: 'decline', title: 'Agora não' },
        ]
      : [],
  };

  event.waitUntil(
    (async () => {
      // Com o site aberto e em foco, a própria tela mostra o aviso (sem duplicar).
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const focused = wins.find((w) => w.focused && w.visibilityState === 'visible');
      if (focused) {
        focused.postMessage({ type: 'push', payload: data });
        return;
      }
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  const { url, inviteId } = event.notification.data || {};
  event.notification.close();
  event.waitUntil(
    (async () => {
      if (inviteId && (event.action === 'accept' || event.action === 'decline')) {
        await fetch(`/api/invites/${inviteId}`, {
          method: 'PATCH',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: event.action }),
        }).catch(() => {});
        if (event.action === 'decline') return;
      }
      const target = new URL(url || '/feed', self.location.origin).href;
      const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const w of wins) {
        if (new URL(w.url).origin === self.location.origin) {
          await w.focus();
          if ('navigate' in w) await w.navigate(target).catch(() => {});
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
