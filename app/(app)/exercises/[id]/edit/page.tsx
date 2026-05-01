"use client";

import { useState, useEffect, useCallback } from "react";
import { loadData, makeId, saveData } from "@/lib/local-store";
import { useRouter, useParams } from "next/navigation";
import { ALL_MUSCLES, MUSCLE_LABELS } from "@/types";
import type { MuscleGroup } from "@/types";
import Link from "next/link";

const CATEGORIES = ["Push", "Pull", "Legs", "Shoulders", "Arms", "Core", "Cardio", "Other"];

type MuscleEntry = { id?: string; muscle: MuscleGroup; contribution: string };

export default function EditExercisePage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("Push");
  const [isBodyweight, setIsBodyweight] = useState(false);
  const [muscleEntries, setMuscleEntries] = useState<MuscleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const data = loadData();
    const ex = data.exercises.find((item) => item.id === id);

    if (!ex) { router.push("/exercises"); return; }

    setName(ex.name);
    setCategory(ex.category ?? "Other");
    setIsBodyweight(ex.is_bodyweight);
    setMuscleEntries(
      data.exerciseMuscles.filter((m) => m.exercise_id === id).map((m) => ({
        id: m.id,
        muscle: m.muscle as MuscleGroup,
        contribution: m.contribution.toString(),
      }))
    );
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

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
    if (!name.trim()) { setError("Name is required."); return; }
    setSaving(true); setError("");

    const data = loadData();
    const musclesInsert = muscleEntries.map((e) => ({
      id: e.id ?? makeId("muscle"),
      exercise_id: id,
      muscle: e.muscle,
      contribution: parseFloat(e.contribution) || 1.0,
    }));

    saveData({
      ...data,
      exercises: data.exercises.map((ex) =>
        ex.id === id ? { ...ex, name: name.trim(), category, is_bodyweight: isBodyweight, custom: true } : ex
      ),
      exerciseMuscles: [
        ...data.exerciseMuscles.filter((m) => m.exercise_id !== id),
        ...musclesInsert,
      ],
    });

    router.push(`/exercises/${id}`);
  }

  async function handleDelete() {
    if (!confirm("Delete this exercise? This cannot be undone.")) return;
    const data = loadData();
    saveData({
      ...data,
      exercises: data.exercises.filter((ex) => ex.id !== id),
      exerciseMuscles: data.exerciseMuscles.filter((m) => m.exercise_id !== id),
      sets: data.sets.filter((set) => set.exercise_id !== id),
    });
    router.push("/exercises");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/exercises/${id}`} className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 mb-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </Link>
          <h1 className="font-condensed font-800 text-2xl tracking-wide">Edit Exercise</h1>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <div className="card-sm p-3 border-red-500/20 bg-red-500/8 text-red-400 text-sm">{error}</div>
      )}

      <div className="card p-4 space-y-4">
        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
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
          <label htmlFor="bw" className="text-sm text-zinc-300">Bodyweight exercise</label>
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
            />
            {muscleEntries.length > 1 && (
              <button onClick={() => removeMuscle(i)} className="btn btn-danger px-3 py-2">✕</button>
            )}
          </div>
        ))}
        <button onClick={addMuscle} className="btn btn-ghost w-full text-sm">+ Add muscle</button>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full py-3">
        {saving ? "Saving…" : "Save changes"}
      </button>

      <div className="card p-4">
        <p className="section-label">Danger Zone</p>
        <button onClick={handleDelete} className="btn btn-danger w-full">Delete exercise</button>
      </div>
    </div>
  );
}
