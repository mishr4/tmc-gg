-- ============================================================
-- TMC Staff Portal — Supabase setup
-- Run once in your Supabase project: SQL Editor → New query → paste → Run.
-- Safe to re-run (idempotent). Tables are namespaced tmc_* so they won't
-- collide with anything MavionSSO already uses.
-- ============================================================

-- Allowlist of people permitted into the staff portal.
-- A person can sign in (Google/Discord) only if their email is here and not disabled.
create table if not exists public.tmc_staff (
  id          uuid primary key default gen_random_uuid(),
  email       text unique not null,
  name        text,
  role        text not null default 'staff' check (role in ('staff','admin')),
  disabled    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- In-app audit log of admin actions (sign-in history lives in Supabase → Auth → Logs).
create table if not exists public.tmc_staff_audit (
  id      bigserial primary key,
  at      timestamptz not null default now(),
  actor   text,
  action  text not null,
  target  text,
  detail  text
);

alter table public.tmc_staff       enable row level security;
alter table public.tmc_staff_audit enable row level security;

-- Is the caller an enabled admin? SECURITY DEFINER so it bypasses RLS (no recursion).
create or replace function public.tmc_is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.tmc_staff
    where lower(email) = lower(auth.jwt() ->> 'email')
      and role = 'admin'
      and disabled = false
  );
$$;

-- tmc_staff: a user may read only THEIR OWN row (to check authorisation); admins read all.
drop policy if exists tmc_staff_select on public.tmc_staff;
create policy tmc_staff_select on public.tmc_staff for select
  using ( lower(email) = lower(auth.jwt() ->> 'email') or public.tmc_is_admin() );

-- tmc_staff: only admins may add / change / remove rows. (No self-update — prevents privilege escalation.)
drop policy if exists tmc_staff_admin_write on public.tmc_staff;
create policy tmc_staff_admin_write on public.tmc_staff for all
  using ( public.tmc_is_admin() ) with check ( public.tmc_is_admin() );

-- audit: admins read; admins write.
drop policy if exists tmc_audit_select on public.tmc_staff_audit;
create policy tmc_audit_select on public.tmc_staff_audit for select
  using ( public.tmc_is_admin() );

drop policy if exists tmc_audit_insert on public.tmc_staff_audit;
create policy tmc_audit_insert on public.tmc_staff_audit for insert
  with check ( public.tmc_is_admin() );

-- ------------------------------------------------------------
-- Seed the first admin (the owner). EDIT this email if needed.
-- ------------------------------------------------------------
insert into public.tmc_staff (email, name, role)
values ('alexnmishra@gmail.com', 'Owner', 'admin')
on conflict (email) do update set role = 'admin', disabled = false;
