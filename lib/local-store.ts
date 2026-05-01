"use client";

import type { MuscleGroup } from "@/types";
import {
  IMPORT_VERSION,
  IMPORTED_EXERCISES,
  IMPORTED_MUSCLES,
  IMPORTED_SETS,
  IMPORTED_WORKOUTS,
} from "@/lib/imported-workouts";

export type LocalExercise = {
  id: string;
  name: string;
  category: string | null;
  is_bodyweight: boolean;
  custom?: boolean;
};

export type LocalExerciseMuscle = {
  id: string;
  exercise_id: string;
  muscle: MuscleGroup;
  contribution: number;
};

export type LocalSet = {
  id: string;
  workout_id: string;
  exercise_id: string;
  weight_kg: number | null;
  reps: number;
  rpe: number | null;
  notes: string | null;
  created_at: string;
};

export type LocalWorkout = {
  id: string;
  date: string;
  notes: string | null;
  created_at: string;
};

export type LocalSettings = {
  bodyweight_kg: number | null;
  freshness_green_days: number;
  freshness_yellow_days: number;
  freshness_orange_days: number;
  current_level_window_days: number;
  current_level_top_sets: number;
};

export type LocalData = {
  exercises: LocalExercise[];
  exerciseMuscles: LocalExerciseMuscle[];
  workouts: LocalWorkout[];
  sets: LocalSet[];
  settings: LocalSettings;
  importVersion?: number;
};

const STORAGE_KEY = "gymos.local.v1";

const DEFAULT_SETTINGS: LocalSettings = {
  bodyweight_kg: 75,
  freshness_green_days: 3,
  freshness_yellow_days: 7,
  freshness_orange_days: 14,
  current_level_window_days: 60,
  current_level_top_sets: 3,
};

const DEFAULT_EXERCISES: LocalExercise[] = [
  ["00000000-0000-0000-0000-000000000001", "Bench Press", "Push", false],
  ["00000000-0000-0000-0000-000000000002", "Incline Dumbbell Press", "Push", false],
  ["00000000-0000-0000-0000-000000000003", "Pull-ups", "Pull", true],
  ["00000000-0000-0000-0000-000000000004", "Wide Grip Lat Pulldown", "Pull", false],
  ["00000000-0000-0000-0000-000000000005", "Close Grip Lat Pulldown", "Pull", false],
  ["00000000-0000-0000-0000-000000000006", "Dumbbell Row", "Pull", false],
  ["00000000-0000-0000-0000-000000000007", "Back Squat", "Legs", false],
  ["00000000-0000-0000-0000-000000000008", "Romanian Deadlift", "Legs", false],
  ["00000000-0000-0000-0000-000000000009", "Hip Thrust", "Legs", false],
  ["00000000-0000-0000-0000-000000000010", "Bulgarian Split Squat", "Legs", false],
  ["00000000-0000-0000-0000-000000000011", "Leg Curl", "Legs", false],
  ["00000000-0000-0000-0000-000000000012", "Calf Raise", "Legs", false],
  ["00000000-0000-0000-0000-000000000013", "Overhead Press", "Push", false],
  ["00000000-0000-0000-0000-000000000014", "Lateral Raise", "Shoulders", false],
  ["00000000-0000-0000-0000-000000000015", "Bent Over Reverse Fly", "Shoulders", false],
  ["00000000-0000-0000-0000-000000000016", "Biceps Curl", "Arms", false],
  ["00000000-0000-0000-0000-000000000017", "Triceps Pushdown", "Arms", false],
  ["00000000-0000-0000-0000-000000000018", "Dips", "Push", true],
].map(([id, name, category, is_bodyweight]) => ({
  id: id as string,
  name: name as string,
  category: category as string,
  is_bodyweight: is_bodyweight as boolean,
}));

const muscleRows: Array<[string, MuscleGroup, number]> = [
  ["00000000-0000-0000-0000-000000000001", "chest", 1],
  ["00000000-0000-0000-0000-000000000001", "triceps", 0.6],
  ["00000000-0000-0000-0000-000000000001", "shoulders_front", 0.5],
  ["00000000-0000-0000-0000-000000000002", "chest", 0.9],
  ["00000000-0000-0000-0000-000000000002", "shoulders_front", 0.7],
  ["00000000-0000-0000-0000-000000000002", "triceps", 0.5],
  ["00000000-0000-0000-0000-000000000003", "lats", 1],
  ["00000000-0000-0000-0000-000000000003", "upper_back", 0.7],
  ["00000000-0000-0000-0000-000000000003", "biceps", 0.5],
  ["00000000-0000-0000-0000-000000000004", "lats", 1],
  ["00000000-0000-0000-0000-000000000004", "upper_back", 0.5],
  ["00000000-0000-0000-0000-000000000004", "biceps", 0.4],
  ["00000000-0000-0000-0000-000000000005", "lats", 0.8],
  ["00000000-0000-0000-0000-000000000005", "biceps", 0.6],
  ["00000000-0000-0000-0000-000000000005", "upper_back", 0.4],
  ["00000000-0000-0000-0000-000000000006", "upper_back", 1],
  ["00000000-0000-0000-0000-000000000006", "lats", 0.8],
  ["00000000-0000-0000-0000-000000000006", "biceps", 0.4],
  ["00000000-0000-0000-0000-000000000007", "quads", 1],
  ["00000000-0000-0000-0000-000000000007", "glutes", 0.8],
  ["00000000-0000-0000-0000-000000000007", "hamstrings", 0.4],
  ["00000000-0000-0000-0000-000000000007", "lower_back", 0.3],
  ["00000000-0000-0000-0000-000000000008", "hamstrings", 1],
  ["00000000-0000-0000-0000-000000000008", "glutes", 0.9],
  ["00000000-0000-0000-0000-000000000008", "lower_back", 0.6],
  ["00000000-0000-0000-0000-000000000009", "glutes", 1],
  ["00000000-0000-0000-0000-000000000009", "hamstrings", 0.4],
  ["00000000-0000-0000-0000-000000000010", "quads", 0.8],
  ["00000000-0000-0000-0000-000000000010", "glutes", 0.8],
  ["00000000-0000-0000-0000-000000000010", "hamstrings", 0.3],
  ["00000000-0000-0000-0000-000000000011", "hamstrings", 1],
  ["00000000-0000-0000-0000-000000000012", "calves", 1],
  ["00000000-0000-0000-0000-000000000013", "shoulders_front", 1],
  ["00000000-0000-0000-0000-000000000013", "shoulders_side", 0.6],
  ["00000000-0000-0000-0000-000000000013", "triceps", 0.5],
  ["00000000-0000-0000-0000-000000000014", "shoulders_side", 1],
  ["00000000-0000-0000-0000-000000000015", "shoulders_rear", 1],
  ["00000000-0000-0000-0000-000000000015", "upper_back", 0.5],
  ["00000000-0000-0000-0000-000000000016", "biceps", 1],
  ["00000000-0000-0000-0000-000000000017", "triceps", 1],
  ["00000000-0000-0000-0000-000000000018", "triceps", 0.9],
  ["00000000-0000-0000-0000-000000000018", "chest", 0.7],
  ["00000000-0000-0000-0000-000000000018", "shoulders_front", 0.5],
];

const DEFAULT_MUSCLES: LocalExerciseMuscle[] = muscleRows.map(([exercise_id, muscle, contribution], index) => ({
  id: `default-muscle-${index}`,
  exercise_id,
  muscle,
  contribution,
}));

export function defaultData(): LocalData {
  return {
    exercises: mergeById(DEFAULT_EXERCISES, IMPORTED_EXERCISES),
    exerciseMuscles: mergeById(DEFAULT_MUSCLES, IMPORTED_MUSCLES),
    workouts: IMPORTED_WORKOUTS,
    sets: IMPORTED_SETS,
    settings: DEFAULT_SETTINGS,
    importVersion: IMPORT_VERSION,
  };
}

export function loadData(): LocalData {
  if (typeof window === "undefined") return defaultData();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const data = defaultData();
    saveData(data);
    return data;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LocalData>;
    const data = {
      exercises: parsed.exercises?.length ? parsed.exercises : DEFAULT_EXERCISES,
      exerciseMuscles: parsed.exerciseMuscles?.length ? parsed.exerciseMuscles : DEFAULT_MUSCLES,
      workouts: parsed.workouts ?? [],
      sets: parsed.sets ?? [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      importVersion: parsed.importVersion,
    };

    if (data.importVersion !== IMPORT_VERSION) {
      const upgraded = withImportedWorkouts(data);
      saveData(upgraded);
      return upgraded;
    }

    return data;
  } catch {
    return defaultData();
  }
}

export function saveData(data: LocalData) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function resetLocalData() {
  saveData(defaultData());
}

function mergeById<T extends { id: string }>(base: T[], incoming: T[]) {
  const map = new Map(base.map((item) => [item.id, item]));
  for (const item of incoming) map.set(item.id, item);
  return Array.from(map.values());
}

function withImportedWorkouts(data: LocalData): LocalData {
  return {
    ...data,
    exercises: mergeById(data.exercises, IMPORTED_EXERCISES),
    exerciseMuscles: mergeById(data.exerciseMuscles, IMPORTED_MUSCLES),
    workouts: mergeById(data.workouts, IMPORTED_WORKOUTS),
    sets: mergeById(data.sets, IMPORTED_SETS),
    importVersion: IMPORT_VERSION,
  };
}
