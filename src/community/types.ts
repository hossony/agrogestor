/**
 * Formatos da API da comunidade. Iguais aos de web/src/lib/types.ts
 * (o app e o site conversam com o mesmo servidor e o mesmo banco).
 */

export interface UserLite {
  id: string;
  code: string;
  username: string;
  name: string;
  avatar_url: string | null;
  badges: string[];
  platform?: string | null;
}

export interface Me extends UserLite {
  bio: string;
  banner_url: string | null;
  privacy: 'public' | 'friends' | 'private';
  links: Record<string, string>;
  platform: string | null;
}

export interface Changelog {
  latest: string;
  entries: { version: string; date: string; title: string; items: { where: 'site' | 'app' | 'ambos'; text: string }[] }[];
}

export interface Media {
  url: string;
  type: 'image' | 'video';
  w?: number;
  h?: number;
}

export interface Post {
  id: string;
  body: string;
  category: string;
  media: Media[];
  like_count: number;
  fire_count: number;
  comment_count: number;
  repost_count: number;
  created_at: string;
  edited_at: string | null;
  author: UserLite;
  liked: boolean;
  fired: boolean;
  reposted: boolean;
  mine: boolean;
  reposted_at?: string;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author: UserLite;
  mine: boolean;
}

export type Relation = 'self' | 'friend' | 'sent' | 'received' | 'none';

export interface Invite {
  id: string;
  game: string;
  server: string;
  password: string;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled';
  created_at: string;
  responded_at: string | null;
  from: UserLite;
  to: UserLite;
  incoming: boolean;
}

export interface Notif {
  id: string;
  type: string;
  text: string;
  post_id: string | null;
  invite_id: string | null;
  read: boolean;
  created_at: string;
  actor: UserLite | null;
  invite_status?: string | null;
}

export type Friend = UserLite & {
  bio: string;
  has_farm: boolean;
  farm_name: string | null;
  since: string;
  online?: boolean;
  last_seen_at?: string | null;
  summary?: { worth: number; currency: string; machines: number; area: number } | null;
};

export interface RankRow {
  id: string;
  code: string;
  name: string;
  avatar_url: string | null;
  badges: string[];
  platform: string | null;
  me: boolean;
  hidden: boolean;
  farmName: string | null;
  currency: string;
  worth: number;
  machines: number;
  area: number;
  animals: number;
}

/** Data e hora completas: "13 nov 2026, 14:32". */
export const fullDate = (iso: string) => {
  const d = new Date(iso);
  const M = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${String(d.getDate()).padStart(2, '0')} ${M[d.getMonth()]} ${d.getFullYear()}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

/** Separa o texto em pedaços normais e links (para deixar os links clicáveis). */
export function splitLinks(text: string): { text: string; url?: string }[] {
  const re = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]"'])/g;
  return text.split(re).map((p, i) => (i % 2 ? { text: p.replace(/^https?:\/\/(www\.)?/, ''), url: p } : { text: p })).filter((x) => x.text);
}

export const EMOJIS = ['🌾', '🚜', '🌱', '🌽', '🥔', '🌻', '🍇', '🐄', '🐖', '🐑', '🐔', '🐝', '🥛', '🧀', '🚛', '🏡', '💧', '☀️', '🌧️', '🔥', '❤️', '👍', '👏', '🙌', '💪', '😂', '😍', '😎', '🤩', '😮', '😅', '😢', '🤔', '🙏', '👀', '💯', '✅', '⭐', '🏆', '🎉', '💰', '📈', '🎮', '🕹️', '🖥️', '📸', '🎥', '🗺️', '🛠️', '🤝'];

export const CATEGORIES: { id: string; label: string; emoji: string }[] = [
  { id: 'geral', label: 'Geral', emoji: '🌾' },
  { id: 'colheita', label: 'Colheita', emoji: '🚜' },
  { id: 'plantio', label: 'Plantio', emoji: '🌱' },
  { id: 'maquinas', label: 'Máquinas', emoji: '🛠️' },
  { id: 'animais', label: 'Animais', emoji: '🐄' },
  { id: 'dicas', label: 'Dicas', emoji: '💡' },
  { id: 'mods', label: 'Mods e mapas', emoji: '🗺️' },
  { id: 'prints', label: 'Prints e vídeos', emoji: '📸' },
  { id: 'multiplayer', label: 'Multiplayer', emoji: '🎮' },
];
export const categoryOf = (id: string) => CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[0];

export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'agora';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
