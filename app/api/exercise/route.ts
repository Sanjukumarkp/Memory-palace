import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { createExercise, ExerciseError } from "@/lib/exercises";
import type { AgeBand } from "@/lib/modules";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "KID") return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const module = Number(body.module);
  const [kid] = await sql<{ id: string; name: string; age_band: AgeBand; palace_spots: string[] }[]>`
    SELECT id, name, age_band, palace_spots FROM kids WHERE id = ${s.kidId}`;
  if (!kid) return NextResponse.json({ error: "Account not found" }, { status: 404 });

  if (body.baseline) {
    const [done] = await sql`SELECT 1 FROM attempts WHERE kid_id = ${kid.id} AND kind = 'baseline'`;
    if (done) return NextResponse.json({ error: "You've already done your first Memory Test.", code: "bad_request" }, { status: 400 });
  }
  try {
    const ex = await createExercise(kid, body.review ? 2 : module, { baseline: Boolean(body.baseline), review: Boolean(body.review) });
    return NextResponse.json(ex);
  } catch (e) {
    if (e instanceof ExerciseError) return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
