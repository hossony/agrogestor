'use client';

import useSWR from 'swr';
import type { Me } from './auth';
import type { Media } from './types';

export async function api<T = unknown>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: opts.body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/api/auth')) window.location.href = '/entrar';
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Não foi possível concluir. Tente de novo.');
  return data as T;
}

export const fetcher = <T,>(url: string) => api<T>(url);

export function useMe() {
  return useSWR<Me>('/api/me', fetcher, { revalidateOnFocus: false });
}

/* ---------- Datas e números ---------- */

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: d > 300 ? 'numeric' : undefined });
}

export const num = (v: number, dec = 0) => v.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
export const money = (v: number, cur = '$') => `${v < 0 ? '-' : ''}${cur} ${num(Math.abs(v))}`;
export function compact(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `${num(v / 1e6, 1)} mi`;
  if (a >= 1e4) return `${num(v / 1e3, 0)} mil`;
  return num(v);
}

/* ---------- Envio de imagens e vídeos ---------- */

/** Reduz imagens grandes para até 2048 px antes de enviar (economiza espaço no Blob). */
async function shrinkImage(file: File, max = 2048): Promise<{ file: File; w: number; h: number }> {
  if (file.type === 'image/gif') return { file, w: 0, h: 0 };
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return { file, w: 0, h: 0 };
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  if (scale === 1 && file.size < 2.5 * 1024 * 1024) return { file, w, h };
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.88));
  if (!blob) return { file, w, h };
  return { file: new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' }), w, h };
}

function videoSize(file: File): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => {
      resolve({ w: v.videoWidth, h: v.videoHeight });
      URL.revokeObjectURL(v.src);
    };
    v.onerror = () => resolve({ w: 0, h: 0 });
    v.src = URL.createObjectURL(file);
  });
}

let modeCache: Promise<{ mode: 'blob' | 'local'; maxImage: number; maxVideo: number }> | null = null;

export async function uploadMedia(input: File, onProgress?: (pct: number) => void): Promise<Media> {
  const isVideo = input.type.startsWith('video/');
  if (!isVideo && !input.type.startsWith('image/')) throw new Error('Escolha uma imagem ou um vídeo.');
  modeCache ??= api('/api/upload');
  const cfg = await modeCache;
  const prepared = isVideo ? { file: input, ...(await videoSize(input)) } : await shrinkImage(input);
  if (prepared.file.size > (isVideo ? cfg.maxVideo : cfg.maxImage)) {
    throw new Error(isVideo ? `Vídeo grande demais (máx. ${Math.round(cfg.maxVideo / 1048576)} MB). Corte ou comprima antes.` : `Imagem grande demais (máx. ${Math.round(cfg.maxImage / 1048576)} MB).`);
  }
  const meta = { type: (isVideo ? 'video' : 'image') as Media['type'], w: prepared.w || undefined, h: prepared.h || undefined };

  if (cfg.mode === 'local') {
    const fd = new FormData();
    fd.append('file', prepared.file);
    onProgress?.(50);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Falha no envio.');
    onProgress?.(100);
    return { url: data.url, ...meta };
  }

  const { upload } = await import('@vercel/blob/client');
  const ext = prepared.file.name.split('.').pop() || (isVideo ? 'mp4' : 'webp');
  const blob = await upload(`${isVideo ? 'videos' : 'imagens'}/${Date.now()}.${ext}`, prepared.file, {
    access: 'public',
    handleUploadUrl: '/api/upload',
    contentType: prepared.file.type,
    multipart: prepared.file.size > 8 * 1024 * 1024,
    onUploadProgress: (e) => onProgress?.(e.percentage),
  });
  return { url: blob.url, ...meta };
}
