-- Prefer first_name + last_name (or full_name) from auth metadata for profiles.display_name.
-- Does not use email local-part. Run in Supabase SQL editor on existing projects.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, handle)
  values (
    new.id,
    coalesce(
      nullif(
        trim(
          concat_ws(
            ' ',
            nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
            nullif(trim(new.raw_user_meta_data->>'last_name'), '')
          )
        ),
        ''
      ),
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      'Movie fan'
    ),
    null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
