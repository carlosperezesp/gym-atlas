# GymOS — Personal Gym Progression Tracker

A live personal dashboard to track gym progression, muscle freshness, strength levels, PBs, and get progression suggestions.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** (utility-first, dark theme)
- **Supabase** (Postgres + Auth + Row Level Security)
- **Recharts** (e1RM charts)
- **Deployable on Vercel** (zero config)

---

## Features

### Dashboard (`/`)
- Last workout date
- Muscle freshness map (14 muscle groups, color-coded green/yellow/orange/red)
- Muscles needing attention
- Strength snapshot table (current level, PB, trend)
- Progression alerts (auto-detected)

### Log Workout (`/log`)
- Fast multi-exercise, multi-set logging
- Date picker (defaults to today)
- Optional RPE and notes per set
- Bodyweight exercise support

### Exercises (`/exercises`)
- All exercises grouped by category
- Current level, PB, trend, last trained per exercise
- Create custom exercises with muscle mappings

### Exercise Detail (`/exercises/[id]`)
- e1RM chart over time
- Current level (avg top N sets in window)
- Personal best (all-time)
- Progression suggestion
- Full set history table

### Settings (`/settings`)
- Bodyweight (for BW exercise calculations)
- Freshness color thresholds
- Current level window (default 60 days)
- Top sets used for level (default 3)

---

## Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project.

### 2. Run the migration

In Supabase Dashboard → SQL Editor, paste and run the contents of:

```
supabase/migrations/001_initial.sql
```

This creates all tables, RLS policies, the profile trigger, and seeds 18 default exercises.

### 3. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

Find these in Supabase → Project Settings → API.

### 4. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Supabase Auth redirect

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## Calculations

### Estimated 1RM (Epley formula)
```
e1RM = effective_weight × (1 + reps / 30)
```

### Effective Weight
- Normal: `weight_kg`
- Bodyweight: `bodyweight_kg + weight_kg` (0 = BW only, negative = assisted)

### Current Level
Average of top N e1RM sets from the last N days (default: top 3 in 60 days).

### Trend
- **Up**: current level ≥ 2% higher than previous period (60–120d ago)
- **Down**: ≥ 2% lower
- **Flat**: within ±2%

### Muscle Freshness
- 🟢 Green: 0–3 days since trained
- 🟡 Yellow: 4–7 days
- 🟠 Orange: 8–14 days
- 🔴 Red: 15+ days
- ⬜ Gray: never trained

### Progression Alert
If the top set in the last 3 workouts for an exercise shows same weight with non-decreasing reps → suggest ~10% weight increase.

---

## Default Exercises (seeded)

| Exercise | Primary Muscle |
|---|---|
| Bench Press | Chest |
| Incline Dumbbell Press | Chest |
| Pull-ups | Lats |
| Wide Grip Lat Pulldown | Lats |
| Close Grip Lat Pulldown | Lats |
| Dumbbell Row | Upper Back |
| Back Squat | Quads |
| Romanian Deadlift | Hamstrings |
| Hip Thrust | Glutes |
| Bulgarian Split Squat | Quads/Glutes |
| Leg Curl | Hamstrings |
| Calf Raise | Calves |
| Overhead Press | Front Delts |
| Lateral Raise | Side Delts |
| Bent Over Reverse Fly | Rear Delts |
| Biceps Curl | Biceps |
| Triceps Pushdown | Triceps |
| Dips | Triceps |

---

## Database Schema

```
profiles          → user settings (bodyweight, thresholds)
exercises         → global (user_id=null) + custom exercises
exercise_muscles  → muscle groups per exercise with contribution weight
workouts          → dated workout sessions
sets              → individual sets (weight, reps, RPE, notes)
```

All tables use Row Level Security. Users only see their own data + global seed exercises.
