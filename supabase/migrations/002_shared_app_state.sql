-- Single-user shared state for the no-login version of GymATLAS.
-- This intentionally allows anonymous reads and writes to one row so the same
-- Vercel URL can sync between phone and desktop without an auth flow.

create table if not exists public.app_state (
  id         text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_state enable row level security;

drop policy if exists "Anyone can read shared GymATLAS state" on public.app_state;
create policy "Anyone can read shared GymATLAS state"
  on public.app_state
  for select
  using (id = 'default');

drop policy if exists "Anyone can insert shared GymATLAS state" on public.app_state;
create policy "Anyone can insert shared GymATLAS state"
  on public.app_state
  for insert
  with check (id = 'default');

drop policy if exists "Anyone can update shared GymATLAS state" on public.app_state;
create policy "Anyone can update shared GymATLAS state"
  on public.app_state
  for update
  using (id = 'default')
  with check (id = 'default');
