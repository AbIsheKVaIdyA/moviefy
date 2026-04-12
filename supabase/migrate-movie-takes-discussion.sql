-- Run after migrate-movie-user-takes.sql if that migration already ran without created_at / public reads.
-- Adds created_at, backfills, and allows signed-in users to read rows that include a written review (discussion feed).

alter table public.movie_user_takes
  add column if not exists created_at timestamptz;

update public.movie_user_takes
set created_at = coalesce(created_at, updated_at)
where created_at is null;

alter table public.movie_user_takes
  alter column created_at set default now();

alter table public.movie_user_takes
  alter column created_at set not null;

drop policy if exists "movie_takes_select_own" on public.movie_user_takes;
drop policy if exists "movie_takes_select_visible" on public.movie_user_takes;

create policy "movie_takes_select_visible" on public.movie_user_takes for select using (
  auth.uid() = user_id
  or (auth.uid() is not null and coalesce(trim(review), '') <> '')
);
