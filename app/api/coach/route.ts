import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MODEL = "claude-opus-5-5";

const SYSTEM_PROMPT = `Eres el entrenador personal del dueño de GymATLAS, su app de gimnasio. Te escribe desde el móvil, a menudo en mitad de la sesión, para contarte cómo se encuentra o qué ha cambiado ("me molesta el hombro", "hoy solo tengo 40 minutos", "el banca ha salido muy fácil").

Cómo entrena:
- Cada ejercicio: 1-2 series de aproximación subiendo peso y una última serie fuerte, cerca del fallo. No usa RPE.
- Progresión doble sobre la serie fuerte: rango 6-10 reps en básicos y 8-12 en accesorios. Al llegar al máximo del rango sube peso; si no, mismo peso y más reps.
- Saltos de carga: mancuernas de 1 en 1 kg hasta 10 kg y luego de 2 en 2; barra de 2,5 en 2,5; máquinas según su historial.

En cada mensaje recibes un bloque <contexto> con el plan de hoy, lo que ya ha hecho hoy, su historial reciente, el catálogo de ejercicios con sus ids y sus notas permanentes. Básate en esos datos; si algo no está ahí, no lo inventes.

Cómo responder:
- "reply": en español, cercano y directo, 1-4 frases. Lo va a leer entre series.
- "plan": solo si su mensaje pide o justifica cambiar lo que queda de la sesión de hoy. Devuelve la sesión completa ajustada (incluidos los ejercicios ya hechos, tal como estaban), usando únicamente exercise_id del catálogo. Cada ejercicio lleva sus series en orden, con la serie fuerte la última, y "reps" como texto ("8" o "6-8"). weight_kg es null para peso corporal sin lastre. Si no hace falta cambiar nada, "plan" es null.
- "remember": hechos duraderos que conviene recordar en futuras sesiones (molestias o lesiones, preferencias, material del gimnasio). Nada pasajero como "hoy tengo prisa". Si no hay nada nuevo, lista vacía.

Si describe un dolor agudo, punzante o que va a más, dile que pare ese ejercicio y que lo consulte con un profesional; no diagnostiques.`;

const ResponseSchema = z.object({
  reply: z.string(),
  plan: z
    .object({
      exercises: z.array(
        z.object({
          exercise_id: z.string(),
          note: z.string(),
          sets: z.array(z.object({ weight_kg: z.number().nullable(), reps: z.string() })),
        })
      ),
    })
    .nullable(),
  remember: z.array(z.string()),
});

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "plan", "remember"],
  properties: {
    reply: { type: "string" },
    plan: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["exercises"],
          properties: {
            exercises: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["exercise_id", "note", "sets"],
                properties: {
                  exercise_id: { type: "string" },
                  note: { type: "string" },
                  sets: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: ["weight_kg", "reps"],
                      properties: {
                        weight_kg: { anyOf: [{ type: "number" }, { type: "null" }] },
                        reps: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
    remember: { type: "array", items: { type: "string" } },
  },
} as const;

const RequestSchema = z.object({
  context: z.string().max(60_000),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().min(1).max(4_000) }))
    .min(1)
    .max(40),
});

export type CoachResponse = z.infer<typeof ResponseSchema>;

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 503 });
  }

  const body = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!body.success || body.data.messages.at(-1)?.role !== "user") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Only the newest turn carries the context block, so the snapshot always
  // reflects the sets logged since the previous message.
  const { context, messages } = body.data;
  const apiMessages: Anthropic.Beta.BetaMessageParam[] = messages.map((message, index) => ({
    role: message.role,
    content:
      index === messages.length - 1
        ? `<contexto>\n${context}\n</contexto>\n\n${message.text}`
        : message.text,
  }));

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      // Replies are read between sets on a phone: low effort keeps them quick,
      // and adjusting one session doesn't need deep reasoning.
      output_config: {
        effort: "low",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: apiMessages,
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({
        reply: "No puedo ayudarte con eso. Prueba a contármelo de otra forma.",
        plan: null,
        remember: [],
      } satisfies CoachResponse);
    }

    const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed = ResponseSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      console.error("GymATLAS coach returned an unexpected shape", parsed.error);
      return NextResponse.json({ error: "Unexpected coach response" }, { status: 502 });
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("GymATLAS coach API error", error.status, error.message);
      return NextResponse.json({ error: "Coach unavailable" }, { status: 502 });
    }
    if (error instanceof SyntaxError) {
      console.error("GymATLAS coach returned invalid JSON", error);
      return NextResponse.json({ error: "Unexpected coach response" }, { status: 502 });
    }
    throw error;
  }
}
