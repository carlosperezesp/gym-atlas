"use client";

import { useState, type FormEvent } from "react";
import { safeNextPath } from "@/lib/access";

export default function UnlockPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });

      if (response.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.assign(safeNextPath(next));
        return;
      }

      setError(
        response.status === 401
          ? "Código incorrecto."
          : response.status === 503
            ? "Falta configurar APP_PASSCODE en Vercel."
            : "No se ha podido comprobar el código."
      );
    } catch {
      setError("Sin conexión. Inténtalo de nuevo.");
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="card p-5 w-full max-w-sm space-y-4">
        <div>
          <h1 className="font-condensed text-3xl font-bold tracking-wide">GymATLAS</h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Introduce tu código de acceso.
          </p>
        </div>
        <input
          type="password"
          className="input"
          aria-label="Código de acceso"
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          required
          value={passcode}
          onChange={(event) => setPasscode(event.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Comprobando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
