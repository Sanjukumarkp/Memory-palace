import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canViewKid } from "@/lib/access";
import { coachNotes } from "@/lib/insight";

export async function GET(_req: Request, ctx: { params: Promise<{ kidId: string }> }) {
  const s = await getSession();
  if (!s || s.role === "KID") return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const { kidId } = await ctx.params;
  const kid = await canViewKid(s, kidId);
  if (!kid) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(await coachNotes(kid, s.role === "TEACHER" ? "teacher" : "parent"));
}
