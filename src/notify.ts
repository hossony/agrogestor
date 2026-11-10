import { Platform } from 'react-native';

/**
 * Notificações do sistema (fora do app): barra do Android e central do Windows.
 * O módulo nativo só é carregado quando o usuário liga a opção em Ajustes.
 */

let native: any = null;
function loadNative() {
  if (native) return native;
  native = require('expo-notifications');
  native.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  return native;
}

/** Pede permissão. Devolve true se o sistema liberou. */
export async function enableSystemNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      const N = (globalThis as any).Notification;
      if (!N) return false;
      return (N.permission === 'granted' ? 'granted' : await N.requestPermission()) === 'granted';
    }
    const n = loadNative();
    if (Platform.OS === 'android') await n.setNotificationChannelAsync('avisos', { name: 'Avisos da fazenda', importance: n.AndroidImportance.DEFAULT });
    const res = await n.requestPermissionsAsync();
    return !!res.granted;
  } catch {
    return false;
  }
}

export async function systemNotify(title: string, body: string) {
  try {
    if (Platform.OS === 'web') {
      const N = (globalThis as any).Notification;
      if (N && N.permission === 'granted') new N(title, { body });
      return;
    }
    await loadNative().scheduleNotificationAsync({ content: { title, body }, trigger: Platform.OS === 'android' ? { channelId: 'avisos' } : null });
  } catch {
    // Sem permissão ou sem suporte: o aviso continua aparecendo dentro do app.
  }
}
