-- Supabase auth + profiles setup for Innov
-- Run with PostgreSQL role that can manage auth schema (project owner/postgres)

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  organization_name text not null default 'InnovByte Organization',
  phone text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and p.role = 'admin'
  );
$$;

create or replace function public.prevent_unauthorized_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role <> old.role and not public.is_admin(auth.uid()) then
    raise exception 'Only admins can change account role';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_unauthorized_role_change on public.profiles;
create trigger trg_prevent_unauthorized_role_change
before update on public.profiles
for each row
execute function public.prevent_unauthorized_role_change();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, organization_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'organization_name', 'InnovByte Organization'),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    case
      when lower(coalesce(new.raw_user_meta_data ->> 'role', 'staff')) = 'admin' then 'admin'
      else 'staff'
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    organization_name = excluded.organization_name,
    phone = excluded.phone,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Backfill profiles for any existing auth users
insert into public.profiles (id, email, full_name, organization_name, phone, role)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  coalesce(u.raw_user_meta_data ->> 'organization_name', 'InnovByte Organization'),
  coalesce(u.raw_user_meta_data ->> 'phone', ''),
  case
    when lower(coalesce(u.raw_user_meta_data ->> 'role', 'staff')) = 'admin' then 'admin'
    else 'staff'
  end
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert
on public.profiles
for insert
to authenticated
with check (id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.is_admin(auth.uid()))
with check (id = auth.uid() or public.is_admin(auth.uid()));

drop function if exists public.create_account(text, text, text, text, text, text);

-- Delete own account or (if admin) delete another account
create or replace function public.delete_account(p_target_user_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_requester uuid := auth.uid();
  v_target uuid;
begin
  if v_requester is null then
    raise exception 'Not authenticated';
  end if;

  v_target := coalesce(p_target_user_id, v_requester);

  if v_target <> v_requester and not public.is_admin(v_requester) then
    raise exception 'Only admins can delete other accounts';
  end if;

  delete from auth.identities where user_id = v_target;
  delete from auth.users where id = v_target;

  return v_target;
end;
$$;

revoke all on function public.delete_account(uuid) from public;
grant execute on function public.delete_account(uuid) to authenticated;
