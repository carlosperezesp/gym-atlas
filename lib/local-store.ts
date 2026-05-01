"use client";

import type { MuscleGroup } from "@/types";
import {
  IMPORT_VERSION,
  IMPORTED_EXERCISES,
  IMPORTED_MUSCLES,
  IMPORTED_SETS,
  IMPORTED_WORKOUTS,
} from "@/lib/imported-workouts";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

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
  updatedAt?: string;
};

const STORAGE_KEY = "gymos.local.v1";
const CLOUD_STATE_ID = process.env.NEXT_PUBLIC_GYM_ATLAS_STATE_ID || "default";

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
    updatedAt: "2026-05-01T00:00:00.000Z",
  };
}

export function loadData(): LocalData {
  if (typeof window === "undefined") return defaultData();

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const data = defaultData();
    saveLocalData(data);
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
      updatedAt: parsed.updatedAt,
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
  const next = {
    ...data,
    updatedAt: new Date().toISOString(),
  };
  saveLocalData(next);
  void saveCloudData(next);
}

export function saveLocalData(data: LocalData) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("GymATLAS local save failed (storage full or restricted?)", e);
    throw e;
  }
}

export function isCloudSyncEnabled() {
  return isSupabaseConfigured();
}

export async function syncCloudData(): Promise<{ changed: boolean; data: LocalData; mode: "local" | "cloud" }> {
  if (typeof window === "undefined" || !isCloudSyncEnabled()) {
    return { changed: false, data: loadData(), mode: "local" };
  }

  const localRaw = window.localStorage.getItem(STORAGE_KEY);
  const localData = localRaw ? loadData() : defaultData();
  const client = createClient();
  const { data: row, error } = await client
    .from("app_state")
    .select("data, updated_at")
    .eq("id", CLOUD_STATE_ID)
    .maybeSingle();

  if (error) {
    console.warn("GymATLAS cloud sync failed", error);
    return { changed: false, data: localData, mode: "local" };
  }

  if (!row?.data) {
    const seed = {
      ...localData,
      updatedAt: localData.updatedAt ?? new Date().toISOString(),
    };
    saveLocalData(seed);
    await saveCloudData(seed);
    return { changed: false, data: seed, mode: "cloud" };
  }

  const cloudData = normalizeData({
    ...(row.data as Partial<LocalData>),
    updatedAt: (row.data as Partial<LocalData>).updatedAt ?? row.updated_at,
  });

  const cloudUpdatedAt = Date.parse(cloudData.updatedAt ?? "");
  const localUpdatedAt = localRaw ? Date.parse(localData.updatedAt ?? "") : 0;

  if (!localRaw || cloudUpdatedAt > localUpdatedAt) {
    const changed = JSON.stringify(localData) !== JSON.stringify(cloudData);
    saveLocalData(cloudData);
    return { changed, data: cloudData, mode: "cloud" };
  }

  await saveCloudData(localData);
  return { changed: false, data: localData, mode: "cloud" };
}

async function saveCloudData(data: LocalData) {
  if (!isCloudSyncEnabled()) return;

  try {
    const client = createClient();
    const updatedAt = data.updatedAt ?? new Date().toISOString();
    const { error } = await client
      .from("app_state")
      .upsert({
        id: CLOUD_STATE_ID,
        data: { ...normalizeData(data), updatedAt },
        updated_at: updatedAt,
      });

    if (error) console.warn("GymATLAS cloud save failed", error);
  } catch (error) {
    console.warn("GymATLAS cloud save failed", error);
  }
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

function normalizeData(data: Partial<LocalData>): LocalData {
  const normalized = {
    exercises: data.exercises?.length ? data.exercises : DEFAULT_EXERCISES,
    exerciseMuscles: data.exerciseMuscles?.length ? data.exerciseMuscles : DEFAULT_MUSCLES,
    workouts: data.workouts ?? [],
    sets: data.sets ?? [],
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
    importVersion: data.importVersion,
    updatedAt: data.updatedAt,
  };

  if (normalized.importVersion !== IMPORT_VERSION) {
    return withImportedWorkouts(normalized);
  }

  return normalized;
}
