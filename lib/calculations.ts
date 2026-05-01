import type {
  FreshnessColor,
  MuscleFreshness,
  MuscleGroup,
  TrendDirection,
} from "@/types";

// ─── e1RM & Weight ──────────────────────────────────────────────────────────

export function calculateE1RM(effectiveWeight: number, reps: number): number {
  if (reps === 1) return effectiveWeight;
  return effectiveWeight * (1 + reps / 30);
}

export function getEffectiveWeight(
  weightKg: number | null,
  isBodyweight: boolean,
  bodweightKg: number | null
): number {
  const w = weightKg ?? 0;
  if (isBodyweight) {
    return (bodweightKg ?? 70) + w;
  }
  return w;
}

// ─── Current Level ──────────────────────────────────────────────────────────

export type SetWithE1RM = {
  e1rm: number;
  date: string;
};

export function getCurrentLevel(
  sets: SetWithE1RM[],
  windowDays = 60,
  topN = 3
): number | null {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);

  const recent = sets.filter((s) => new Date(s.date) >= cutoff);
  if (recent.length === 0) return null;

  const sorted = [...recent].sort((a, b) => b.e1rm - a.e1rm);
  const top = sorted.slice(0, topN);
  const avg = top.reduce((sum, s) => sum + s.e1rm, 0) / top.length;
  return Math.round(avg * 10) / 10;
}

export function getPB(sets: SetWithE1RM[]): number | null {
  if (sets.length === 0) return null;
  return Math.round(Math.max(...sets.map((s) => s.e1rm)) * 10) / 10;
}

export function getPBInfo(sets: SetWithE1RM[]): { value: number; date: string; daysSince: number | null } | null {
  if (sets.length === 0) return null;

  const best = [...sets].sort((a, b) => {
    if (b.e1rm !== a.e1rm) return b.e1rm - a.e1rm;
    return a.date.localeCompare(b.date);
  })[0];

  return {
    value: Math.round(best.e1rm * 10) / 10,
    date: best.date,
    daysSince: getDaysSinceDate(best.date),
  };
}

export function getDaysSinceDate(date: string | null): number | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const then = new Date(date);
  then.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAgeUrgency(daysSince: number | null): FreshnessColor {
  if (daysSince === null) return "gray";
  if (daysSince <= 14) return "green";
  if (daysSince <= 30) return "yellow";
  if (daysSince <= 60) return "orange";
  return "red";
}

// ─── Freshness ──────────────────────────────────────────────────────────────

export function getFreshnessColor(
  daysSince: number | null,
  thresholds = { green: 3, yellow: 7, orange: 14 }
): FreshnessColor {
  if (daysSince === null) return "gray";
  if (daysSince <= thresholds.green) return "green";
  if (daysSince <= thresholds.yellow) return "yellow";
  if (daysSince <= thresholds.orange) return "orange";
  return "red";
}

export function getMuscleFreshness(
  muscle: MuscleGroup,
  lastTrainedDate: string | null,
  thresholds?: { green: number; yellow: number; orange: number }
): MuscleFreshness {
  if (!lastTrainedDate) {
    return { muscle, lastTrainedDate: null, daysSince: null, color: "gray" };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysSince = getDaysSinceDate(lastTrainedDate) ?? 0;
  return {
    muscle,
    lastTrainedDate,
    daysSince,
    color: getFreshnessColor(daysSince, thresholds),
  };
}

// ─── Trend ──────────────────────────────────────────────────────────────────

export function getExerciseTrend(
  sets: SetWithE1RM[],
  windowDays = 60,
  topN = 3,
  threshold = 0.02
): TrendDirection {
  const now = new Date();

  const makeCutoff = (daysAgo: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return d;
  };

  const currentCutoff = makeCutoff(windowDays);
  const prevCutoff = makeCutoff(windowDays * 2);

  const currentSets = sets.filter((s) => new Date(s.date) >= currentCutoff);
  const prevSets = sets.filter(
    (s) =>
      new Date(s.date) >= prevCutoff && new Date(s.date) < currentCutoff
  );

  const currentLevel = getCurrentLevel(currentSets, windowDays, topN);
  const prevLevel = getCurrentLevel(prevSets, windowDays, topN);

  if (currentLevel === null || prevLevel === null || prevLevel === 0)
    return "none";

  const change = (currentLevel - prevLevel) / prevLevel;
  if (change >= threshold) return "up";
  if (change <= -threshold) return "down";
  return "flat";
}

// ─── Progression Suggestion ─────────────────────────────────────────────────

export type WorkoutTopSet = {
  weight: number;
  reps: number;
  date: string;
};

export function getProgressionSuggestion(
  recentWorkoutTopSets: WorkoutTopSet[]
): { suggest: boolean; suggestedWeight: number | null; message: string } | null {
  // Need at least 3 recent workouts for this exercise
  if (recentWorkoutTopSets.length < 3) return null;

  const last3 = recentWorkoutTopSets.slice(-3);
  const [a, b, c] = last3;

  // All at same weight, reps same or increasing → suggest increase
  const sameWeight = a.weight === b.weight && b.weight === c.weight;
  const repsNonDecreasing = b.reps >= a.reps && c.reps >= b.reps;

  if (sameWeight && repsNonDecreasing) {
    // Suggest ~10% increase rounded to nearest 2.5
    const suggested = Math.ceil((c.weight * 1.1) / 2.5) * 2.5;
    return {
      suggest: true,
      suggestedWeight: suggested,
      message: `You've done ${c.weight}kg × ${c.reps}+ for 3 sessions. Try ${suggested}kg next time.`,
    };
  }

  return null;
}

// ─── Formatting ─────────────────────────────────────────────────────────────

export function formatKg(value: number | null): string {
  if (value === null) return "—";
  return `${Math.round(value * 10) / 10} kg`;
}

export function formatDaysAgo(daysSince: number | null): string {
  if (daysSince === null) return "Never";
  if (daysSince === 0) return "Today";
  if (daysSince === 1) return "Yesterday";
  return `${daysSince}d ago`;
}

export function freshnessColorClass(color: FreshnessColor): string {
  switch (color) {
    case "green":
      return "bg-green-500/20 border-green-500/40 text-green-400";
    case "yellow":
      return "bg-yellow-500/20 border-yellow-500/40 text-yellow-400";
    case "orange":
      return "bg-orange-500/20 border-orange-500/40 text-orange-400";
    case "red":
      return "bg-red-500/20 border-red-500/40 text-red-400";
    case "gray":
    default:
      return "bg-zinc-800/50 border-zinc-700/40 text-zinc-500";
  }
}

export function freshnessDotClass(color: FreshnessColor): string {
  switch (color) {
    case "green":
      return "bg-green-500";
    case "yellow":
      return "bg-yellow-400";
    case "orange":
      return "bg-orange-500";
    case "red":
      return "bg-red-500";
    case "gray":
    default:
      return "bg-zinc-600";
  }
}
