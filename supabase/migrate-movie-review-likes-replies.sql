-- Likes + threaded replies on written movie reviews (movie_user_takes rows with review text).
-- Run in Supabase SQL Editor after movie_user_takes exists.

create table if not exists public.movie_take_review_likes (
  movie_id uuid not null references public.movies (id) on delete cascade,
  review_author_id uuid not null references auth.users (id) on delete cascade,
  liked_by_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (movie_id, review_author_id, liked_by_user_id),
  constraint movie_take_review_likes_no_self check (review_author_id <> liked_by_user_id)
);

create index if not exists movie_take_review_likes_movie_idx
  on public.movie_take_review_likes (movie_id);

create index if not exists movie_take_review_likes_author_idx
  on public.movie_take_review_likes (movie_id, review_author_id);

create table if not exists public.movie_take_review_replies (
  id uuid primary key default gen_random_uuid(),
  movie_id uuid not null references public.movies (id) on delete cascade,
  review_author_id uuid not null references auth.users (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null
    check (char_length(body) <= 1000 and char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists movie_take_review_replies_thread_idx
  on public.movie_take_review_replies (movie_id, review_author_id, created_at);

alter table public.movie_take_review_likes enable row level security;
alter table public.movie_take_review_replies enable row level security;

drop policy if exists "movie_review_likes_select_auth" on public.movie_take_review_likes;
create policy "movie_review_likes_select_auth" on public.movie_take_review_likes
  for select using (auth.uid() is not null);

drop policy if exists "movie_review_likes_insert_own" on public.movie_take_review_likes;
create policy "movie_review_likes_insert_own" on public.movie_take_review_likes
  for insert with check (
    auth.uid() = liked_by_user_id
    and review_author_id <> liked_by_user_id
  );

drop policy if exists "movie_review_likes_delete_own" on public.movie_take_review_likes;
create policy "movie_review_likes_delete_own" on public.movie_take_review_likes
  for delete using (auth.uid() = liked_by_user_id);

drop policy if exists "movie_review_replies_select_auth" on public.movie_take_review_replies;
create policy "movie_review_replies_select_auth" on public.movie_take_review_replies
  for select using (auth.uid() is not null);

drop policy if exists "movie_review_replies_insert_own" on public.movie_take_review_replies;
create policy "movie_review_replies_insert_own" on public.movie_take_review_replies
  for insert with check (auth.uid() = user_id);

drop policy if exists "movie_review_replies_delete_own" on public.movie_take_review_replies;
create policy "movie_review_replies_delete_own" on public.movie_take_review_replies
  for delete using (auth.uid() = user_id);
