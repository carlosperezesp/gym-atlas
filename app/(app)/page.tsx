"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadData, type LocalData } from "@/lib/local-store";
import {
  calculateE1RM,
  getEffectiveWeight,
  getCurrentLevel,
  getPBInfo,
  getMuscleFreshness,
  getExerciseTrend,
  getProgressionSuggestion,
  getAgeUrgency,
  formatKg,
  formatDaysAgo,
} from "@/lib/calculations";
import type { SetWithE1RM, WorkoutTopSet } from "@/lib/calculations";
import type { MuscleGroup } from "@/types";
import { ALL_MUSCLES } from "@/types";
import MuscleCard from "@/components/dashboard/MuscleCard";
import TrendBadge from "@/components/ui/TrendBadge";

export default function DashboardPage() {
  const [data, setData] = useState<LocalData | null>(null);

  useEffect(() => {
    setData(loadData());
  }, []);

  if (!data) {
    return <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">Loading...</div>;
  }

  const bw = data.settings.bodyweight_kg ?? 75;
  const windowDays = data.settings.current_level_window_days;
  const topN = data.settings.current_level_top_sets;
  const thresholds = {
    green: data.settings.freshness_green_days,
    yellow: data.settings.freshness_yellow_days,
    orange: data.settings.freshness_orange_days,
  };

  const workoutById = Object.fromEntries(data.workouts.map((w) => [w.id, w]));
  const workoutDates = data.workouts.map((w) => w.date);
  const lastWorkoutDate = workoutDates.length > 0 ? [...workoutDates].sort().reverse()[0] : null;
  const lastWorkoutDays = lastWorkoutDate
    ? Math.floor((Date.now() - new Date(lastWorkoutDate).getTime()) / 86400000)
    : null;

  const exerciseSetMap: Record<string, SetWithE1RM[]> = {};
  const exerciseInfoMap = Object.fromEntries(data.exercises.map((e) => [e.id, e]));

  for (const set of data.sets) {
    const exercise = exerciseInfoMap[set.exercise_id];
    const workout = workoutById[set.workout_id];
    if (!exercise || !workout) continue;
    const eff = getEffectiveWeight(set.weight_kg, exercise.is_bodyweight, bw);
    const e1rm = calculateE1RM(eff, set.reps);
    if (!exerciseSetMap[exercise.id]) exerciseSetMap[exercise.id] = [];
    exerciseSetMap[exercise.id].push({ e1rm, date: workout.date });
  }

  const muscleMap: Record<string, string[]> = {};
  for (const em of data.exerciseMuscles) {
    if (!muscleMap[em.exercise_id]) muscleMap[em.exercise_id] = [];
    muscleMap[em.exercise_id].push(em.muscle);
  }

  const muscleLastTrained: Record<string, string> = {};
  for (const set of data.sets) {
    const workout = workoutById[set.workout_id];
    if (!workout) continue;
    const muscles = muscleMap[set.exercise_id] ?? [];
    for (const muscle of muscles) {
      if (!muscleLastTrained[muscle] || workout.date > muscleLastTrained[muscle]) {
        muscleLastTrained[muscle] = workout.date;
      }
    }
  }

  const muscleFreshness = ALL_MUSCLES.map((m: MuscleGroup) =>
    getMuscleFreshness(m, muscleLastTrained[m] ?? null, thresholds)
  );

  const nextSession = getNextSessionRecommendation(muscleFreshness);

  const exercisesWithSets = data.exercises.filter((e) => (exerciseSetMap[e.id] ?? []).length > 0);
  const exerciseLevels = exercisesWithSets.map((exercise) => {
    const exSets = exerciseSetMap[exercise.id] ?? [];
    const pb = getPBInfo(exSets);
    return {
      exercise,
      currentLevel: getCurrentLevel(exSets, windowDays, topN),
      pb,
      trend: getExerciseTrend(exSets, windowDays, topN),
    };
  }).sort((a, b) => (b.pb?.daysSince ?? -1) - (a.pb?.daysSince ?? -1)).slice(0, 8);

  const progressionAlerts: Array<{ name: string; message: string }> = [];
  for (const exercise of exercisesWithSets) {
    const byDate: Record<string, WorkoutTopSet[]> = {};
    for (const set of data.sets.filter((s) => s.exercise_id === exercise.id)) {
      const date = workoutById[set.workout_id]?.date ?? "";
      if (!date) continue;
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push({ weight: set.weight_kg ?? 0, reps: set.reps, date });
    }

    const topSets = Object.values(byDate).map((daySets) =>
      daySets.reduce((best, cur) => {
        const bEff = getEffectiveWeight(best.weight, exercise.is_bodyweight, bw);
        const cEff = getEffectiveWeight(cur.weight, exercise.is_bodyweight, bw);
        return calculateE1RM(cEff, cur.reps) > calculateE1RM(bEff, cur.reps) ? cur : best;
      })
    );

    const suggestion = getProgressionSuggestion(topSets);
    if (suggestion?.suggest) {
      progressionAlerts.push({
        name: exercise.name,
        message: suggestion.suggestedWeight && suggestion.suggestedWeight > 0
          ? `Has repetido una marca estable varias sesiones. Próxima vez prueba subir a ${suggestion.suggestedWeight} kg si la técnica se mantiene limpia.`
          : "Has repetido una marca estable varias sesiones. Próxima vez prueba añadir reps, tempo o un poco de lastre si la técnica se mantiene limpia.",
      });
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-zinc-500 mb-0.5" style={{ fontFamily: "Barlow Condensed, sans-serif" }}>
            {lastWorkoutDate ? `Last trained: ${formatDaysAgo(lastWorkoutDays)}` : "No workouts yet"}
          </p>
          <div className="flex items-center gap-2.5">
            <GymAtlasLogo />
            <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800 }} className="text-4xl tracking-wide text-zinc-100">
              GymATLAS
            </h1>
          </div>
        </div>
        <Link href="/log" className="btn btn-primary text-sm px-4 py-2">+ Log</Link>
      </div>

      <section>
        <p className="section-label">Muscle Freshness</p>
        <div className="grid grid-cols-2 gap-2">
          {muscleFreshness.map((mf) => (
            <MuscleCard key={mf.muscle} freshness={mf} href={`/exercises?muscle=${mf.muscle}`} />
          ))}
        </div>
      </section>

      {nextSession && (
        <section>
          <p className="section-label">Next Gym Session</p>
          <div className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Recommended</p>
                <h2 className="text-2xl font-semibold text-zinc-200 mt-0.5">{nextSession.label}</h2>
              </div>
              <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${nextSession.badgeClass}`}>
                {Math.round(nextSession.score)}d avg
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              Esta sesión encaja mejor porque estos músculos llevan más tiempo sin recibir estímulo.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {nextSession.muscles.map((mf) => (
                <MuscleCard key={mf.muscle} freshness={mf} compact href={`/exercises?muscle=${mf.muscle}`} />
              ))}
            </div>
          </div>
        </section>
      )}

      {progressionAlerts.length > 0 && (
        <section>
          <p className="section-label">Ready To Increase</p>
          <div className="space-y-2">
            {progressionAlerts.map((alert) => (
              <div key={alert.name} className="card-sm p-3">
                <p className="text-sm font-semibold text-zinc-200">{alert.name}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {exerciseLevels.length > 0 && (
        <section>
          <p className="section-label">Strength Snapshot</p>
          <div className="card overflow-hidden">
            {exerciseLevels.map((row, i) => (
              <Link
                key={row.exercise.id}
                href={`/exercises/${row.exercise.id}`}
                className={`flex items-center justify-between px-4 py-3 ${i < exerciseLevels.length - 1 ? "border-b border-zinc-800/50" : ""}`}
              >
                <div className="min-w-0">
                  <p className="font-medium text-zinc-200 truncate">{row.exercise.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-zinc-500">PB {formatKg(row.pb?.value ?? null)}</p>
                    <AgeChip days={row.pb?.daysSince ?? null} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm text-zinc-300">{formatKg(row.currentLevel)}</p>
                  <TrendBadge trend={row.trend} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function getNextSessionRecommendation(muscles: ReturnType<typeof getMuscleFreshness>[]) {
  const groups = [
    {
      label: "Pull",
      muscles: ["upper_back", "lats", "shoulders_rear", "biceps"] as MuscleGroup[],
    },
    {
      label: "Push",
      muscles: ["chest", "shoulders_front", "shoulders_side", "triceps"] as MuscleGroup[],
    },
    {
      label: "Pierna",
      muscles: ["glutes", "quads", "hamstrings", "calves", "lower_back"] as MuscleGroup[],
    },
  ];

  const byMuscle = Object.fromEntries(muscles.map((m) => [m.muscle, m]));
  const ranked = groups.map((group) => {
    const groupMuscles = group.muscles
      .map((muscle) => byMuscle[muscle])
      .filter(Boolean)
      .sort((a, b) => (b.daysSince ?? 999) - (a.daysSince ?? 999));
    const staleMuscles = groupMuscles.slice(0, 3);
    const score =
      staleMuscles.reduce((sum, muscle) => sum + (muscle.daysSince ?? 120), 0) /
      Math.max(staleMuscles.length, 1);
    return { ...group, muscles: staleMuscles, score };
  }).sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  if (!winner) return null;

  return {
    ...winner,
    badgeClass:
      winner.score > 60
        ? "bg-red-50 text-red-700 border-red-200"
        : winner.score > 30
          ? "bg-orange-50 text-orange-700 border-orange-200"
          : "bg-yellow-50 text-yellow-700 border-yellow-200",
  };
}

function AgeChip({ days }: { days: number | null }) {
  const urgency = getAgeUrgency(days);
  const styles = {
    green: "bg-green-50 text-green-700 border-green-200",
    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
    orange: "bg-orange-50 text-orange-700 border-orange-200",
    red: "bg-red-50 text-red-700 border-red-200",
    gray: "bg-slate-50 text-slate-500 border-slate-200",
  }[urgency];

  return (
    <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${styles}`}>
      {formatDaysAgo(days)}
    </span>
  );
}

function GymAtlasLogo() {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true" className="block">
        <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.9" />
        <ellipse cx="16" cy="16" rx="5.4" ry="12" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" />
        <path d="M4 16h24M7.5 10.5h17M7.5 21.5h17" fill="none" stroke="currentColor" strokeWidth="1.1" opacity="0.55" strokeLinecap="round" />
        <text
          x="16"
          y="21.4"
          textAnchor="middle"
          fontFamily="Barlow Condensed, system-ui, sans-serif"
          fontSize="17"
          fontWeight="800"
          fill="currentColor"
        >
          G
        </text>
      </svg>
    </span>
  );
}
