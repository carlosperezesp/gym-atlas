export type Profile = {
  id: string;
  bodyweight_kg: number | null;
  freshness_green_days: number;
  freshness_yellow_days: number;
  freshness_orange_days: number;
  current_level_window_days: number;
  current_level_top_sets: number;
  created_at: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  is_bodyweight: boolean;
  created_at: string;
  muscles?: ExerciseMuscle[];
};

export type ExerciseMuscle = {
  id: string;
  exercise_id: string;
  muscle: string;
  contribution: number;
};

export type Workout = {
  id: string;
  user_id: string;
  date: string;
  notes: string | null;
  created_at: string;
  sets?: Set[];
};

export type Set = {
  id: string;
  workout_id: string;
  exercise_id: string;
  weight_kg: number | null;
  reps: number;
  rpe: number | null;
  notes: string | null;
  created_at: string;
  exercise?: Exercise;
};

export type MuscleGroup =
  | "chest"
  | "upper_back"
  | "lats"
  | "shoulders_front"
  | "shoulders_side"
  | "shoulders_rear"
  | "biceps"
  | "triceps"
  | "abs"
  | "lower_back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  upper_back: "Upper Back",
  lats: "Lats",
  shoulders_front: "Front Delts",
  shoulders_side: "Side Delts",
  shoulders_rear: "Rear Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  lower_back: "Lower Back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};

export const ALL_MUSCLES: MuscleGroup[] = [
  "chest",
  "upper_back",
  "lats",
  "shoulders_front",
  "shoulders_side",
  "shoulders_rear",
  "biceps",
  "triceps",
  "abs",
  "lower_back",
  "glutes",
  "quads",
  "hamstrings",
  "calves",
];

export type FreshnessColor = "green" | "yellow" | "orange" | "red" | "gray";

export type MuscleFreshness = {
  muscle: MuscleGroup;
  lastTrainedDate: string | null;
  daysSince: number | null;
  color: FreshnessColor;
};

export type ExerciseLevel = {
  exercise: Exercise;
  currentLevel: number | null;
  pb: number | null;
  trend: "up" | "down" | "flat" | "none";
  lastTrained: string | null;
};

export type ProgressionSuggestion = {
  exercise: Exercise;
  message: string;
  suggestedWeight: number | null;
  currentWeight: number;
  currentReps: number;
};

export type TrendDirection = "up" | "down" | "flat" | "none";
