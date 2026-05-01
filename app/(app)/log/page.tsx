"use client";

import { useState, useEffect, useCallback } from "react";
import { loadData, makeId, saveData, type LocalExercise } from "@/lib/local-store";
import { useRouter } from "next/navigation";

type SetEntry = {
  weight_kg: string;
  reps: string;
  rpe: string;
  notes: string;
};

type ExerciseBlock = {
  exercise_id: string;
  sets: SetEntry[];
};

const emptySet = (): SetEntry => ({ weight_kg: "", reps: "", rpe: "", notes: "" });
const emptyBlock = (): ExerciseBlock => ({ exercise_id: "", sets: [emptySet()] });

export default function LogPage() {
  const router = useRouter();

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([emptyBlock()]);
  const [exercises, setExercises] = useState<LocalExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedRpe, setExpandedRpe] = useState<Record<string, boolean>>({});

  const loadExercises = useCallback(async () => {
    setExercises([...loadData().exercises].sort((a, b) => a.name.localeCompare(b.name)));
  }, []);

  useEffect(() => { loadExercises(); }, [loadExercises]);

  function updateBlock(i: number, update: Partial<ExerciseBlock>) {
    setBlocks((prev) => prev.map((b, idx) => idx === i ? { ...b, ...update } : b));
  }

  function updateSet(blockIdx: number, setIdx: number, update: Partial<SetEntry>) {
    setBlocks((prev) =>
      prev.map((b, bi) =>
        bi !== blockIdx
          ? b
          : { ...b, sets: b.sets.map((s, si) => si === setIdx ? { ...s, ...update } : s) }
      )
    );
  }

  function addSet(blockIdx: number) {
    setBlocks((prev) =>
      prev.map((b, bi) =>
        bi !== blockIdx ? b : { ...b, sets: [...b.sets, emptySet()] }
      )
    );
  }

  function removeSet(blockIdx: number, setIdx: number) {
    setBlocks((prev) =>
      prev.map((b, bi) =>
        bi !== blockIdx
          ? b
          : { ...b, sets: b.sets.filter((_, si) => si !== setIdx) }
      )
    );
  }

  function addBlock() {
    setBlocks((prev) => [...prev, emptyBlock()]);
  }

  function removeBlock(i: number) {
    setBlocks((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setError("");

    // Validate
    for (const block of blocks) {
      if (!block.exercise_id) { setError("Select an exercise for each block."); return; }
      for (const s of block.sets) {
        if (!s.reps || parseInt(s.reps) < 1) { setError("All sets need at least 1 rep."); return; }
      }
    }

    setLoading(true);
    const data = loadData();
    const workout = {
      id: makeId("workout"),
      date,
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    const setsToInsert = blocks.flatMap((block) =>
      block.sets.map((s) => ({
        id: makeId("set"),
        workout_id: workout.id,
        exercise_id: block.exercise_id,
        weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : null,
        reps: parseInt(s.reps),
        rpe: s.rpe ? parseFloat(s.rpe) : null,
        notes: s.notes || null,
        created_at: new Date().toISOString(),
      }))
    );

    saveData({
      ...data,
      workouts: [...data.workouts, workout],
      sets: [...data.sets, ...setsToInsert],
    });

    router.push("/");
    router.refresh();
  }

  // Group exercises by category
  const byCategory: Record<string, LocalExercise[]> = {};
  for (const ex of exercises) {
    const cat = ex.category ?? "Other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(ex);
  }

  return (
    <div className="space-y-5 animate-fade-up pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-condensed font-800 text-2xl tracking-wide">Log Workout</h1>
        <button onClick={handleSave} disabled={loading} className="btn btn-primary">
          {loading ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <div className="card-sm p-3 border-red-500/20 bg-red-500/8 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Date & notes */}
      <div className="card p-4 space-y-3">
        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">Date</label>
          <input
            className="input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">Notes (optional)</label>
          <input
            className="input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. felt strong today"
          />
        </div>
      </div>

      {/* Exercise blocks */}
      {blocks.map((block, bi) => {
        const ex = exercises.find((e) => e.id === block.exercise_id);
        return (
          <div key={bi} className="card p-4 space-y-3">
            {/* Exercise selector */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">
                  Exercise {blocks.length > 1 ? bi + 1 : ""}
                </label>
                <select
                  className="input"
                  value={block.exercise_id}
                  onChange={(e) => updateBlock(bi, { exercise_id: e.target.value })}
                >
                  <option value="">Select exercise…</option>
                  {Object.entries(byCategory).sort().map(([cat, exs]) => (
                    <optgroup key={cat} label={cat}>
                      {exs.map((e) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              {blocks.length > 1 && (
                <button
                  onClick={() => removeBlock(bi)}
                  className="btn btn-danger mt-5 px-3 py-2.5 text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {ex?.is_bodyweight && (
              <p className="text-xs text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-2">
                Bodyweight exercise. Enter 0 for bodyweight only, or + for added weight, − for assistance.
              </p>
            )}

            {/* Sets */}
            <div className="space-y-2">
              <div className="grid text-xs font-600 uppercase tracking-wide text-zinc-500 mb-1"
                style={{ gridTemplateColumns: "1.2fr 1fr auto" }}>
                <span>Weight (kg)</span>
                <span>Reps</span>
                <span className="w-8" />
              </div>

              {block.sets.map((s, si) => (
                <div key={si} className="space-y-1.5">
                  <div className="grid gap-2 items-center"
                    style={{ gridTemplateColumns: "1.2fr 1fr auto" }}>
                    <input
                      className="input text-center font-mono"
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      value={s.weight_kg}
                      onChange={(e) => updateSet(bi, si, { weight_kg: e.target.value })}
                    />
                    <input
                      className="input text-center font-mono"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={s.reps}
                      onChange={(e) => updateSet(bi, si, { reps: e.target.value })}
                    />
                    <div className="flex gap-1">
                      <button
                        className="w-8 h-9 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-orange-400 text-xs flex items-center justify-center"
                        onClick={() => {
                          const key = `${bi}-${si}`;
                          setExpandedRpe((p) => ({ ...p, [key]: !p[key] }));
                        }}
                        title="RPE / notes"
                      >
                        ⋯
                      </button>
                      {block.sets.length > 1 && (
                        <button
                          className="w-8 h-9 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-500 hover:text-red-400 text-xs flex items-center justify-center"
                          onClick={() => removeSet(bi, si)}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {expandedRpe[`${bi}-${si}`] && (
                    <div className="grid grid-cols-2 gap-2 pl-0">
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">RPE (1–10)</label>
                        <input
                          className="input text-center font-mono text-sm"
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          placeholder="8"
                          value={s.rpe}
                          onChange={(e) => updateSet(bi, si, { rpe: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Notes</label>
                        <input
                          className="input text-sm"
                          placeholder="good form…"
                          value={s.notes}
                          onChange={(e) => updateSet(bi, si, { notes: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => addSet(bi)}
                className="btn btn-ghost w-full text-sm mt-1"
              >
                + Add set
              </button>
            </div>
          </div>
        );
      })}

      <button onClick={addBlock} className="btn btn-ghost w-full">
        + Add exercise
      </button>

      <button
        onClick={handleSave}
        disabled={loading}
        className="btn btn-primary w-full py-3 text-base"
      >
        {loading ? "Saving workout…" : "Save workout"}
      </button>
    </div>
  );
}
