-- Per-user titles marked from Release radar ("want to watch" / coming soon).
-- Run in Supabase SQL Editor after prior migrations.

create table if not exists public.user_release_watchlist (
  user_id uuid not null references auth.users (id) on delete cascade,
  tmdb_id integer not null,
  media_type text not null default 'movie' check (media_type in ('movie', 'tv')),
  release_date text not null,
  title text not null default '',
  poster_path text,
  created_at timestamptz not null default now(),
  primary key (user_id, tmdb_id, media_type)
);

create index if not exists user_release_watchlist_user_release_idx
  on public.user_release_watchlist (user_id, release_date);

alter table public.user_release_watchlist enable row level security;

drop policy if exists "release_watch_select_own" on public.user_release_watchlist;
create policy "release_watch_select_own" on public.user_release_watchlist
  for select using (auth.uid() = user_id);

drop policy if exists "release_watch_insert_own" on public.user_release_watchlist;
create policy "release_watch_insert_own" on public.user_release_watchlist
  for insert with check (auth.uid() = user_id);

drop policy if exists "release_watch_update_own" on public.user_release_watchlist;
create policy "release_watch_update_own" on public.user_release_watchlist
  for update using (auth.uid() = user_id);

drop policy if exists "release_watch_delete_own" on public.user_release_watchlist;
create policy "release_watch_delete_own" on public.user_release_watchlist
  for delete using (auth.uid() = user_id);
