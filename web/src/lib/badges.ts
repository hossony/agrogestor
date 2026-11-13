/**
 * Selos do perfil. O mesmo arquivo existe no app (src/community/badges.ts).
 * - pioneer: dado sozinho aos 100 primeiros cadastros.
 * - owner: só a conta do dono (OWNER_USERNAME no servidor).
 * - os demais: o dono concede pelo perfil da pessoa.
 */
export type BadgeId = 'pioneer' | 'creator' | 'streamer' | 'veteran' | 'verified' | 'owner';

export interface BadgeDef {
  id: BadgeId;
  label: string;
  short: string;
  color: string;
  ink: string;
  desc: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'owner', label: 'Dono', short: 'Dono', color: '#111318', ink: '#ffffff', desc: 'Desenvolvedor do AgroGestor.' },
  { id: 'verified', label: 'Verificado', short: 'Verificado', color: '#2B78B8', ink: '#ffffff', desc: 'Conta confirmada pela equipe.' },
  { id: 'creator', label: 'Criador de conteúdo', short: 'Criador', color: '#D93025', ink: '#ffffff', desc: 'Produz vídeos, guias ou conteúdo sobre o jogo.' },
  { id: 'streamer', label: 'Streamer da comunidade', short: 'Streamer', color: '#7B3FE4', ink: '#ffffff', desc: 'Faz lives para a comunidade.' },
  { id: 'veteran', label: 'Jogador veterano', short: 'Veterano', color: '#E9A800', ink: '#2a1f00', desc: 'Muitas horas de estrada no Farming Simulator.' },
  { id: 'pioneer', label: 'Primeiros fazendeiros', short: 'Pioneiro', color: '#1E9E55', ink: '#ffffff', desc: 'Um dos 100 primeiros a se cadastrar na plataforma.' },
];

export const badgeById = (id: string) => BADGES.find((b) => b.id === id);
export const ALL_BADGE_IDS = BADGES.map((b) => b.id);

/** Ordena os selos do usuário na ordem de importância acima. */
export const sortBadges = (ids: string[] | null | undefined): BadgeDef[] => BADGES.filter((b) => ids?.includes(b.id));

/** Quem pode mostrar links sociais no perfil. */
export const canHaveLinks = (ids: string[] | null | undefined) => Boolean(ids?.some((b) => b === 'creator' || b === 'streamer' || b === 'owner'));

/** Redes aceitas nos links do perfil. */
export const LINK_SITES: { id: string; label: string; emoji: string; prefix: string }[] = [
  { id: 'youtube', label: 'YouTube', emoji: '▶️', prefix: 'https://youtube.com/' },
  { id: 'twitch', label: 'Twitch', emoji: '🟣', prefix: 'https://twitch.tv/' },
  { id: 'kick', label: 'Kick', emoji: '🟢', prefix: 'https://kick.com/' },
  { id: 'instagram', label: 'Instagram', emoji: '📸', prefix: 'https://instagram.com/' },
  { id: 'tiktok', label: 'TikTok', emoji: '🎵', prefix: 'https://tiktok.com/@' },
  { id: 'discord', label: 'Discord', emoji: '💬', prefix: 'https://discord.gg/' },
  { id: 'site', label: 'Site', emoji: '🌐', prefix: 'https://' },
];

export type Links = Partial<Record<string, string>>;

/** Aceita "@canal", "canal" ou a URL completa e devolve sempre uma URL https. */
export function normalizeLink(siteId: string, value: string): string {
  const site = LINK_SITES.find((s) => s.id === siteId);
  const v = value.trim().replace(/\s+/g, '');
  if (!site || !v) return '';
  if (/^https?:\/\//i.test(v)) return v.replace(/^http:/i, 'https:').slice(0, 200);
  const handle = v.replace(/^@/, '');
  if (siteId === 'youtube' && !handle.includes('/')) return `${site.prefix}@${handle}`.slice(0, 200);
  return `${site.prefix}${handle}`.slice(0, 200);
}

export function sanitizeLinks(raw: unknown): Links {
  const out: Links = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const s of LINK_SITES) {
    const v = (raw as Record<string, unknown>)[s.id];
    if (typeof v === 'string' && v.trim()) {
      const url = normalizeLink(s.id, v);
      if (/^https:\/\/[\w.-]+\.[a-z]{2,}/i.test(url)) out[s.id] = url;
    }
  }
  return out;
}

export type Privacy = 'public' | 'friends' | 'private';
export const PRIVACY: { id: Privacy; label: string; desc: string }[] = [
  { id: 'public', label: 'Público', desc: 'Qualquer pessoa vê a sua fazenda e o seu patrimônio.' },
  { id: 'friends', label: 'Só amigos', desc: 'Só os amigos aceitos veem a fazenda e o patrimônio.' },
  { id: 'private', label: 'Privado', desc: 'Ninguém vê a sua fazenda nem o patrimônio, só você.' },
];
