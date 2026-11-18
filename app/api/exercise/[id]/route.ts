import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { ExerciseError, gradeExercise } from "@/lib/exercises";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || s.role !== "KID") return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  try {
    return NextResponse.json(await gradeExercise(s.kidId, id, body.responses));
  } catch (e) {
    if (e instanceof ExerciseError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
