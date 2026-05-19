"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadData, type LocalData, type LocalExercise } from "@/lib/local-store";
import {
  calculateE1RM,
  getEffectiveWeight,
  getCurrentLevel,
  getPBInfo,
  getMuscleFreshness,
  getExerciseTrend,
  getProgressionSuggestion,
  getAgeUrgency,
  getDaysSinceDate,
  formatKg,
  formatDaysAgo,
} from "@/lib/calculations";
import type { SetWithE1RM, WorkoutTopSet } from "@/lib/calculations";
import type { MuscleGroup } from "@/types";
import { ALL_MUSCLES, MUSCLE_LABELS } from "@/types";
import MuscleCard from "@/components/dashboard/MuscleCard";
import TrendBadge from "@/components/ui/TrendBadge";

type WorkoutMode = "Full Body" | "Pierna" | "Pull" | "Push";
type ExerciseGoal = "PB attempt" | "Volume" | "Recovery" | "Balanced";

type ExercisePrescription = {
  sets: number;
  reps: string;
  weightKg: number | null;
  note: string;
};

type ExerciseTrainingSet = {
  weightKg: number | null;
  reps: number;
  date: string;
  e1rm: number;
};

type ExerciseRecommendation = {
  exercise: LocalExercise;
  muscles: MuscleGroup[];
  primaryMuscle: MuscleGroup | null;
  daysSinceExercise: number | null;
  pbDaysSince: number | null;
  trend: "up" | "down" | "flat" | "none";
  goal: ExerciseGoal;
  pattern: string;
  score: number;
  reason: string;
  prescription: ExercisePrescription;
};

type WorkoutRecommendation = {
  mode: WorkoutMode;
  muscles: ReturnType<typeof getMuscleFreshness>[];
  exercises: ExerciseRecommendation[];
  score: number;
  rankScore: number;
  badgeClass: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<LocalData | null>(null);
  const [selectedWorkoutMode, setSelectedWorkoutMode] = useState<WorkoutMode | null>(null);

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
  const exerciseTrainingSetMap: Record<string, ExerciseTrainingSet[]> = {};
  const exerciseInfoMap = Object.fromEntries(data.exercises.map((e) => [e.id, e]));

  for (const set of data.sets) {
    const exercise = exerciseInfoMap[set.exercise_id];
    const workout = workoutById[set.workout_id];
    if (!exercise || !workout) continue;
    const eff = getEffectiveWeight(set.weight_kg, exercise.is_bodyweight, bw);
    const e1rm = calculateE1RM(eff, set.reps);
    if (!exerciseSetMap[exercise.id]) exerciseSetMap[exercise.id] = [];
    exerciseSetMap[exercise.id].push({ e1rm, date: workout.date });
    if (!exerciseTrainingSetMap[exercise.id]) exerciseTrainingSetMap[exercise.id] = [];
    exerciseTrainingSetMap[exercise.id].push({
      weightKg: set.weight_kg,
      reps: set.reps,
      date: workout.date,
      e1rm,
    });
  }

  const muscleMap: Record<string, MuscleGroup[]> = {};
  const muscleContributionMap: Record<string, Array<{ muscle: MuscleGroup; contribution: number }>> = {};
  for (const em of data.exerciseMuscles) {
    if (!muscleMap[em.exercise_id]) muscleMap[em.exercise_id] = [];
    if (!muscleContributionMap[em.exercise_id]) muscleContributionMap[em.exercise_id] = [];
    muscleMap[em.exercise_id].push(em.muscle);
    muscleContributionMap[em.exercise_id].push({
      muscle: em.muscle,
      contribution: em.contribution,
    });
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

  const workoutRecommendations = getWorkoutRecommendations({
    data,
    exerciseSetMap,
    exerciseTrainingSetMap,
    muscleContributionMap,
    muscleFreshness,
    windowDays,
    topN,
  });
  const autoWorkout = workoutRecommendations[0] ?? null;
  const activeWorkout =
    workoutRecommendations.find((item) => item.mode === (selectedWorkoutMode ?? autoWorkout?.mode)) ??
    autoWorkout;

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

    const topSets = Object.values(byDate)
      .map((daySets) =>
        daySets.reduce((best, cur) => {
          const bEff = getEffectiveWeight(best.weight, exercise.is_bodyweight, bw);
          const cEff = getEffectiveWeight(cur.weight, exercise.is_bodyweight, bw);
          return calculateE1RM(cEff, cur.reps) > calculateE1RM(bEff, best.reps) ? cur : best;
        })
      )
      .sort((a, b) => a.date.localeCompare(b.date));

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

      {activeWorkout && (
        <section>
          <p className="section-label">Recommended Workout</p>
          <div className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Recommended</p>
                <h2 className="text-2xl font-semibold text-zinc-200 mt-0.5">{activeWorkout.mode}</h2>
              </div>
              <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${activeWorkout.badgeClass}`}>
                {Math.round(activeWorkout.score)}d avg
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {WORKOUT_MODES.map((mode) => {
                const isActive = activeWorkout.mode === mode;
                const isAuto = autoWorkout?.mode === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setSelectedWorkoutMode(mode)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-zinc-800/50 bg-zinc-800/30 text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
                    }`}
                  >
                    <span className="block truncate">{mode}</span>
                    {isAuto && <span className="block text-[10px] opacity-70">auto</span>}
                  </button>
                );
              })}
            </div>

            <p className="text-sm text-zinc-500">
              Esta sesión prioriza músculos con más tiempo sin estímulo y ejercicios con marcas más tiempo estancadas, manteniendo una selección equilibrada.
            </p>
            <div className="grid grid-cols-1 gap-2">
              {activeWorkout.muscles.map((mf) => (
                <MuscleCard key={mf.muscle} freshness={mf} compact href={`/exercises?muscle=${mf.muscle}`} />
              ))}
            </div>

            <div className="space-y-2 pt-1">
              {activeWorkout.exercises.map((item, index) => (
                <Link
                  key={item.exercise.id}
                  href={`/exercises/${item.exercise.id}`}
                  className="card-sm flex items-start justify-between gap-3 p-3 transition-colors hover:bg-zinc-800/50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-white text-xs font-semibold text-zinc-500 border border-zinc-800/50">
                        {index + 1}
                      </span>
                      <p className="font-semibold text-zinc-200 truncate">{item.exercise.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{item.reason}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="rounded-md border border-zinc-800/70 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                        {item.prescription.sets} series
                      </span>
                      <span className="rounded-md border border-zinc-800/70 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                        {item.prescription.reps} reps
                      </span>
                      <span className="rounded-md border border-zinc-800/70 bg-zinc-900/70 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                        {formatPrescriptionWeight(item.exercise, item.prescription.weightKg)}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-zinc-600">{item.prescription.note}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${goalChipClass(item.goal)}`}>
                      {item.goal}
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {item.pattern}
                    </span>
                  </div>
                </Link>
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

const WORKOUT_MODES: WorkoutMode[] = ["Full Body", "Pierna", "Pull", "Push"];

const TRAINING_BLOCKS = {
  legs: ["glutes", "quads", "hamstrings", "calves", "lower_back"],
  push: ["chest", "shoulders_front", "shoulders_side", "triceps"],
  pull: ["upper_back", "lats", "shoulders_rear", "biceps"],
} satisfies Record<string, MuscleGroup[]>;

const WORKOUT_TARGETS: Record<WorkoutMode, MuscleGroup[]> = {
  "Full Body": [...TRAINING_BLOCKS.legs, ...TRAINING_BLOCKS.push, ...TRAINING_BLOCKS.pull, "abs"],
  Pierna: TRAINING_BLOCKS.legs,
  Pull: TRAINING_BLOCKS.pull,
  Push: TRAINING_BLOCKS.push,
};

const PATTERN_TARGETS: Record<WorkoutMode, string[]> = {
  "Full Body": ["lower compound", "push compound", "pull compound", "accessory", "core"],
  Pierna: ["knee dominant", "hip hinge", "hamstring curl", "calves", "glute accessory"],
  Pull: ["vertical pull", "horizontal row", "rear delts", "biceps"],
  Push: ["horizontal press", "vertical press", "side delts", "triceps"],
};

const ACCESSORY_MUSCLES = new Set<MuscleGroup>([
  "abs",
  "calves",
  "lower_back",
  "shoulders_front",
  "shoulders_side",
  "shoulders_rear",
]);

const RECOVERY_SENSITIVE_MUSCLES = new Set<MuscleGroup>([
  "lower_back",
  "hamstrings",
  "quads",
  "chest",
  "lats",
]);

function getWorkoutRecommendations({
  data,
  exerciseSetMap,
  exerciseTrainingSetMap,
  muscleContributionMap,
  muscleFreshness,
  windowDays,
  topN,
}: {
  data: LocalData;
  exerciseSetMap: Record<string, SetWithE1RM[]>;
  exerciseTrainingSetMap: Record<string, ExerciseTrainingSet[]>;
  muscleContributionMap: Record<string, Array<{ muscle: MuscleGroup; contribution: number }>>;
  muscleFreshness: ReturnType<typeof getMuscleFreshness>[];
  windowDays: number;
  topN: number;
}): WorkoutRecommendation[] {
  const byMuscle: Record<MuscleGroup, ReturnType<typeof getMuscleFreshness>> = Object.fromEntries(
    muscleFreshness.map((m) => [m.muscle, m])
  ) as Record<MuscleGroup, ReturnType<typeof getMuscleFreshness>>;
  const exerciseLastTrained = Object.fromEntries(
    Object.entries(exerciseSetMap).map(([exerciseId, sets]) => [
      exerciseId,
      sets.length ? [...sets].sort((a, b) => b.date.localeCompare(a.date))[0].date : null,
    ])
  );

  const byMode = WORKOUT_MODES.map((mode) => {
    const targetMuscles = WORKOUT_TARGETS[mode];
    const modeMuscles = targetMuscles
      .map((muscle) => byMuscle[muscle])
      .filter(Boolean)
      .sort((a, b) => cappedMuscleDays(b) - cappedMuscleDays(a));
    const staleMuscles = modeMuscles.slice(0, mode === "Full Body" ? 5 : 3);
    const { score, rankScore } = getWorkoutModeScore(mode, byMuscle);

    const exercises = data.exercises
      .map((exercise) =>
        scoreExerciseForWorkout({
          exercise,
          muscles: muscleContributionMap[exercise.id] ?? [],
          exerciseSets: exerciseSetMap[exercise.id] ?? [],
          trainingSets: exerciseTrainingSetMap[exercise.id] ?? [],
          lastTrained: exerciseLastTrained[exercise.id] ?? null,
          targetMuscles,
          byMuscle,
          windowDays,
          topN,
        })
      )
      .filter((item): item is ExerciseRecommendation => Boolean(item))
      .sort((a, b) => b.score - a.score);

    return {
      mode,
      muscles: staleMuscles,
      exercises: selectBalancedExercises(mode, exercises),
      score,
      rankScore,
      badgeClass:
        score > 21
          ? "bg-red-50 text-red-700 border-red-200"
          : score > 14
            ? "bg-orange-50 text-orange-700 border-orange-200"
            : "bg-yellow-50 text-yellow-700 border-yellow-200",
    };
  });

  return byMode.sort((a, b) => b.rankScore - a.rankScore);
}

function scoreExerciseForWorkout({
  exercise,
  muscles,
  exerciseSets,
  trainingSets,
  lastTrained,
  targetMuscles,
  byMuscle,
  windowDays,
  topN,
}: {
  exercise: LocalExercise;
  muscles: Array<{ muscle: MuscleGroup; contribution: number }>;
  exerciseSets: SetWithE1RM[];
  trainingSets: ExerciseTrainingSet[];
  lastTrained: string | null;
  targetMuscles: MuscleGroup[];
  byMuscle: Record<string, ReturnType<typeof getMuscleFreshness>>;
  windowDays: number;
  topN: number;
}): ExerciseRecommendation | null {
  const targetEntries = muscles.filter((entry) => targetMuscles.includes(entry.muscle));
  if (targetEntries.length === 0) return null;

  const pb = getPBInfo(exerciseSets);
  const trend = getExerciseTrend(exerciseSets, windowDays, topN);
  const daysSinceExercise = getDaysSinceDate(lastTrained);
  const primaryMuscle =
    [...targetEntries].sort((a, b) => b.contribution - a.contribution)[0]?.muscle ?? null;
  const primaryEntry = targetEntries.find((entry) => entry.muscle === primaryMuscle);
  const primaryScore = primaryEntry
    ? cappedMuscleDays(byMuscle[primaryEntry.muscle]) * primaryEntry.contribution * 1.15
    : 0;
  const secondaryScore = Math.min(
    targetEntries
      .filter((entry) => entry.muscle !== primaryMuscle)
      .reduce((sum, entry) => sum + cappedMuscleDays(byMuscle[entry.muscle]) * entry.contribution * 0.25, 0),
    12
  );
  const pbScore = Math.min(pb?.daysSince ?? 45, 180) * 0.2;
  const exerciseRestScore = Math.min(daysSinceExercise ?? 45, 90) * 0.15;
  const trendBonus = trend === "flat" ? 12 : trend === "down" ? 8 : 0;
  const recoveryPenalty = getRecoveryPenalty(targetEntries, byMuscle, daysSinceExercise);
  const score = Math.max(0, primaryScore + secondaryScore + pbScore + exerciseRestScore + trendBonus - recoveryPenalty);
  const primaryMuscleDays = primaryMuscle ? byMuscle[primaryMuscle]?.daysSince ?? null : null;
  const goal = getExerciseGoal(pb?.daysSince ?? null, trend, primaryMuscleDays, recoveryPenalty);
  const pattern = getExercisePattern(exercise, targetEntries, primaryMuscle);
  const prescription = getExercisePrescription(exercise, trainingSets, goal, pattern);

  return {
    exercise,
    muscles: targetEntries.map((entry) => entry.muscle),
    primaryMuscle,
    daysSinceExercise,
    pbDaysSince: pb?.daysSince ?? null,
    trend,
    goal,
    pattern,
    score,
    reason: getExerciseReason(primaryMuscle, primaryMuscleDays, pb?.daysSince ?? null, trend, goal),
    prescription,
  };
}

function selectBalancedExercises(mode: WorkoutMode, ranked: ExerciseRecommendation[]) {
  const limit = mode === "Full Body" ? 6 : 5;
  const selected: ExerciseRecommendation[] = [];

  for (const pattern of PATTERN_TARGETS[mode]) {
    const pick = ranked.find(
      (item) =>
        matchesWorkoutPattern(mode, item.pattern, pattern) &&
        !selected.some((selectedItem) => selectedItem.exercise.id === item.exercise.id)
    );
    if (pick) selected.push(pick);
  }

  if (mode === "Full Body" && selected.length < 3) {
    for (const block of Object.values(TRAINING_BLOCKS)) {
      const pick = ranked.find(
        (item) =>
          item.muscles.some((muscle) => block.includes(muscle)) &&
          !selected.some((selectedItem) => selectedItem.exercise.id === item.exercise.id)
      );
      if (pick) selected.push(pick);
    }
  }

  if (mode !== "Full Body") {
    for (const muscle of WORKOUT_TARGETS[mode]) {
      const pick = ranked.find(
        (item) =>
          item.muscles.includes(muscle) &&
          !selected.some((selectedItem) => selectedItem.exercise.id === item.exercise.id)
      );
      if (pick) selected.push(pick);
    }
  }

  for (const item of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((selectedItem) => selectedItem.exercise.id === item.exercise.id)) {
      selected.push(item);
    }
  }

  return selected.slice(0, 7);
}

function matchesWorkoutPattern(mode: WorkoutMode, exercisePattern: string, targetPattern: string) {
  if (exercisePattern === targetPattern) return true;
  if (mode !== "Full Body") return false;

  if (targetPattern === "lower compound") {
    return ["knee dominant", "hip hinge", "lower compound"].includes(exercisePattern);
  }
  if (targetPattern === "push compound") {
    return ["horizontal press", "vertical press", "push compound"].includes(exercisePattern);
  }
  if (targetPattern === "pull compound") {
    return ["vertical pull", "horizontal row", "pull compound"].includes(exercisePattern);
  }
  if (targetPattern === "accessory") {
    return ["side delts", "rear delts", "biceps", "triceps", "glute accessory", "calves", "accessory"].includes(exercisePattern);
  }

  return false;
}

function getWorkoutModeScore(
  mode: WorkoutMode,
  byMuscle: Record<MuscleGroup, ReturnType<typeof getMuscleFreshness>>
) {
  if (mode === "Full Body") {
    const legScore = getBlockScore(TRAINING_BLOCKS.legs, byMuscle);
    const pushScore = getBlockScore(TRAINING_BLOCKS.push, byMuscle);
    const pullScore = getBlockScore(TRAINING_BLOCKS.pull, byMuscle);
    const score = (legScore + pushScore + pullScore) / 3;
    const eligible = [legScore, pushScore, pullScore].every((blockScore) => blockScore >= 7);
    return {
      score,
      rankScore: eligible ? score : score * 0.45,
    };
  }

  const score = getBlockScore(WORKOUT_TARGETS[mode], byMuscle);
  return { score, rankScore: score };
}

function getBlockScore(
  muscles: MuscleGroup[],
  byMuscle: Record<MuscleGroup, ReturnType<typeof getMuscleFreshness>>
) {
  const stale = muscles
    .map((muscle) => cappedMuscleDays(byMuscle[muscle]))
    .sort((a, b) => b - a)
    .slice(0, 3);
  return stale.reduce((sum, days) => sum + days, 0) / Math.max(stale.length, 1);
}

function cappedMuscleDays(freshness: ReturnType<typeof getMuscleFreshness> | undefined) {
  if (!freshness) return 0;
  const cap = ACCESSORY_MUSCLES.has(freshness.muscle) ? 21 : 30;
  return Math.min(freshness.daysSince ?? cap, cap);
}

function getRecoveryPenalty(
  entries: Array<{ muscle: MuscleGroup; contribution: number }>,
  byMuscle: Record<MuscleGroup, ReturnType<typeof getMuscleFreshness>>,
  daysSinceExercise: number | null
) {
  let penalty = 0;

  for (const entry of entries) {
    const days = byMuscle[entry.muscle]?.daysSince;
    if (days !== null && days !== undefined && days <= 2) {
      penalty += entry.contribution >= 0.8 ? 30 : 12;
      if (RECOVERY_SENSITIVE_MUSCLES.has(entry.muscle)) penalty += 15;
    }
  }

  if (daysSinceExercise !== null && daysSinceExercise <= 2) penalty += 20;
  else if (daysSinceExercise !== null && daysSinceExercise <= 7) penalty += 10;

  return penalty;
}

function getExerciseGoal(
  pbDays: number | null,
  trend: "up" | "down" | "flat" | "none",
  muscleDays: number | null,
  recoveryPenalty: number
): ExerciseGoal {
  if (recoveryPenalty >= 25) return "Recovery";
  if ((pbDays ?? 0) >= 45 && trend === "flat" && (muscleDays ?? 0) >= 7) return "PB attempt";
  if ((muscleDays ?? 0) >= 10) return "Volume";
  return "Balanced";
}

function getExercisePattern(
  exercise: LocalExercise,
  entries: Array<{ muscle: MuscleGroup; contribution: number }>,
  primaryMuscle: MuscleGroup | null
) {
  const name = exercise.name.toLowerCase();
  const category = (exercise.category ?? "").toLowerCase();
  const muscles = entries.map((entry) => entry.muscle);

  if (name.includes("curl") && muscles.includes("hamstrings")) return "hamstring curl";
  if (name.includes("calf")) return "calves";
  if (name.includes("abductor") || name.includes("hip thrust") || name.includes("glute")) return "glute accessory";
  if (name.includes("squat") || (name.includes("press") && category.includes("leg"))) return "knee dominant";
  if (name.includes("deadlift") || name.includes("rdl") || name.includes("hinge")) return "hip hinge";

  if (name.includes("pull-up") || name.includes("pulldown") || name.includes("chin")) return "vertical pull";
  if (name.includes("row") || name.includes("remo")) return "horizontal row";
  if (name.includes("reverse fly") || primaryMuscle === "shoulders_rear") return "rear delts";
  if (primaryMuscle === "biceps") return "biceps";

  if (name.includes("bench") || name.includes("dip") || name.includes("fly")) return "horizontal press";
  if (name.includes("overhead") || name.includes("shoulder press") || name.includes("military")) return "vertical press";
  if (name.includes("lateral") || primaryMuscle === "shoulders_side") return "side delts";
  if (primaryMuscle === "triceps") return "triceps";

  if (primaryMuscle === "abs") return "core";
  if (muscles.some((muscle) => TRAINING_BLOCKS.legs.includes(muscle))) return "lower compound";
  if (muscles.some((muscle) => TRAINING_BLOCKS.push.includes(muscle))) return "push compound";
  if (muscles.some((muscle) => TRAINING_BLOCKS.pull.includes(muscle))) return "pull compound";
  return "accessory";
}

function getExerciseReason(
  muscle: MuscleGroup | null,
  muscleDays: number | null,
  pbDays: number | null,
  trend: "up" | "down" | "flat" | "none",
  goal: ExerciseGoal
) {
  const muscleText = muscle
    ? `${MUSCLE_LABELS[muscle]} ${formatDaysAgo(muscleDays).toLowerCase()}`
    : "Buen encaje para la sesión";
  const pbText = pbDays === null ? "sin PB registrado" : `PB ${formatDaysAgo(pbDays).toLowerCase()}`;
  const trendText = trend === "flat" ? "marca plana" : trend === "down" ? "conviene reactivar" : "buen momento";
  return `${muscleText} · ${pbText} · ${trendText} · ${goal}`;
}

function getExercisePrescription(
  exercise: LocalExercise,
  trainingSets: ExerciseTrainingSet[],
  goal: ExerciseGoal,
  pattern: string
): ExercisePrescription {
  const topSets = getWorkoutTopTrainingSets(trainingSets);
  const lastTopSet = topSets.at(-1) ?? null;
  const progression = getProgressionSuggestion(
    topSets.map((set) => ({
      weight: set.weightKg ?? 0,
      reps: set.reps,
      date: set.date,
    }))
  );
  const isAccessory = [
    "accessory",
    "biceps",
    "triceps",
    "side delts",
    "rear delts",
    "calves",
    "core",
    "hamstring curl",
    "glute accessory",
  ].includes(pattern);
  const defaultSets = isAccessory ? 3 : 4;

  if (!lastTopSet) {
    return {
      sets: defaultSets,
      reps: isAccessory ? "10-15" : "8-10",
      weightKg: null,
      note: "Sin historial: empieza suave y deja 2-3 reps en recámara.",
    };
  }

  const progressedWeight =
    progression?.suggestedWeight !== null && progression?.suggestedWeight !== undefined && progression.suggestedWeight > 0
      ? progression.suggestedWeight
      : null;
  const baseWeight = progressedWeight ?? lastTopSet.weightKg;
  const reducedWeight = getRecoveryWeight(exercise, baseWeight);

  if (goal === "Recovery") {
    return {
      sets: Math.max(2, defaultSets - 1),
      reps: isAccessory ? "12-15" : "8-12",
      weightKg: reducedWeight,
      note: "Día de mantener: RPE 6-7, técnica limpia.",
    };
  }

  if (goal === "PB attempt") {
    const targetReps = progressedWeight ? getRepRange(lastTopSet.reps - 2, lastTopSet.reps) : getRepRange(lastTopSet.reps - 1, lastTopSet.reps + 1);
    return {
      sets: defaultSets,
      reps: targetReps,
      weightKg: baseWeight,
      note: progressedWeight ? "Subida sugerida por progresión reciente." : "Aprieta solo si el calentamiento se mueve bien.",
    };
  }

  if (goal === "Volume") {
    return {
      sets: defaultSets,
      reps: isAccessory ? "12-15" : "8-12",
      weightKg: baseWeight,
      note: "Busca volumen sólido con 1-2 reps en recámara.",
    };
  }

  return {
    sets: defaultSets,
    reps: isAccessory ? getRepRange(lastTopSet.reps, lastTopSet.reps + 3) : getRepRange(lastTopSet.reps - 1, lastTopSet.reps + 2),
    weightKg: baseWeight,
    note: "Mantén el peso si va justo; sube solo si las reps salen limpias.",
  };
}

function getWorkoutTopTrainingSets(trainingSets: ExerciseTrainingSet[]) {
  const byDate: Record<string, ExerciseTrainingSet[]> = {};

  for (const set of trainingSets) {
    if (!byDate[set.date]) byDate[set.date] = [];
    byDate[set.date].push(set);
  }

  return Object.values(byDate)
    .map((daySets) => daySets.reduce((best, cur) => (cur.e1rm > best.e1rm ? cur : best)))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getRepRange(min: number, max: number) {
  const safeMin = Math.max(1, Math.round(min));
  const safeMax = Math.max(safeMin, Math.round(max));
  return safeMin === safeMax ? `${safeMin}` : `${safeMin}-${safeMax}`;
}

function roundToNearestIncrement(value: number, increment = 2.5) {
  return Math.round(value / increment) * increment;
}

function getRecoveryWeight(exercise: LocalExercise, weightKg: number | null) {
  if (weightKg === null) return null;
  if (!exercise.is_bodyweight || weightKg >= 0) return roundToNearestIncrement(weightKg * 0.9);
  return roundToNearestIncrement(weightKg * 1.1);
}

function formatPrescriptionWeight(exercise: LocalExercise, weightKg: number | null) {
  if (weightKg === null) return exercise.is_bodyweight ? "BW" : "Carga libre";
  if (!exercise.is_bodyweight) return formatKg(weightKg);
  if (weightKg === 0) return "BW";
  if (weightKg > 0) return `BW + ${formatKg(weightKg)}`;
  return `BW - ${formatKg(Math.abs(weightKg))}`;
}

function goalChipClass(goal: ExerciseGoal) {
  switch (goal) {
    case "PB attempt":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "Volume":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "Recovery":
      return "bg-slate-50 text-slate-600 border-slate-200";
    case "Balanced":
    default:
      return "bg-green-50 text-green-700 border-green-200";
  }
}

function AgeChip({ days, label }: { days: number | null; label?: string }) {
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
      {label ? `${label} ` : ""}{formatDaysAgo(days)}
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
