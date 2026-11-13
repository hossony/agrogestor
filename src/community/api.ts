import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Media } from './types';
import { normalizeUrl } from './url';

export { normalizeUrl };

/**
 * Cliente da API do AgroGestor Web. O app (Android, Windows e /gestao no site)
 * usa o mesmo servidor e o mesmo banco do site: postagens, amigos, convites e a
 * fazenda publicada ficam sincronizados entre todos os aparelhos.
 *
 * O app se autentica com "Authorization: Bearer <token>" (o site usa cookie).
 */

/** Endereço padrão do site: EXPO_PUBLIC_API_URL no build, ou extra.apiUrl no app.json. */
export function defaultApiUrl(): string {
  // Dentro do próprio site (/gestao) usa o mesmo endereço.
  if (Platform.OS === 'web' && typeof location !== 'undefined' && /^https?:$/.test(location.protocol) && location.pathname.startsWith('/gestao')) return location.origin;
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  const fromConfig = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return normalizeUrl(fromEnv || fromConfig || '');
}


export interface Conn {
  url: string;
  token: string;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function request<T = unknown>(conn: Pick<Conn, 'url'> & { token?: string }, path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(conn.url + path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: {
        accept: 'application/json',
        ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(conn.token ? { authorization: `Bearer ${conn.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit',
    });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Confira a internet e o endereço do site.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error || 'Não foi possível concluir. Tente de novo.');
  return data as T;
}

/** URL de mídia pronta para <Image>/<Video> (uploads locais vêm como caminho relativo). */
export const mediaUrl = (conn: Pick<Conn, 'url'>, u: string | null | undefined) => (u ? (u.startsWith('/') ? conn.url + u : u) : null);

/**
 * Envia imagem ou vídeo escolhido na galeria. Com o Vercel Blob configurado no
 * site, o arquivo vai direto para o Blob (o servidor só autoriza); sem ele
 * (desenvolvimento), vai para o próprio servidor.
 */
export async function uploadMedia(conn: Conn, asset: { uri: string; type: Media['type']; mimeType?: string | null; fileName?: string | null; file?: File; width?: number; height?: number }, onProgress?: (pct: number) => void): Promise<Media> {
  const cfg = await request<{ mode: 'blob' | 'local'; maxImage: number; maxVideo: number }>(conn, '/api/upload');
  const isVideo = asset.type === 'video';
  const mime = asset.mimeType || asset.file?.type || (isVideo ? 'video/mp4' : 'image/jpeg');
  const ext = (asset.fileName?.split('.').pop() || mime.split('/')[1] || (isVideo ? 'mp4' : 'jpg')).replace('quicktime', 'mov').replace('jpeg', 'jpg').toLowerCase();
  const meta = { type: asset.type, w: asset.width || undefined, h: asset.height || undefined };

  if (cfg.mode === 'local') {
    const fd = new FormData();
    if (asset.file) fd.append('file', asset.file);
    else fd.append('file', { uri: asset.uri, name: `arquivo.${ext}`, type: mime } as unknown as Blob);
    onProgress?.(40);
    const res = await fetch(conn.url + '/api/upload', { method: 'POST', body: fd, headers: { authorization: `Bearer ${conn.token}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error || 'Falha no envio.');
    onProgress?.(100);
    return { url: data.url, ...meta };
  }

  const blob: Blob = asset.file ?? (await (await fetch(asset.uri)).blob());
  if (blob.size > (isVideo ? cfg.maxVideo : cfg.maxImage)) {
    throw new ApiError(413, isVideo ? `Vídeo grande demais (máx. ${Math.round(cfg.maxVideo / 1048576)} MB). Corte ou grave em resolução menor.` : `Imagem grande demais (máx. ${Math.round(cfg.maxImage / 1048576)} MB).`);
  }
  // 1) O servidor confere a conta e devolve um token de envio temporário (só para este arquivo).
  const pathname = `${isVideo ? 'videos' : 'imagens'}/${Date.now()}.${ext}`;
  const { clientToken } = await request<{ clientToken: string }>(conn, '/api/upload', { body: { type: 'blob.generate-client-token', payload: { pathname, clientPayload: null, multipart: false } } });
  // 2) O arquivo vai direto para o Vercel Blob (sem passar pelo servidor, então vídeos grandes funcionam).
  const out = await putToBlob(pathname, blob, mime, clientToken, onProgress);
  return { url: out.url, ...meta };
}

/**
 * Envio direto para o Vercel Blob, no mesmo formato da biblioteca oficial
 * (@vercel/blob/client), que não roda no Android por depender de módulos do Node.
 * Usa XMLHttpRequest para ter a barra de progresso.
 */
function putToBlob(pathname: string, body: Blob, contentType: string, clientToken: string, onProgress?: (pct: number) => void): Promise<{ url: string }> {
  const storeId = clientToken.split('_')[3] ?? '';
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', `https://vercel.com/api/blob/?pathname=${encodeURIComponent(pathname)}`);
    xhr.setRequestHeader('authorization', `Bearer ${clientToken}`);
    xhr.setRequestHeader('x-api-version', '13');
    xhr.setRequestHeader('x-vercel-blob-store-id', storeId);
    xhr.setRequestHeader('x-vercel-blob-access', 'public');
    xhr.setRequestHeader('x-content-type', contentType);
    xhr.setRequestHeader('x-api-blob-request-id', `${storeId}:${Date.now()}:${Math.random().toString(16).slice(2)}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.url) resolve(res);
        else reject(new ApiError(xhr.status, res?.error?.message || 'O envio do arquivo falhou.'));
      } catch {
        reject(new ApiError(xhr.status, 'O envio do arquivo falhou.'));
      }
    };
    xhr.onerror = () => reject(new ApiError(0, 'Sem conexão para enviar o arquivo.'));
    xhr.send(body);
  });
}
