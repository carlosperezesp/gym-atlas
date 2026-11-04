-- GymATLAS state is now only read and written through the passcode-protected
-- /api/state route, which uses the service role key. The public key that ships
-- in old browser bundles must no longer be able to touch this table.

drop policy if exists "Anyone can read shared GymATLAS state" on public.app_state;
drop policy if exists "Anyone can insert shared GymATLAS state" on public.app_state;
drop policy if exists "Anyone can update shared GymATLAS state" on public.app_state;

revoke all on table public.app_state from anon, authenticated;
