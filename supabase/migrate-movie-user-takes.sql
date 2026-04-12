-- Run in Supabase SQL Editor if you already applied an older schema.sql
-- (adds tiered "take" + optional review + community meter RPC).

create table if not exists public.movie_user_takes (
  user_id uuid not null references auth.users (id) on delete cascade,
  movie_id uuid not null references public.movies (id) on delete cascade,
  tier text not null check (tier in ('skip', 'okay', 'recommend', 'love')),
  review text not null default '' check (char_length(review) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, movie_id)
);

create index if not exists movie_user_takes_movie_idx on public.movie_user_takes (movie_id);

drop trigger if exists movie_user_takes_set_updated_at on public.movie_user_takes;
create trigger movie_user_takes_set_updated_at
  before update on public.movie_user_takes
  for each row execute function public.set_updated_at();

create or replace function public.get_movie_take_meter_by_tmdb(p_tmdb_id integer)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_build_object(
        'skip', count(*) filter (where t.tier = 'skip'),
        'okay', count(*) filter (where t.tier = 'okay'),
        'recommend', count(*) filter (where t.tier = 'recommend'),
        'love', count(*) filter (where t.tier = 'love')
      )
      from public.movie_user_takes t
      inner join public.movies m on m.id = t.movie_id
      where m.tmdb_id = p_tmdb_id
    ),
    '{"skip":0,"okay":0,"recommend":0,"love":0}'::jsonb
  );
$$;

revoke all on function public.get_movie_take_meter_by_tmdb(integer) from public;
grant execute on function public.get_movie_take_meter_by_tmdb(integer) to authenticated;

alter table public.movie_user_takes enable row level security;

drop policy if exists "movie_takes_select_own" on public.movie_user_takes;
drop policy if exists "movie_takes_select_visible" on public.movie_user_takes;
create policy "movie_takes_select_visible" on public.movie_user_takes for select using (
  auth.uid() = user_id
  or (auth.uid() is not null and coalesce(trim(review), '') <> '')
);

drop policy if exists "movie_takes_insert_own" on public.movie_user_takes;
create policy "movie_takes_insert_own" on public.movie_user_takes for insert with check (auth.uid() = user_id);

drop policy if exists "movie_takes_update_own" on public.movie_user_takes;
create policy "movie_takes_update_own" on public.movie_user_takes for update using (auth.uid() = user_id);

drop policy if exists "movie_takes_delete_own" on public.movie_user_takes;
create policy "movie_takes_delete_own" on public.movie_user_takes for delete using (auth.uid() = user_id);
