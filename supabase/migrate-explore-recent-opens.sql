-- Run in Supabase SQL editor if the project already exists without this table.

create table if not exists public.explore_recent_opens (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id uuid not null references public.movies (id) on delete cascade,
  opened_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists explore_recent_opens_user_opened_idx
  on public.explore_recent_opens (user_id, opened_at desc);

alter table public.explore_recent_opens enable row level security;

drop policy if exists "explore_recent_select_own" on public.explore_recent_opens;
create policy "explore_recent_select_own" on public.explore_recent_opens for select using (auth.uid() = user_id);

drop policy if exists "explore_recent_insert_own" on public.explore_recent_opens;
create policy "explore_recent_insert_own" on public.explore_recent_opens for insert with check (auth.uid() = user_id);

drop policy if exists "explore_recent_update_own" on public.explore_recent_opens;
create policy "explore_recent_update_own" on public.explore_recent_opens for update using (auth.uid() = user_id);

drop policy if exists "explore_recent_delete_own" on public.explore_recent_opens;
create policy "explore_recent_delete_own" on public.explore_recent_opens for delete using (auth.uid() = user_id);
