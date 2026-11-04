import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CLOUD_STATE_ID = process.env.NEXT_PUBLIC_GYM_ATLAS_STATE_ID || "default";

export async function GET() {
  const client = createAdminClient();
  if (!client) return NextResponse.json({ error: "Cloud sync is not configured" }, { status: 503 });

  const { data: row, error } = await client
    .from("app_state")
    .select("data, updated_at")
    .eq("id", CLOUD_STATE_ID)
    .maybeSingle();

  if (error) {
    console.error("GymATLAS state read failed", error);
    return NextResponse.json({ error: "Could not read state" }, { status: 502 });
  }

  return NextResponse.json(row ?? { data: null, updated_at: null });
}

export async function PUT(request: NextRequest) {
  const client = createAdminClient();
  if (!client) return NextResponse.json({ error: "Cloud sync is not configured" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as {
    data?: Record<string, unknown>;
    updated_at?: unknown;
  } | null;
  const data = body?.data;
  const updatedAt = body?.updated_at;

  // A malformed write would replace the only cloud copy of the history.
  const isValid =
    typeof updatedAt === "string" &&
    !Number.isNaN(Date.parse(updatedAt)) &&
    Array.isArray(data?.exercises) &&
    Array.isArray(data?.exerciseMuscles) &&
    Array.isArray(data?.workouts) &&
    Array.isArray(data?.sets);
  if (!isValid) return NextResponse.json({ error: "Invalid state" }, { status: 400 });

  const { error } = await client
    .from("app_state")
    .upsert({ id: CLOUD_STATE_ID, data, updated_at: updatedAt });

  if (error) {
    console.error("GymATLAS state write failed", error);
    return NextResponse.json({ error: "Could not save state" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
