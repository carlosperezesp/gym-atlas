"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { loadData, type LocalData } from "@/lib/local-store";
import {
  calculateE1RM,
  getEffectiveWeight,
  getCurrentLevel,
  getPB,
  getExerciseTrend,
  getProgressionSuggestion,
  formatKg,
  formatDaysAgo,
} from "@/lib/calculations";
import type { SetWithE1RM, WorkoutTopSet } from "@/lib/calculations";
import TrendBadge from "@/components/ui/TrendBadge";
import E1RMChart from "@/components/exercises/E1RMChart";
import { MUSCLE_LABELS } from "@/types";
import type { MuscleGroup } from "@/types";

export default function ExerciseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<LocalData | null>(null);

  useEffect(() => {
    const loaded = loadData();
    if (!loaded.exercises.some((e) => e.id === id)) {
      router.push("/exercises");
      return;
    }
    setData(loaded);
  }, [id, router]);

  if (!data) {
    return <div className="h-40 flex items-center justify-center text-zinc-500 text-sm">Loading...</div>;
  }

  const exercise = data.exercises.find((e) => e.id === id);
  if (!exercise) return null;

  const bw = data.settings.bodyweight_kg ?? 75;
  const windowDays = data.settings.current_level_window_days;
  const topN = data.settings.current_level_top_sets;
  const workoutById = Object.fromEntries(data.workouts.map((w) => [w.id, w]));
  const muscles = data.exerciseMuscles
    .filter((m) => m.exercise_id === id)
    .sort((a, b) => b.contribution - a.contribution);
  const userSets = data.sets
    .filter((s) => s.exercise_id === id)
    .sort((a, b) => (workoutById[b.workout_id]?.date ?? "").localeCompare(workoutById[a.workout_id]?.date ?? ""));

  const e1rmSets: SetWithE1RM[] = userSets.map((s) => {
    const eff = getEffectiveWeight(s.weight_kg, exercise.is_bodyweight, bw);
    const e1rm = calculateE1RM(eff, s.reps);
    return { e1rm, date: workoutById[s.workout_id]?.date ?? "" };
  });

  const currentLevel = getCurrentLevel(e1rmSets, windowDays, topN);
  const pb = getPB(e1rmSets);
  const trend = getExerciseTrend(e1rmSets, windowDays, topN);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const recentE1rmSets = e1rmSets
    .filter((s) => new Date(s.date) >= cutoff)
    .sort((a, b) => b.e1rm - a.e1rm)
    .slice(0, topN);

  const byDate: Record<string, WorkoutTopSet[]> = {};
  for (const set of userSets) {
    const date = workoutById[set.workout_id]?.date ?? "";
    if (!date) continue;
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push({ weight: set.weight_kg ?? 0, reps: set.reps, date });
  }
  const topSetsPerDay = Object.values(byDate)
    .sort((a, b) => a[0].date.localeCompare(b[0].date))
    .map((daySets) =>
      daySets.reduce((best, cur) => {
        const bEff = getEffectiveWeight(best.weight, exercise.is_bodyweight, bw);
        const cEff = getEffectiveWeight(cur.weight, exercise.is_bodyweight, bw);
        return calculateE1RM(cEff, cur.reps) > calculateE1RM(bEff, cur.reps) ? cur : best;
      })
    );
  const suggestion = getProgressionSuggestion(topSetsPerDay);

  const chartDataMap: Record<string, number> = {};
  for (const set of e1rmSets) {
    if (!chartDataMap[set.date] || chartDataMap[set.date] < set.e1rm) {
      chartDataMap[set.date] = set.e1rm;
    }
  }
  const chartData = Object.entries(chartDataMap)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, e1rm]) => ({
      date: new Date(date).toLocaleDateString("en", { month: "short", day: "numeric" }),
      e1rm: Math.round(e1rm * 10) / 10,
    }));

  const lastDate = userSets[0] ? workoutById[userSets[0].workout_id]?.date ?? null : null;
  const daysSince = lastDate
    ? Math.floor((Date.now() - new Date(lastDate).getTime()) / 86400000)
    : null;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <Link href="/exercises" className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-3">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Exercises
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontWeight: 800 }} className="text-2xl tracking-wide">
              {exercise.name}
            </h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {exercise.category}{exercise.is_bodyweight && " · bodyweight"}
            </p>
          </div>
          <Link href={`/exercises/${exercise.id}/edit`} className="btn btn-ghost text-sm px-3 py-2">Edit</Link>
        </div>
      </div>

      {muscles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {muscles.map((m) => (
            <span key={m.id} className="px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 border border-zinc-700 text-zinc-300">
              {MUSCLE_LABELS[m.muscle as MuscleGroup] ?? m.muscle}
              {m.contribution < 1 && <span className="text-zinc-500 ml-1">{m.contribution}</span>}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Level</p>
          <p className="font-mono font-semibold text-zinc-100">{formatKg(currentLevel)}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{windowDays}d window</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">PB</p>
          <p className="font-mono font-semibold text-orange-400">{formatKg(pb)}</p>
          <p className="text-xs text-zinc-600 mt-0.5">all time</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 mb-1">Trend</p>
          <div className="flex items-center justify-center mt-1"><TrendBadge trend={trend} /></div>
          <p className="text-xs text-zinc-600 mt-0.5">{formatDaysAgo(daysSince)}</p>
        </div>
      </div>

      {suggestion?.suggest && (
        <div className="card-sm p-4" style={{ borderColor: "rgba(249,115,22,0.25)", background: "rgba(249,115,22,0.05)" }}>
          <p className="font-semibold text-zinc-200">Time to progress</p>
          <p className="text-sm text-zinc-400 mt-0.5">{suggestion.message}</p>
        </div>
      )}

      {chartData.length > 1 && (
        <div className="card p-4">
          <p className="section-label">e1RM Over Time</p>
          <E1RMChart data={chartData} />
        </div>
      )}

      {recentE1rmSets.length > 0 && (
        <div className="card p-4">
          <p className="section-label">Best Recent Sets (Top {topN})</p>
          <div className="space-y-2">
            {recentE1rmSets.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">
                  {new Date(s.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </span>
                <span className="font-mono text-zinc-200">{formatKg(s.e1rm)} e1RM</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {userSets.length > 0 ? (
        <div className="card overflow-hidden">
          <div className="px-4 pt-4">
            <p className="section-label">All Sets</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 px-4 py-2">Date</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 px-3 py-2">Weight</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 px-3 py-2">Reps</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 px-3 py-2">e1RM</th>
                  <th className="text-right text-xs font-semibold uppercase tracking-wide text-zinc-500 px-3 py-2">RPE</th>
                </tr>
              </thead>
              <tbody>
                {userSets.map((set, i) => {
                  const eff = getEffectiveWeight(set.weight_kg, exercise.is_bodyweight, bw);
                  const e1rm = calculateE1RM(eff, set.reps);
                  const workout = workoutById[set.workout_id];
                  return (
                    <tr key={set.id} className={i < userSets.length - 1 ? "border-b border-zinc-800/50" : ""}>
                      <td className="px-4 py-2.5 text-zinc-400">
                        {workout ? new Date(workout.date).toLocaleDateString("en", { month: "short", day: "numeric" }) : "-"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-300">
                        {set.weight_kg !== null ? `${set.weight_kg}kg` : "BW"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-300">{set.reps}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-400 text-xs">{formatKg(e1rm)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-zinc-500 text-xs">{set.rpe ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card p-8 text-center">
          <p className="text-zinc-500 text-sm">No sets logged for this exercise yet.</p>
          <Link href="/log" className="btn btn-primary mt-4">Log a set</Link>
        </div>
      )}
    </div>
  );
}
