import type { LocalExercise } from "@/lib/local-store";

// Plans follow how sets are actually logged: a couple of lighter ramp-up sets
// and one hard top set, usually taken close to failure. Progression is double
// progression on that top set: add reps inside the range, then add load.

export type HistorySet = {
  weightKg: number | null;
  reps: number;
  date: string;
  e1rm: number;
  notes?: string | null;
};

export type PlannedSet = {
  weightKg: number | null;
  reps: string;
  kind: "ramp" | "top";
};

export type ExercisePlan = {
  sets: PlannedSet[];
  repRange: [number, number];
  topWeightKg: number | null;
  note: string;
};

export type TopSetFeedback = {
  tone: "up" | "hold" | "down";
  message: string;
};

const BARBELL_PATTERN =
  /bench|banca|squat|sentadilla|deadlift|peso muerto|rdl|romanian|hex|hip thrust|barra|barbell|military|militar/i;
const DUMBBELL_PATTERN = /dumbbell|mancuerna|\bdb\b/i;

export function getRepRange(isAccessory: boolean): [number, number] {
  return isAccessory ? [8, 12] : [6, 10];
}

export function isDumbbellExercise(exercise: LocalExercise, history: HistorySet[] = []) {
  if (DUMBBELL_PATTERN.test(exercise.name)) return true;
  const noted = history.filter((set) => set.notes && DUMBBELL_PATTERN.test(set.notes)).length;
  return history.length > 0 && noted >= history.length / 2;
}

// Gym dumbbells go up 1 kg at a time to 10 kg, then 2 kg. Barbells move in
// 2.5 kg. Machine stacks vary, so their step is read from the logged weights.
export function getLoadStep(
  exercise: LocalExercise,
  history: HistorySet[],
  fromKg: number,
  direction: 1 | -1
): number {
  if (isDumbbellExercise(exercise, history)) {
    return direction === 1 ? (fromKg < 10 ? 1 : 2) : fromKg <= 10 ? 1 : 2;
  }
  return getFixedStep(exercise, history, fromKg);
}

// Only weights near the current load count: one exercise can be logged with
// dumbbells at 16 kg and with a barbell at 60 kg. A barbell keyword only wins
// while those weights fit 2.5 kg plate steps; 20 kg then 22 kg on a "hip
// thrust" means some other implement.
function getFixedStep(exercise: LocalExercise, history: HistorySet[], aroundKg: number) {
  const nearby = history.filter(
    (set) => set.weightKg !== null && set.weightKg >= aroundKg * 0.5 && set.weightKg <= aroundKg * 1.5
  );
  const relevant = nearby.length >= 2 ? nearby : history;
  const fitsBarbell = relevant.every((set) => set.weightKg === null || (set.weightKg / 2.5) % 1 === 0);
  if (BARBELL_PATTERN.test(exercise.name) && fitsBarbell) return 2.5;
  return inferMachineStep(relevant, aroundKg);
}

function inferMachineStep(history: HistorySet[], aroundKg: number) {
  const weights = Array.from(
    new Set(history.map((set) => set.weightKg).filter((w): w is number => w !== null && w > 0))
  ).sort((a, b) => a - b);
  let step = Infinity;
  for (let i = 1; i < weights.length; i++) step = Math.min(step, weights[i] - weights[i - 1]);
  if (Number.isFinite(step) && step >= 1 && step <= 10) return step;
  return aroundKg >= 40 ? 5 : 2.5;
}

export function roundToLoad(weightKg: number, exercise: LocalExercise, history: HistorySet[]) {
  if (weightKg <= 0) return 0;
  if (isDumbbellExercise(exercise, history)) {
    return weightKg < 10 ? Math.round(weightKg) : Math.round(weightKg / 2) * 2;
  }
  const step = getFixedStep(exercise, history, weightKg);
  return Math.max(step, Math.round(weightKg / step) * step);
}

// The reference is the best set (by e1RM) of the last session, so a single
// heavy record attempt for 3 reps doesn't drag the next target down.
export function getLastSessionReference(history: HistorySet[]) {
  if (history.length === 0) return null;
  const lastDate = history.reduce((max, set) => (set.date > max ? set.date : max), history[0].date);
  return history
    .filter((set) => set.date === lastDate)
    .reduce((best, set) => (set.e1rm > best.e1rm ? set : best));
}

export function planExercise({
  exercise,
  history,
  isAccessory,
  loadFactor = 1,
  loadFactorNote,
}: {
  exercise: LocalExercise;
  history: HistorySet[];
  isAccessory: boolean;
  loadFactor?: number;
  loadFactorNote?: string;
}): ExercisePlan {
  const repRange = getRepRange(isAccessory);
  const [min, max] = repRange;
  const reference = getLastSessionReference(history);

  if (!reference) {
    return {
      sets: [
        { weightKg: null, reps: "10", kind: "ramp" },
        { weightKg: null, reps: repRangeText(min, max), kind: "top" },
      ],
      repRange,
      topWeightKg: null,
      note: "Sin historial: busca un peso con el que llegues justo al rango.",
    };
  }

  const lastLoad = reference.weightKg ?? 0;
  const isUnloadedBodyweight = exercise.is_bodyweight && lastLoad <= 0;

  if (isUnloadedBodyweight) {
    const reps =
      loadFactor < 1 ? repRangeText(min, max) : reference.reps >= max ? `${max}+` : repRangeText(reference.reps + 1, max);
    return {
      sets: [1, 2, 3].map((n) => ({ weightKg: 0, reps, kind: n === 3 ? "top" : "ramp" })),
      repRange,
      topWeightKg: 0,
      note:
        loadFactor < 1 && loadFactorNote
          ? `Último: ${reference.reps} reps. ${loadFactorNote}`
          : reference.reps >= max
            ? "Te sobran reps: prueba con 2,5 kg de lastre."
            : `Último: ${reference.reps} reps. Busca una más.`,
    };
  }

  let topWeight = lastLoad;
  let topReps: string;
  let note: string;
  const lastText = `${formatLoad(lastLoad)}×${reference.reps}`;

  if (reference.reps >= max) {
    topWeight = lastLoad + getLoadStep(exercise, history, lastLoad, 1);
    topReps = repRangeText(min, min + 2);
    note = `Último ${lastText}: superaste el rango, toca subir.`;
  } else if (reference.reps >= min) {
    topReps = repRangeText(reference.reps + 1, max);
    note = `Último ${lastText}: mismo peso, 1-2 reps más.`;
  } else if (reference.reps >= min - 2) {
    topReps = repRangeText(min, max);
    note = `Último ${lastText}: consolida este peso.`;
  } else {
    topWeight = Math.max(0, lastLoad - getLoadStep(exercise, history, lastLoad, -1));
    topReps = repRangeText(min, max);
    note = `Último ${lastText}: baja un poco para entrar en rango.`;
  }

  // Coming back from a break starts from what was last lifted, not from the
  // progressed target.
  if (loadFactor < 1) {
    topWeight = roundToLoad(lastLoad * loadFactor, exercise, history);
    topReps = repRangeText(min, max);
    if (loadFactorNote) note = `Último ${lastText}. ${loadFactorNote}`;
  }

  // Weighted bodyweight work has no meaningful ramp: every set carries the body.
  const sets: PlannedSet[] = exercise.is_bodyweight
    ? [1, 2, 3].map((n) => ({ weightKg: topWeight, reps: topReps, kind: n === 3 ? "top" : "ramp" }))
    : [
        ...Array.from(new Set([0.65, 0.85].map((share) => roundToLoad(topWeight * share, exercise, history))))
          .filter((weight) => weight > 0 && weight < topWeight)
          .map((weightKg): PlannedSet => ({ weightKg, reps: "8", kind: "ramp" })),
        { weightKg: topWeight, reps: topReps, kind: "top" },
      ];

  return {
    sets,
    repRange,
    topWeightKg: topWeight,
    note,
  };
}

// Judges today's hardest set against the plan so the next session is clear.
export function getTopSetFeedback(
  plan: ExercisePlan,
  doneSets: Array<{ weightKg: number | null; reps: number }>,
  exercise: LocalExercise,
  history: HistorySet[]
): TopSetFeedback | null {
  if (plan.topWeightKg === null || doneSets.length === 0) return null;
  const [min, max] = plan.repRange;
  const heaviest = doneSets.reduce((best, set) =>
    (set.weightKg ?? 0) > (best.weightKg ?? 0) ||
    ((set.weightKg ?? 0) === (best.weightKg ?? 0) && set.reps > best.reps)
      ? set
      : best
  );
  const load = heaviest.weightKg ?? 0;
  if (load < plan.topWeightKg) return null;

  if (heaviest.reps >= max) {
    const next = load + getLoadStep(exercise, history, load, 1);
    return { tone: "up", message: `¡${heaviest.reps} reps! La próxima vez sube a ${formatLoad(next)} kg.` };
  }
  if (heaviest.reps < min) {
    return { tone: "down", message: `Por debajo del rango: repite ${formatLoad(load)} kg la próxima vez.` };
  }
  return { tone: "hold", message: `Dentro del rango: la próxima vez busca ${heaviest.reps + 1} reps.` };
}

function repRangeText(from: number, to: number) {
  const low = Math.min(from, to);
  return low === to ? String(to) : `${low}-${to}`;
}

export function formatLoad(weightKg: number) {
  return Number.isInteger(weightKg) ? String(weightKg) : weightKg.toFixed(2).replace(/0$/, "").replace(".", ",");
}

export function formatPlannedSet(set: PlannedSet) {
  const load = set.weightKg === null ? "?" : set.weightKg === 0 ? "BW" : formatLoad(set.weightKg);
  return `${load}×${set.reps}`;
}
