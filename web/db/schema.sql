-- AgroGestor Web: esquema do banco. Idempotente (pode rodar várias vezes).

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  username text not null unique,
  name text not null,
  password_hash text not null,
  bio text not null default '',
  avatar_url text,
  banner_url text,
  farm jsonb,
  farm_updated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists friendships (
  requester_id uuid not null references users(id) on delete cascade,
  addressee_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
create index if not exists friendships_addressee on friendships (addressee_id, status);

create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references users(id) on delete cascade,
  body text not null default '',
  category text not null default 'geral',
  media jsonb not null default '[]',
  like_count int not null default 0,
  fire_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists posts_created on posts (created_at desc);
create index if not exists posts_author on posts (author_id, created_at desc);

create table if not exists post_reactions (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('like', 'fire')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, kind)
);

create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references users(id) on delete cascade,
  parent_id uuid references comments(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists comments_post on comments (post_id, created_at);

create table if not exists invites (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references users(id) on delete cascade,
  to_id uuid not null references users(id) on delete cascade,
  game text not null default 'Farming Simulator 25',
  server text not null default '',
  password text not null default '',
  message text not null default '',
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'canceled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create index if not exists invites_to on invites (to_id, created_at desc);

create table if not exists notifications (
  id bigserial primary key,
  user_id uuid not null references users(id) on delete cascade,
  actor_id uuid references users(id) on delete cascade,
  type text not null,
  post_id uuid references posts(id) on delete cascade,
  invite_id uuid references invites(id) on delete cascade,
  text text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user on notifications (user_id, id desc);

create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_user on push_subscriptions (user_id);

-- Aparelhos com o app instalado (Android/iOS): token do serviço de push da Expo.
create table if not exists expo_push_tokens (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists expo_push_user on expo_push_tokens (user_id);

-- Perfil: privacidade da fazenda, selos, links sociais e seguidores.
alter table users add column if not exists privacy text not null default 'friends';
alter table users add column if not exists badges text[] not null default '{}';
alter table users add column if not exists links jsonb not null default '{}';
alter table users add column if not exists follower_count int not null default 0;

create table if not exists follows (
  follower_id uuid not null references users(id) on delete cascade,
  followed_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, followed_id),
  check (follower_id <> followed_id)
);
create index if not exists follows_followed on follows (followed_id);

-- Selo verde: os 100 primeiros fazendeiros da plataforma (idempotente).
update users set badges = array_append(badges, 'pioneer')
  where id in (select id from users order by created_at asc limit 100) and not ('pioneer' = any(badges));
