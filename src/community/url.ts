/** Aceita "agrogestor.vercel.app", "https://.../", etc. (sem dependências: testável em Node). */
export function normalizeUrl(input: string): string {
  let u = input.trim().replace(/\/+$/, '');
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = (/^(localhost|127\.|10\.|192\.168\.)/.test(u) ? 'http://' : 'https://') + u;
  return u;
}
