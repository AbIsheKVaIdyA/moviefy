-- Run once on projects that already applied schema.sql before playlist likes existed.

alter table public.playlists add column if not exists like_count integer not null default 0;

create table if not exists public.playlist_likes (
  user_id uuid not null references auth.users (id) on delete cascade,
  playlist_id uuid not null references public.playlists (id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, playlist_id)
);

create index if not exists playlist_likes_playlist_idx on public.playlist_likes (playlist_id);

create or replace function public.playlist_likes_after_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.playlists set like_count = like_count + 1 where id = new.playlist_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.playlists set like_count = greatest(0, like_count - 1) where id = old.playlist_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists playlist_likes_after_change on public.playlist_likes;
create trigger playlist_likes_after_change
  after insert or delete on public.playlist_likes
  for each row execute function public.playlist_likes_after_change();

alter table public.playlist_likes enable row level security;

drop policy if exists "likes_select_own" on public.playlist_likes;
create policy "likes_select_own" on public.playlist_likes for select using (auth.uid() = user_id);

drop policy if exists "likes_insert_own" on public.playlist_likes;
create policy "likes_insert_own" on public.playlist_likes for insert with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.playlist_likes;
create policy "likes_delete_own" on public.playlist_likes for delete using (auth.uid() = user_id);
