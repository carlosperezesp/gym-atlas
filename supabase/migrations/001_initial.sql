-- ─── Extensions ─────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id                        uuid primary key references auth.users on delete cascade,
  bodyweight_kg             numeric,
  freshness_green_days      integer not null default 3,
  freshness_yellow_days     integer not null default 7,
  freshness_orange_days     integer not null default 14,
  current_level_window_days integer not null default 60,
  current_level_top_sets    integer not null default 3,
  created_at                timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can manage own profile"
  on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Exercises ───────────────────────────────────────────────────────────────
create table if not exists public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade,
  name          text not null,
  category      text,
  is_bodyweight boolean not null default false,
  created_at    timestamptz not null default now()
);

alter table public.exercises enable row level security;

-- Users see their own exercises AND global seed exercises (user_id is null)
create policy "Users can read own and global exercises"
  on public.exercises
  for select
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert own exercises"
  on public.exercises
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own exercises"
  on public.exercises
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own exercises"
  on public.exercises
  for delete
  using (auth.uid() = user_id);

-- ─── Exercise Muscles ─────────────────────────────────────────────────────────
create table if not exists public.exercise_muscles (
  id          uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises on delete cascade,
  muscle      text not null,
  contribution numeric not null default 1.0
);

alter table public.exercise_muscles enable row level security;

create policy "Users can read muscles for visible exercises"
  on public.exercise_muscles
  for select
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id
        and (e.user_id is null or e.user_id = auth.uid())
    )
  );

create policy "Users can manage muscles for own exercises"
  on public.exercise_muscles
  for all
  using (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.exercises e
      where e.id = exercise_id and e.user_id = auth.uid()
    )
  );

-- ─── Workouts ─────────────────────────────────────────────────────────────────
create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users on delete cascade,
  date       date not null,
  notes      text,
  created_at timestamptz not null default now()
);

alter table public.workouts enable row level security;

create policy "Users can manage own workouts"
  on public.workouts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Sets ─────────────────────────────────────────────────────────────────────
create table if not exists public.sets (
  id          uuid primary key default gen_random_uuid(),
  workout_id  uuid not null references public.workouts on delete cascade,
  exercise_id uuid not null references public.exercises on delete restrict,
  weight_kg   numeric,
  reps        integer not null,
  rpe         numeric,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.sets enable row level security;

create policy "Users can manage own sets"
  on public.sets
  for all
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_id and w.user_id = auth.uid()
    )
  );

-- ─── Seed Exercises ───────────────────────────────────────────────────────────
-- These are global (user_id = null) and visible to all users

insert into public.exercises (id, user_id, name, category, is_bodyweight) values
  ('00000000-0000-0000-0000-000000000001', null, 'Bench Press',               'Push', false),
  ('00000000-0000-0000-0000-000000000002', null, 'Incline Dumbbell Press',    'Push', false),
  ('00000000-0000-0000-0000-000000000003', null, 'Pull-ups',                  'Pull', true),
  ('00000000-0000-0000-0000-000000000004', null, 'Wide Grip Lat Pulldown',    'Pull', false),
  ('00000000-0000-0000-0000-000000000005', null, 'Close Grip Lat Pulldown',   'Pull', false),
  ('00000000-0000-0000-0000-000000000006', null, 'Dumbbell Row',              'Pull', false),
  ('00000000-0000-0000-0000-000000000007', null, 'Back Squat',                'Legs', false),
  ('00000000-0000-0000-0000-000000000008', null, 'Romanian Deadlift',         'Legs', false),
  ('00000000-0000-0000-0000-000000000009', null, 'Hip Thrust',                'Legs', false),
  ('00000000-0000-0000-0000-000000000010', null, 'Bulgarian Split Squat',     'Legs', false),
  ('00000000-0000-0000-0000-000000000011', null, 'Leg Curl',                  'Legs', false),
  ('00000000-0000-0000-0000-000000000012', null, 'Calf Raise',                'Legs', false),
  ('00000000-0000-0000-0000-000000000013', null, 'Overhead Press',            'Push', false),
  ('00000000-0000-0000-0000-000000000014', null, 'Lateral Raise',             'Shoulders', false),
  ('00000000-0000-0000-0000-000000000015', null, 'Bent Over Reverse Fly',     'Shoulders', false),
  ('00000000-0000-0000-0000-000000000016', null, 'Biceps Curl',               'Arms', false),
  ('00000000-0000-0000-0000-000000000017', null, 'Triceps Pushdown',          'Arms', false),
  ('00000000-0000-0000-0000-000000000018', null, 'Dips',                      'Push', true)
on conflict (id) do nothing;

insert into public.exercise_muscles (exercise_id, muscle, contribution) values
  -- Bench Press
  ('00000000-0000-0000-0000-000000000001', 'chest',           1.0),
  ('00000000-0000-0000-0000-000000000001', 'triceps',         0.6),
  ('00000000-0000-0000-0000-000000000001', 'shoulders_front', 0.5),
  -- Incline Dumbbell Press
  ('00000000-0000-0000-0000-000000000002', 'chest',           0.9),
  ('00000000-0000-0000-0000-000000000002', 'shoulders_front', 0.7),
  ('00000000-0000-0000-0000-000000000002', 'triceps',         0.5),
  -- Pull-ups
  ('00000000-0000-0000-0000-000000000003', 'lats',            1.0),
  ('00000000-0000-0000-0000-000000000003', 'upper_back',      0.7),
  ('00000000-0000-0000-0000-000000000003', 'biceps',          0.5),
  -- Wide Grip Lat Pulldown
  ('00000000-0000-0000-0000-000000000004', 'lats',            1.0),
  ('00000000-0000-0000-0000-000000000004', 'upper_back',      0.5),
  ('00000000-0000-0000-0000-000000000004', 'biceps',          0.4),
  -- Close Grip Lat Pulldown
  ('00000000-0000-0000-0000-000000000005', 'lats',            0.8),
  ('00000000-0000-0000-0000-000000000005', 'biceps',          0.6),
  ('00000000-0000-0000-0000-000000000005', 'upper_back',      0.4),
  -- Dumbbell Row
  ('00000000-0000-0000-0000-000000000006', 'upper_back',      1.0),
  ('00000000-0000-0000-0000-000000000006', 'lats',            0.8),
  ('00000000-0000-0000-0000-000000000006', 'biceps',          0.4),
  -- Back Squat
  ('00000000-0000-0000-0000-000000000007', 'quads',           1.0),
  ('00000000-0000-0000-0000-000000000007', 'glutes',          0.8),
  ('00000000-0000-0000-0000-000000000007', 'hamstrings',      0.4),
  ('00000000-0000-0000-0000-000000000007', 'lower_back',      0.3),
  -- Romanian Deadlift
  ('00000000-0000-0000-0000-000000000008', 'hamstrings',      1.0),
  ('00000000-0000-0000-0000-000000000008', 'glutes',          0.9),
  ('00000000-0000-0000-0000-000000000008', 'lower_back',      0.6),
  -- Hip Thrust
  ('00000000-0000-0000-0000-000000000009', 'glutes',          1.0),
  ('00000000-0000-0000-0000-000000000009', 'hamstrings',      0.4),
  -- Bulgarian Split Squat
  ('00000000-0000-0000-0000-000000000010', 'quads',           0.8),
  ('00000000-0000-0000-0000-000000000010', 'glutes',          0.8),
  ('00000000-0000-0000-0000-000000000010', 'hamstrings',      0.3),
  -- Leg Curl
  ('00000000-0000-0000-0000-000000000011', 'hamstrings',      1.0),
  -- Calf Raise
  ('00000000-0000-0000-0000-000000000012', 'calves',          1.0),
  -- Overhead Press
  ('00000000-0000-0000-0000-000000000013', 'shoulders_front', 1.0),
  ('00000000-0000-0000-0000-000000000013', 'shoulders_side',  0.6),
  ('00000000-0000-0000-0000-000000000013', 'triceps',         0.5),
  -- Lateral Raise
  ('00000000-0000-0000-0000-000000000014', 'shoulders_side',  1.0),
  -- Bent Over Reverse Fly
  ('00000000-0000-0000-0000-000000000015', 'shoulders_rear',  1.0),
  ('00000000-0000-0000-0000-000000000015', 'upper_back',      0.5),
  -- Biceps Curl
  ('00000000-0000-0000-0000-000000000016', 'biceps',          1.0),
  -- Triceps Pushdown
  ('00000000-0000-0000-0000-000000000017', 'triceps',         1.0),
  -- Dips
  ('00000000-0000-0000-0000-000000000018', 'triceps',         0.9),
  ('00000000-0000-0000-0000-000000000018', 'chest',           0.7),
  ('00000000-0000-0000-0000-000000000018', 'shoulders_front', 0.5)
on conflict do nothing;
