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

-- 2.4: plataforma, presença, banimento, edição e repost.
alter table users add column if not exists platform text;
alter table users add column if not exists last_seen_at timestamptz;
alter table users add column if not exists banned_at timestamptz;
alter table posts add column if not exists edited_at timestamptz;
alter table posts add column if not exists repost_count int not null default 0;

create table if not exists reposts (
  user_id uuid not null references users(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists reposts_user on reposts (user_id, created_at desc);

-- Catálogo de máquinas do FS25 (editado pelo dono; imagens enviadas pelo painel).
create table if not exists machine_catalog (
  id uuid primary key default gen_random_uuid(),
  brand text not null,
  model text not null,
  category text not null,
  price int,
  hp_min int,
  hp_max int,
  speed int,
  width numeric,
  capacity int,
  weight int,
  upkeep int,
  image_url text,
  notes text not null default '',
  verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists machine_catalog_name on machine_catalog (lower(brand), lower(model));

-- Catálogo inicial. Valores de guias da comunidade (nov/2024); "verified = false" = conferir no jogo.
insert into machine_catalog (brand, model, category, price, hp_min, hp_max, speed, notes) values
  ('Landini', 'REX 4 GT', 'Trator', 39500, 70, 112, 40, 'Trator pequeno, bom para pomares e vinhedos.'),
  ('Challenger', 'MT600 Series', 'Trator', 58500, 160, 225, 40, ''),
  ('Valtra', 'T Series', 'Trator', 168000, 210, 271, 50, ''),
  ('Valtra', 'S Series', 'Trator', 254500, 280, 420, 50, ''),
  ('John Deere', '6R Series (230-250)', 'Trator', 268000, 281, 301, 50, ''),
  ('Deutz-Fahr', 'Series 8 TTV', 'Trator', 267000, 287, 287, 60, ''),
  ('Fendt', '1000 Vario', 'Trator', null, null, null, 60, ''),
  ('Fendt', '900 Vario', 'Trator', null, null, null, 60, ''),
  ('Fendt', '700 Vario', 'Trator', null, null, null, 50, ''),
  ('Massey Ferguson', '8S Series', 'Trator', null, null, null, 50, ''),
  ('New Holland', 'T7 HD', 'Trator', null, null, null, 50, ''),
  ('Case IH', 'Magnum', 'Trator', null, null, null, 50, ''),
  ('Claas', 'Xerion', 'Trator', null, null, null, 50, ''),
  ('John Deere', '8R Series', 'Trator', null, null, null, 50, ''),
  ('Kubota', 'M7 Series', 'Trator', null, null, null, 50, ''),
  ('Claas', 'Lexion 8000', 'Colheitadeira', null, null, null, 40, ''),
  ('John Deere', 'X9', 'Colheitadeira', null, null, null, 40, ''),
  ('New Holland', 'CR11', 'Colheitadeira', null, null, null, 40, ''),
  ('Fendt', 'IDEAL', 'Colheitadeira', null, null, null, 40, '')
on conflict do nothing;
