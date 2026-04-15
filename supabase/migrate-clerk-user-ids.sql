-- Clerk user ids are strings (e.g. user_abc), not UUIDs.
-- Run this once in Supabase SQL Editor to align schema + RLS with Clerk auth.
--
-- Prerequisites:
-- - Backup your database before running.
-- - Ensure all app services are deployed with Clerk-aware auth handling.
--
-- Notes:
-- - This migration is intended as a one-time UUID->text identity switch.
-- - It wraps changes in a single transaction (`begin`/`commit`).
-- - If it fails, no partial changes should be committed.
--
-- Rollback:
-- - Restore from backup. Reverse-casting text user ids to uuid is not generally safe.

begin;

-- 0) Drop policies that depend on uuid identity columns before type changes.
drop policy if exists "profiles_select_all" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "playlists_select_visible" on public.playlists;
drop policy if exists "playlists_insert_own" on public.playlists;
drop policy if exists "playlists_update_own" on public.playlists;
drop policy if exists "playlists_delete_own" on public.playlists;
drop policy if exists "playlist_items_select" on public.playlist_items;
drop policy if exists "playlist_items_insert" on public.playlist_items;
drop policy if exists "playlist_items_update" on public.playlist_items;
drop policy if exists "playlist_items_delete" on public.playlist_items;
drop policy if exists "saved_select_own" on public.saved_movies;
drop policy if exists "saved_insert_own" on public.saved_movies;
drop policy if exists "saved_delete_own" on public.saved_movies;
drop policy if exists "release_watch_select_own" on public.user_release_watchlist;
drop policy if exists "release_watch_insert_own" on public.user_release_watchlist;
drop policy if exists "release_watch_update_own" on public.user_release_watchlist;
drop policy if exists "release_watch_delete_own" on public.user_release_watchlist;
drop policy if exists "explore_recent_select_own" on public.explore_recent_opens;
drop policy if exists "explore_recent_insert_own" on public.explore_recent_opens;
drop policy if exists "explore_recent_update_own" on public.explore_recent_opens;
drop policy if exists "explore_recent_delete_own" on public.explore_recent_opens;
drop policy if exists "follows_select_own" on public.playlist_follows;
drop policy if exists "follows_insert_own" on public.playlist_follows;
drop policy if exists "follows_delete_own" on public.playlist_follows;
drop policy if exists "likes_select_own" on public.playlist_likes;
drop policy if exists "likes_insert_own" on public.playlist_likes;
drop policy if exists "likes_delete_own" on public.playlist_likes;
drop policy if exists "movie_takes_select_own" on public.movie_user_takes;
drop policy if exists "movie_takes_select_visible" on public.movie_user_takes;
drop policy if exists "movie_takes_insert_own" on public.movie_user_takes;
drop policy if exists "movie_takes_update_own" on public.movie_user_takes;
drop policy if exists "movie_takes_delete_own" on public.movie_user_takes;
drop policy if exists "movie_review_likes_select_auth" on public.movie_take_review_likes;
drop policy if exists "movie_review_likes_insert_own" on public.movie_take_review_likes;
drop policy if exists "movie_review_likes_delete_own" on public.movie_take_review_likes;
drop policy if exists "movie_review_replies_select_auth" on public.movie_take_review_replies;
drop policy if exists "movie_review_replies_insert_own" on public.movie_take_review_replies;
drop policy if exists "movie_review_replies_update_own" on public.movie_take_review_replies;
drop policy if exists "movie_review_replies_delete_own" on public.movie_take_review_replies;

-- 1) Drop FKs to auth.users (uuid-only) on user identity columns.
alter table if exists public.explore_recent_opens drop constraint if exists explore_recent_opens_user_id_fkey;
alter table if exists public.movie_take_review_likes drop constraint if exists movie_take_review_likes_review_author_id_fkey;
alter table if exists public.movie_take_review_likes drop constraint if exists movie_take_review_likes_liked_by_user_id_fkey;
alter table if exists public.movie_take_review_likes drop constraint if exists movie_take_review_likes_no_self;
alter table if exists public.movie_take_review_replies drop constraint if exists movie_take_review_replies_review_author_id_fkey;
alter table if exists public.movie_take_review_replies drop constraint if exists movie_take_review_replies_user_id_fkey;
alter table if exists public.movie_user_takes drop constraint if exists movie_user_takes_user_id_fkey;
alter table if exists public.playlist_follows drop constraint if exists playlist_follows_user_id_fkey;
alter table if exists public.playlist_likes drop constraint if exists playlist_likes_user_id_fkey;
alter table if exists public.playlists drop constraint if exists playlists_user_id_fkey;
alter table if exists public.profiles drop constraint if exists profiles_id_fkey;
alter table if exists public.saved_movies drop constraint if exists saved_movies_user_id_fkey;
alter table if exists public.user_release_watchlist drop constraint if exists user_release_watchlist_user_id_fkey;

-- 2) Convert identity columns from uuid -> text.
alter table public.profiles alter column id type text using id::text;
alter table public.playlists alter column user_id type text using user_id::text;
alter table public.saved_movies alter column user_id type text using user_id::text;
alter table public.playlist_follows alter column user_id type text using user_id::text;
alter table public.playlist_likes alter column user_id type text using user_id::text;
alter table public.user_release_watchlist alter column user_id type text using user_id::text;
alter table public.explore_recent_opens alter column user_id type text using user_id::text;
alter table public.movie_user_takes alter column user_id type text using user_id::text;
alter table public.movie_take_review_likes alter column review_author_id type text using review_author_id::text;
alter table public.movie_take_review_likes alter column liked_by_user_id type text using liked_by_user_id::text;
alter table public.movie_take_review_replies alter column review_author_id type text using review_author_id::text;
alter table public.movie_take_review_replies alter column user_id type text using user_id::text;

-- 3) Recreate RLS policies to compare Clerk subject text.
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check ((auth.jwt()->>'sub') = id);
create policy "profiles_update_own" on public.profiles for update using ((auth.jwt()->>'sub') = id);

create policy "playlists_select_visible" on public.playlists for select using (
  is_public = true or (auth.jwt()->>'sub') = user_id
);
create policy "playlist_items_select" on public.playlist_items for select using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id
      and (p.is_public or p.user_id = (auth.jwt()->>'sub'))
  )
);
create policy "playlist_items_insert" on public.playlist_items for insert with check (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = (auth.jwt()->>'sub')
  )
);
create policy "playlist_items_update" on public.playlist_items for update using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = (auth.jwt()->>'sub')
  )
);
create policy "playlist_items_delete" on public.playlist_items for delete using (
  exists (
    select 1 from public.playlists p
    where p.id = playlist_items.playlist_id and p.user_id = (auth.jwt()->>'sub')
  )
);
create policy "saved_select_own" on public.saved_movies for select using ((auth.jwt()->>'sub') = user_id);
create policy "saved_insert_own" on public.saved_movies for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "saved_delete_own" on public.saved_movies for delete using ((auth.jwt()->>'sub') = user_id);

create policy "playlists_insert_own" on public.playlists for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "playlists_update_own" on public.playlists for update using ((auth.jwt()->>'sub') = user_id);
create policy "playlists_delete_own" on public.playlists for delete using ((auth.jwt()->>'sub') = user_id);

create policy "follows_select_own" on public.playlist_follows for select using ((auth.jwt()->>'sub') = user_id);
create policy "follows_insert_own" on public.playlist_follows for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "follows_delete_own" on public.playlist_follows for delete using ((auth.jwt()->>'sub') = user_id);

create policy "likes_select_own" on public.playlist_likes for select using ((auth.jwt()->>'sub') = user_id);
create policy "likes_insert_own" on public.playlist_likes for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "likes_delete_own" on public.playlist_likes for delete using ((auth.jwt()->>'sub') = user_id);

create policy "release_watch_select_own" on public.user_release_watchlist for select using ((auth.jwt()->>'sub') = user_id);
create policy "release_watch_insert_own" on public.user_release_watchlist for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "release_watch_update_own" on public.user_release_watchlist for update using ((auth.jwt()->>'sub') = user_id);
create policy "release_watch_delete_own" on public.user_release_watchlist for delete using ((auth.jwt()->>'sub') = user_id);

create policy "explore_recent_select_own" on public.explore_recent_opens for select using ((auth.jwt()->>'sub') = user_id);
create policy "explore_recent_insert_own" on public.explore_recent_opens for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "explore_recent_update_own" on public.explore_recent_opens for update using ((auth.jwt()->>'sub') = user_id);
create policy "explore_recent_delete_own" on public.explore_recent_opens for delete using ((auth.jwt()->>'sub') = user_id);

create policy "movie_takes_select_visible" on public.movie_user_takes for select using (
  char_length(trim(coalesce(review, ''))) > 0 or (auth.jwt()->>'sub') = user_id
);
create policy "movie_takes_insert_own" on public.movie_user_takes for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "movie_takes_update_own" on public.movie_user_takes for update using ((auth.jwt()->>'sub') = user_id);
create policy "movie_takes_delete_own" on public.movie_user_takes for delete using ((auth.jwt()->>'sub') = user_id);

create policy "movie_review_likes_select_auth" on public.movie_take_review_likes for select using ((auth.jwt()->>'sub') is not null);
alter table public.movie_take_review_likes
  add constraint movie_take_review_likes_no_self
  check (review_author_id <> liked_by_user_id);
create policy "movie_review_likes_insert_own" on public.movie_take_review_likes for insert with check ((auth.jwt()->>'sub') = liked_by_user_id);
create policy "movie_review_likes_delete_own" on public.movie_take_review_likes for delete using ((auth.jwt()->>'sub') = liked_by_user_id);

create policy "movie_review_replies_select_auth" on public.movie_take_review_replies for select using ((auth.jwt()->>'sub') is not null);
create policy "movie_review_replies_insert_own" on public.movie_take_review_replies for insert with check ((auth.jwt()->>'sub') = user_id);
create policy "movie_review_replies_update_own" on public.movie_take_review_replies for update using ((auth.jwt()->>'sub') = user_id);
create policy "movie_review_replies_delete_own" on public.movie_take_review_replies for delete using ((auth.jwt()->>'sub') = user_id);

commit;
