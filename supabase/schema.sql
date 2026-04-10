-- Moviefy — run this in Supabase SQL Editor (Dashboard → SQL → New query).
-- After: Authentication → Providers → enable "Anonymous" sign-ins.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  handle text unique,
  updated_at timestamptz default now()
);

create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  tmdb_id integer unique,
  title text not null,
  year integer not null default 0,
  genre text not null default 'Drama',
  director text not null default '—',
  poster_path text,
  poster_class text not null default 'from-zinc-700 to-zinc-900',
  created_at timestamptz default now(),
  constraint movies_genre_check check (
    genre in (
      'Sci-Fi', 'Drama', 'Thriller', 'Comedy', 'Horror',
      'Animation', 'Action', 'Romance'
    )
  )
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  is_public boolean not null default false,
  kind text not null default 'collection',
  follower_count integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint playlists_kind_check check (kind in ('collection', 'watched'))
);

create table if not exists public.playlist_items (
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  movie_id uuid not null references public.movies (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (playlist_id, movie_id)
);

create table if not exists public.saved_movies (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id uuid not null references public.movies (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, movie_id)
);

create table if not exists public.playlist_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, playlist_id)
);

create index if not exists playlists_user_id_idx on public.playlists (user_id);
create index if not exists playlists_public_idx on public.playlists (is_public) where is_public = true;
create index if not exists playlist_items_playlist_idx on public.playlist_items (playlist_id);
create index if not exists saved_movies_user_idx on public.saved_movies (user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists playlists_set_updated_at on public.playlists;
create trigger playlists_set_updated_at
  before update on public.playlists
  for each row execute function public.set_updated_at();

create or replace function public.playlist_follows_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.playlists set follower_count = follower_count + 1 where id = new.playlist_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.playlists set follower_count = greatest(0, follower_count - 1) where id = old.playlist_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists playlist_follows_after_insert on public.playlist_follows;
drop trigger if exists playlist_follows_after_delete on public.playlist_follows;
drop trigger if exists playlist_follows_after_change on public.playlist_follows;
create trigger playlist_follows_after_change
  after insert or delete on public.playlist_follows
  for each row execute function public.playlist_follows_after_change();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Movie fan'),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.movies enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_items enable row level security;
alter table public.saved_movies enable row level security;
alter table public.playlist_follows enable row level security;

-- Profiles: readable for explore; users manage their own row
drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles for select using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Movies: any signed-in user can read; insert/update for catalog growth
drop policy if exists "movies_select_authed" on public.movies;
create policy "movies_select_authed" on public.movies for select to authenticated using (true);

drop policy if exists "movies_insert_authed" on public.movies;
create policy "movies_insert_authed" on public.movies for insert to authenticated with check (true);

drop policy if exists "movies_update_authed" on public.movies;
create policy "movies_update_authed" on public.movies for update to authenticated using (true);

-- Playlists
drop policy if exists "playlists_select_visible" on public.playlists;
create policy "playlists_select_visible" on public.playlists for select using (
  is_public = true or auth.uid() = user_id
);

drop policy if exists "playlists_insert_own" on public.playlists;
create policy "playlists_insert_own" on public.playlists for insert with check (auth.uid() = user_id);

drop policy if exists "playlists_update_own" on public.playlists;
create policy "playlists_update_own" on public.playlists for update using (auth.uid() = user_id);

drop policy if exists "playlists_delete_own" on public.playlists;
create policy "playlists_delete_own" on public.playlists for delete using (auth.uid() = user_id);

-- Playlist items: visible if parent playlist is visible; mutate if owner
drop policy if exists "playlist_items_select" on public.playlist_items;
create policy "playlist_items_select" on public.playlist_items for select using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id
      and (p.is_public or p.user_id = auth.uid())
  )
);

drop policy if exists "playlist_items_insert" on public.playlist_items;
create policy "playlist_items_insert" on public.playlist_items for insert with check (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "playlist_items_update" on public.playlist_items;
create policy "playlist_items_update" on public.playlist_items for update using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = auth.uid()
  )
);

drop policy if exists "playlist_items_delete" on public.playlist_items;
create policy "playlist_items_delete" on public.playlist_items for delete using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = auth.uid()
  )
);

-- Saved movies
drop policy if exists "saved_select_own" on public.saved_movies;
create policy "saved_select_own" on public.saved_movies for select using (auth.uid() = user_id);

drop policy if exists "saved_insert_own" on public.saved_movies;
create policy "saved_insert_own" on public.saved_movies for insert with check (auth.uid() = user_id);

drop policy if exists "saved_delete_own" on public.saved_movies;
create policy "saved_delete_own" on public.saved_movies for delete using (auth.uid() = user_id);

-- Follows (only see your own follows; public follower counts live on playlists.follower_count)
drop policy if exists "follows_select_own" on public.playlist_follows;
create policy "follows_select_own" on public.playlist_follows for select using (auth.uid() = user_id);

drop policy if exists "follows_insert_own" on public.playlist_follows;
create policy "follows_insert_own" on public.playlist_follows for insert with check (auth.uid() = user_id);

drop policy if exists "follows_delete_own" on public.playlist_follows;
create policy "follows_delete_own" on public.playlist_follows for delete using (auth.uid() = user_id);
