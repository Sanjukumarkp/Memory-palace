import { sql } from "./db";
import type { Session } from "./auth";
import type { AgeBand } from "./modules";

export type KidRow = { id: string; name: string; age_band: AgeBand; parent_code: string; classroom_id: string; class_name: string };

// Teachers see kids in their classes; parents see only their own linked children.
export async function canViewKid(s: Session, kidId: string): Promise<KidRow | null> {
  if (s.role === "TEACHER") {
    const [k] = await sql<KidRow[]>`
      SELECT k.id, k.name, k.age_band, k.parent_code, k.classroom_id, c.name AS class_name
      FROM kids k JOIN classrooms c ON c.id = k.classroom_id
      WHERE k.id = ${kidId} AND c.teacher_id = ${s.userId}`;
    return k ?? null;
  }
  if (s.role === "PARENT") {
    const [k] = await sql<KidRow[]>`
      SELECT k.id, k.name, k.age_band, k.parent_code, k.classroom_id, c.name AS class_name
      FROM kids k JOIN classrooms c ON c.id = k.classroom_id
      JOIN parent_kids pk ON pk.kid_id = k.id
      WHERE k.id = ${kidId} AND pk.parent_id = ${s.userId}`;
    return k ?? null;
  }
  return null;
}
