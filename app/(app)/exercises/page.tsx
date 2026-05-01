"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadData, type LocalData, type LocalExercise } from "@/lib/local-store";
import {
  calculateE1RM,
  getEffectiveWeight,
  getCurrentLevel,
  getPBInfo,
  getAgeUrgency,
  formatKg,
  formatDaysAgo,
} from "@/lib/calculations";
import type { SetWithE1RM } from "@/lib/calculations";
import { MUSCLE_LABELS } from "@/types";
import type { MuscleGroup } from "@/types";

export default function ExercisesPage() {
  const [data, setData] = useState<LocalData | null>(null);
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroup | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setData(loadData());
    const muscle = new URLSearchParams(window.location.search).get("muscle") as MuscleGroup | null;
    setSelectedMuscle(muscle);
  }, []);

  if (!data) {
    return <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">Loading...</div>;
  }

  const bw = data.settings.bodyweight_kg ?? 75;
  const windowDays = data.settings.current_level_window_days;
  const topN = data.settings.current_level_top_sets;
  const workoutById = Object.fromEntries(data.workouts.map((w) => [w.id, w]));

  const muscleMap: Record<string, string[]> = {};
  const rawMuscleMap: Record<string, MuscleGroup[]> = {};
  for (const m of data.exerciseMuscles) {
    if (!muscleMap[m.exercise_id]) muscleMap[m.exercise_id] = [];
    if (!rawMuscleMap[m.exercise_id]) rawMuscleMap[m.exercise_id] = [];
    muscleMap[m.exercise_id].push(MUSCLE_LABELS[m.muscle as MuscleGroup] ?? m.muscle);
    rawMuscleMap[m.exercise_id].push(m.muscle as MuscleGroup);
  }

  const setMap: Record<string, SetWithE1RM[]> = {};
  const lastDateMap: Record<string, string> = {};

  for (const set of data.sets) {
    const workout = workoutById[set.workout_id];
    const exercise = data.exercises.find((e) => e.id === set.exercise_id);
    if (!workout || !exercise) continue;
    const eff = getEffectiveWeight(set.weight_kg, exercise.is_bodyweight, bw);
    const e1rm = calculateE1RM(eff, set.reps);
    if (!setMap[set.exercise_id]) setMap[set.exercise_id] = [];
    setMap[set.exercise_id].push({ e1rm, date: workout.date });
    if (!lastDateMap[set.exercise_id] || workout.date > lastDateMap[set.exercise_id]) {
      lastDateMap[set.exercise_id] = workout.date;
    }
  }

  const byCategory: Record<string, LocalExercise[]> = {};
  const visibleExercises = selectedMuscle
    ? data.exercises.filter((ex) => rawMuscleMap[ex.id]?.includes(selectedMuscle))
    : data.exercises;
  const normalizedQuery = query.trim().toLowerCase();
  const searchedExercises = normalizedQuery
    ? visibleExercises.filter((ex) => {
        const haystack = [
          ex.name,
          ex.category ?? "",
          ...(muscleMap[ex.id] ?? []),
          ...(rawMuscleMap[ex.id] ?? []),
        ].join(" ").toLowerCase();
        return haystack.includes(normalizedQuery);
      })
    : visibleExercises;

  for (const ex of searchedExercises) {
    const cat = ex.category ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(ex);
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800 }} className="text-2xl tracking-wide">Exercises</h1>
          {selectedMuscle && (
            <p className="text-xs text-zinc-500 mt-0.5">
              Filtered by {MUSCLE_LABELS[selectedMuscle]}
            </p>
          )}
        </div>
        <Link href="/exercises/new" className="btn btn-ghost text-sm px-3 py-2">+ New</Link>
      </div>

      {selectedMuscle && (
        <Link href="/exercises" className="btn btn-ghost text-sm w-full">
          Clear muscle filter
        </Link>
      )}

      <div className="card p-3">
        <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">
          Search
        </label>
        <input
          className="input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exercise, muscle, category..."
        />
      </div>

      {Object.entries(byCategory).sort().map(([cat, exs]) => (
        <section key={cat}>
          <p className="section-label">{cat}</p>
          <div className="card overflow-hidden">
            {[...exs].sort((a, b) => {
              const aPb = getPBInfo(setMap[a.id] ?? []);
              const bPb = getPBInfo(setMap[b.id] ?? []);
              return (bPb?.daysSince ?? -1) - (aPb?.daysSince ?? -1) || a.name.localeCompare(b.name);
            }).map((ex, i) => {
              const exSets = setMap[ex.id] ?? [];
              const currentLevel = getCurrentLevel(exSets, windowDays, topN);
              const pb = getPBInfo(exSets);
              const exMuscles = muscleMap[ex.id] ?? [];

              return (
                <Link
                  key={ex.id}
                  href={`/exercises/${ex.id}`}
                  className={`flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors ${
                    i < exs.length - 1 ? "border-b border-zinc-800/50" : ""
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-zinc-200 truncate">{ex.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-xs text-zinc-500 truncate">
                        {exMuscles.slice(0, 3).join(" · ")}
                        {ex.is_bodyweight && " · bodyweight"}
                      </span>
                      <AgeChip days={pb?.daysSince ?? null} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-mono text-zinc-300">{formatKg(currentLevel)}</p>
                      <p className="text-xs text-zinc-600">PB {formatDaysAgo(pb?.daysSince ?? null)}</p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}

      {searchedExercises.length === 0 && (
        <div className="card p-6 text-center">
          <p className="text-sm text-zinc-500">No exercises found.</p>
        </div>
      )}
    </div>
  );
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
      PB {formatDaysAgo(days)}
    </span>
  );
}
