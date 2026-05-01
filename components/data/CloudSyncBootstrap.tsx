"use client";

import { useEffect, useState } from "react";
import { isCloudSyncEnabled, syncCloudData } from "@/lib/local-store";

export default function CloudSyncBootstrap() {
  const [status, setStatus] = useState<"idle" | "syncing" | "offline" | "synced">("idle");

  useEffect(() => {
    let mounted = true;

    async function runSync() {
      if (!isCloudSyncEnabled()) {
        setStatus("offline");
        return;
      }

      setStatus("syncing");
      const result = await syncCloudData();
      if (!mounted) return;

      setStatus(result.mode === "cloud" ? "synced" : "offline");
      if (result.changed) window.location.reload();
    }

    runSync();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === "idle" || status === "synced") return null;

  return (
    <div className="fixed left-1/2 top-3 z-50 -translate-x-1/2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-600 text-slate-600 shadow-sm">
      {status === "syncing" ? "Syncing…" : "Local mode"}
    </div>
  );
}
