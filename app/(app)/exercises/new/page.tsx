"use client";

import { useState } from "react";
import { loadData, makeId, saveData } from "@/lib/local-store";
import { useRouter } from "next/navigation";
import { ALL_MUSCLES, MUSCLE_LABELS } from "@/types";
import type { MuscleGroup } from "@/types";

const CATEGORIES = ["Push", "Pull", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Other"];

type MuscleEntry = { muscle: MuscleGroup; contribution: string };

export default function NewExercisePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Push");
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [muscleEntries, setMuscleEntries] = useState<MuscleEntry[]>([
    { muscle: "chest", contribution: "1.0" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function addMuscle() {
    const unused = ALL_MUSCLES.find((m) => !muscleEntries.some((e) => e.muscle === m));
    if (unused) setMuscleEntries((p) => [...p, { muscle: unused, contribution: "0.5" }]);
  }

  function updateMuscle(i: number, update: Partial<MuscleEntry>) {
    setMuscleEntries((p) => p.map((e, idx) => idx === i ? { ...e, ...update } : e));
  }

  function removeMuscle(i: number) {
    setMuscleEntries((p) => p.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    if (!name.trim()) { setError("Exercise name is required."); return; }
    if (muscleEntries.length === 0) { setError("Add at least one muscle."); return; }

    setLoading(true);
    setError("");

    const data = loadData();
    const ex = {
      id: makeId("exercise"),
      name: name.trim(),
      category,
      is_bodyweight: isBodyweight,
      custom: true,
    };

    const musclesInsert = muscleEntries.map((e) => ({
      id: makeId("muscle"),
      exercise_id: ex.id,
      muscle: e.muscle,
      contribution: parseFloat(e.contribution) || 1.0,
    }));

    saveData({
      ...data,
      exercises: [...data.exercises, ex],
      exerciseMuscles: [...data.exerciseMuscles, ...musclesInsert],
    });

    router.push(`/exercises/${ex.id}`);
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="font-condensed font-800 text-2xl tracking-wide">New Exercise</h1>
        <button onClick={handleSave} disabled={loading} className="btn btn-primary">
          {loading ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <div className="card-sm p-3 border-red-500/20 bg-red-500/8 text-red-400 text-sm">{error}</div>
      )}

      <div className="card p-4 space-y-4">
        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">Name</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Romanian Deadlift"
          />
        </div>

        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">Category</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="bw"
            type="checkbox"
            checked={isBodyweight}
            onChange={(e) => setIsBodyweight(e.target.checked)}
            className="w-4 h-4 rounded accent-orange-500"
          />
          <label htmlFor="bw" className="text-sm text-zinc-300">
            Bodyweight exercise (e.g. pull-ups, dips)
          </label>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <p className="section-label">Primary Muscles</p>
        {muscleEntries.map((entry, i) => (
          <div key={i} className="flex gap-2 items-center">
            <select
              className="input flex-1"
              value={entry.muscle}
              onChange={(e) => updateMuscle(i, { muscle: e.target.value as MuscleGroup })}
            >
              {ALL_MUSCLES.map((m) => (
                <option key={m} value={m}>{MUSCLE_LABELS[m]}</option>
              ))}
            </select>
            <input
              className="input w-20 text-center font-mono"
              type="number"
              min="0.1"
              max="1"
              step="0.1"
              value={entry.contribution}
              onChange={(e) => updateMuscle(i, { contribution: e.target.value })}
              title="Contribution (0.1–1.0)"
            />
            {muscleEntries.length > 1 && (
              <button onClick={() => removeMuscle(i)} className="btn btn-danger px-3 py-2">✕</button>
            )}
          </div>
        ))}
        <p className="text-xs text-zinc-600">Contribution: 1.0 = primary, 0.5 = secondary</p>
        <button onClick={addMuscle} className="btn btn-ghost w-full text-sm">
          + Add muscle
        </button>
      </div>

      <button onClick={handleSave} disabled={loading} className="btn btn-primary w-full py-3">
        {loading ? "Saving…" : "Create exercise"}
      </button>
    </div>
  );
}
