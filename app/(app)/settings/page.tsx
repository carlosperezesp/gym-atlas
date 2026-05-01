"use client";

import { useState, useEffect, useCallback } from "react";
import { defaultData, loadData, resetLocalData, saveData } from "@/lib/local-store";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  const [bodweight, setBodyweight] = useState("");
  const [greenDays, setGreenDays] = useState("3");
  const [yellowDays, setYellowDays] = useState("7");
  const [orangeDays, setOrangeDays] = useState("14");
  const [windowDays, setWindowDays] = useState("60");
  const [topSets, setTopSets] = useState("3");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    const data = loadData();
    setBodyweight(data.settings.bodyweight_kg?.toString() ?? "");
    setGreenDays(data.settings.freshness_green_days?.toString() ?? "3");
    setYellowDays(data.settings.freshness_yellow_days?.toString() ?? "7");
    setOrangeDays(data.settings.freshness_orange_days?.toString() ?? "14");
    setWindowDays(data.settings.current_level_window_days?.toString() ?? "60");
    setTopSets(data.settings.current_level_top_sets?.toString() ?? "3");
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    setSaving(true);
    setSuccess(false);

    const data = loadData();
    saveData({
      ...data,
      settings: {
        bodyweight_kg: bodweight ? parseFloat(bodweight) : null,
        freshness_green_days: parseInt(greenDays) || 3,
        freshness_yellow_days: parseInt(yellowDays) || 7,
        freshness_orange_days: parseInt(orangeDays) || 14,
        current_level_window_days: parseInt(windowDays) || 60,
        current_level_top_sets: parseInt(topSets) || 3,
      },
    });

    setSuccess(true);
    router.refresh();
    setSaving(false);
  }

  function handleReset() {
    if (!confirm("Reset all local workouts and custom exercises? This cannot be undone.")) return;
    resetLocalData();
    const fresh = defaultData();
    setBodyweight(fresh.settings.bodyweight_kg?.toString() ?? "");
    setGreenDays(fresh.settings.freshness_green_days.toString());
    setYellowDays(fresh.settings.freshness_yellow_days.toString());
    setOrangeDays(fresh.settings.freshness_orange_days.toString());
    setWindowDays(fresh.settings.current_level_window_days.toString());
    setTopSets(fresh.settings.current_level_top_sets.toString());
    setSuccess(true);
    router.refresh();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <h1 className="font-condensed font-800 text-2xl tracking-wide">Settings</h1>

      {success && (
        <div className="card-sm p-3 border-green-500/20 bg-green-500/8 text-green-400 text-sm">
          Settings saved.
        </div>
      )}

      {/* Body */}
      <div className="card p-4 space-y-4">
        <p className="section-label">Body</p>
        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">
            Bodyweight (kg)
          </label>
          <input
            className="input"
            type="number"
            step="0.5"
            min="30"
            max="250"
            placeholder="e.g. 75"
            value={bodweight}
            onChange={(e) => setBodyweight(e.target.value)}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Used for bodyweight exercise calculations (pull-ups, dips).
          </p>
        </div>
      </div>

      {/* Freshness */}
      <div className="card p-4 space-y-4">
        <p className="section-label">Muscle Freshness Thresholds (days)</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-green-500 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Green
            </label>
            <input
              className="input text-center font-mono"
              type="number"
              min="1"
              value={greenDays}
              onChange={(e) => setGreenDays(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-yellow-500 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              Yellow
            </label>
            <input
              className="input text-center font-mono"
              type="number"
              min="1"
              value={yellowDays}
              onChange={(e) => setYellowDays(e.target.value)}
            />
          </div>
          <div>
            <label className="flex items-center gap-1.5 text-xs font-600 uppercase tracking-wide text-orange-500 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              Orange
            </label>
            <input
              className="input text-center font-mono"
              type="number"
              min="1"
              value={orangeDays}
              onChange={(e) => setOrangeDays(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-zinc-600">
          Red = more than {orangeDays} days. Gray = never trained.
        </p>
      </div>

      {/* Strength level */}
      <div className="card p-4 space-y-4">
        <p className="section-label">Strength Level Calculation</p>
        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">
            Recent window (days)
          </label>
          <input
            className="input"
            type="number"
            min="14"
            max="365"
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value)}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Sets older than this are excluded from current level.
          </p>
        </div>
        <div>
          <label className="block text-xs font-600 uppercase tracking-wide text-zinc-400 mb-1.5">
            Top sets used
          </label>
          <input
            className="input"
            type="number"
            min="1"
            max="10"
            value={topSets}
            onChange={(e) => setTopSets(e.target.value)}
          />
          <p className="text-xs text-zinc-600 mt-1">
            Average of your top N e1RM sets in the window.
          </p>
        </div>
      </div>

      <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full py-3">
        {saving ? "Saving…" : "Save settings"}
      </button>

      <div className="card p-4">
        <p className="section-label">Local Data</p>
        <p className="text-xs text-zinc-600 mb-3">
          Data is stored only in this browser.
        </p>
        <button onClick={handleReset} className="btn btn-danger w-full">
          Reset local data
        </button>
      </div>
    </div>
  );
}
