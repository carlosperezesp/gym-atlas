"use client";

import { useState, type FormEvent } from "react";
import {
  loadData,
  saveData,
  type CoachMessage,
  type CoachPlanExercise,
  type LocalData,
  type LocalExercise,
} from "@/lib/local-store";
import { formatLoad } from "@/lib/progression";

type CoachReply = {
  reply: string;
  plan: { exercises: CoachPlanExercise[] } | null;
  remember: string[];
};

// Older turns are trimmed so a long session stays fast and cheap; the context
// block already carries everything logged so far.
const MAX_TURNS_SENT = 16;

export default function CoachPanel({
  todayKey,
  context,
  exercisesById,
  onDataChange,
}: {
  todayKey: string;
  context: string;
  exercisesById: Record<string, LocalExercise>;
  onDataChange: (data: LocalData) => void;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const coach = loadData().coach;
  const messages = coach?.chat?.date === todayKey ? coach.chat.messages : [];
  const notes = coach?.notes ?? [];
  const appliedToday = coach?.override?.date === todayKey;

  function updateCoach(update: (current: NonNullable<LocalData["coach"]>) => NonNullable<LocalData["coach"]>) {
    const data = loadData();
    const next = { ...data, coach: update(data.coach ?? { notes: [] }) };
    saveData(next);
    onDataChange(loadData());
  }

  function appendMessage(message: CoachMessage) {
    updateCoach((current) => {
      const chat = current.chat?.date === todayKey ? current.chat.messages : [];
      return { ...current, chat: { date: todayKey, messages: [...chat, message] } };
    });
  }

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setError("");
    setDraft("");
    const history = [...messages, { role: "user" as const, text }];
    appendMessage({ role: "user", text });

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context,
          messages: history.slice(-MAX_TURNS_SENT).map(({ role, text }) => ({ role, text })),
        }),
      });

      if (!response.ok) {
        setError(
          response.status === 503
            ? "Falta configurar la clave de Claude en Vercel."
            : response.status === 429
              ? "Demasiadas peticiones seguidas. Espera un momento."
              : "El coach no ha podido responder. Inténtalo otra vez."
        );
        return;
      }

      const reply = (await response.json()) as CoachReply;
      const plan = reply.plan?.exercises.filter((item) => exercisesById[item.exercise_id] && item.sets.length > 0) ?? null;
      const remembered = reply.remember.map((note) => note.trim()).filter(Boolean);

      appendMessage({ role: "assistant", text: reply.reply, plan: plan?.length ? plan : null, remembered });
      if (remembered.length > 0) {
        updateCoach((current) => ({
          ...current,
          notes: Array.from(new Set([...current.notes, ...remembered])),
        }));
      }
    } catch {
      setError("Sin conexión. Inténtalo otra vez.");
    } finally {
      setSending(false);
    }
  }

  function applyPlan(plan: CoachPlanExercise[]) {
    updateCoach((current) => ({ ...current, override: { date: todayKey, exercises: plan } }));
  }

  function removeNote(note: string) {
    updateCoach((current) => ({ ...current, notes: current.notes.filter((item) => item !== note) }));
  }

  const lastPlanIndex = messages.findLastIndex((message) => message.role === "assistant" && message.plan);

  return (
    <section>
      <p className="section-label">Coach</p>
      <div className="card p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-zinc-500">
            Cuéntale cómo vas: &ldquo;me molesta el hombro&rdquo;, &ldquo;solo tengo 40 minutos&rdquo;, &ldquo;el banca ha
            salido muy fácil&rdquo;. Te ajusta el plan de hoy.
          </p>
        )}

        {messages.length > 0 && (
          <div className="space-y-2">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "flex justify-end" : "space-y-2"}>
                <p
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm ${
                    message.role === "user" ? "bg-accent text-white" : "bg-white text-zinc-200"
                  }`}
                >
                  {message.text}
                </p>
                {message.remembered && message.remembered.length > 0 && (
                  <p className="text-xs text-zinc-500">Anotado: {message.remembered.join(" · ")}</p>
                )}
                {message.plan && (
                  <div className="card-sm space-y-1.5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Plan propuesto</p>
                    {message.plan.map((item) => (
                      <p key={item.exercise_id} className="text-sm text-zinc-200">
                        <span className="font-semibold">{exercisesById[item.exercise_id]?.name}</span>{" "}
                        <span className="font-mono text-zinc-500">
                          {item.sets.map((set) => `${set.weight_kg === null ? "BW" : formatLoad(set.weight_kg)}×${set.reps}`).join(" → ")}
                        </span>
                      </p>
                    ))}
                    {index === lastPlanIndex && (
                      <button type="button" onClick={() => applyPlan(message.plan!)} className="btn btn-primary mt-1 w-full text-sm">
                        {appliedToday ? "Volver a aplicar este plan" : "Aplicar al plan de hoy"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {sending && <p className="text-sm text-zinc-500">Pensando…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            className="input"
            placeholder="¿Cómo vas?"
            aria-label="Mensaje para el coach"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !draft.trim()}>
            Enviar
          </button>
        </form>

        {notes.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Lo que el coach recuerda</p>
            <div className="flex flex-wrap gap-1.5">
              {notes.map((note) => (
                <span key={note} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-zinc-300">
                  {note}
                  <button type="button" onClick={() => removeNote(note)} aria-label={`Olvidar: ${note}`} className="text-zinc-500">
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
