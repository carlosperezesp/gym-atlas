alter table public.profiles
  add column if not exists weekly_workout_target integer not null default 3;
