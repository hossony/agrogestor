/** Formatos trocados entre o servidor e as telas. */

export interface UserLite {
  id: string;
  code: string;
  username: string;
  name: string;
  avatar_url: string | null;
  badges: string[];
  platform?: string | null;
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
  /** Quando vem da aba Republicados. */
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

export interface Notification {
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
