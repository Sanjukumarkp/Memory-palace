"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql, newId, newCode } from "@/lib/db";
import { clearSession, getSession, requireKid, requireParent, requireTeacher, setSession } from "@/lib/auth";
import { ensureProgress } from "@/lib/progress";
import type { AgeBand } from "@/lib/modules";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// ---------- Teacher & parent accounts ----------
export async function signup(role: "TEACHER" | "PARENT", _: FormState, f: FormData): Promise<FormState> {
  const name = str(f, "name");
  const email = str(f, "email").toLowerCase();
  const password = str(f, "password");
  const code = str(f, "code").toUpperCase();
  if (!name || !emailOk(email)) return { error: "Enter your name and a valid email." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  let kidId: string | null = null;
  if (role === "PARENT") {
    const [kid] = await sql<{ id: string }[]>`SELECT id FROM kids WHERE parent_code = ${code}`;
    if (!kid) return { error: "That child code wasn't found. Ask the teacher for your child's parent code." };
    kidId = kid.id;
  }
  const [exists] = await sql`SELECT 1 FROM users WHERE email = ${email}`;
  if (exists) return { error: "An account with this email already exists. Please log in." };

  const id = newId();
  await sql`INSERT INTO users (id, role, name, email, password_hash) VALUES (${id}, ${role}, ${name}, ${email}, ${await bcrypt.hash(password, 10)})`;
  if (kidId) await sql`INSERT INTO parent_kids (parent_id, kid_id) VALUES (${id}, ${kidId}) ON CONFLICT DO NOTHING`;
  await setSession({ role, userId: id, name });
  redirect(role === "TEACHER" ? "/teacher" : "/parent");
}

export async function login(role: "TEACHER" | "PARENT", _: FormState, f: FormData): Promise<FormState> {
  const email = str(f, "email").toLowerCase();
  const password = str(f, "password");
  const [u] = await sql<{ id: string; name: string; password_hash: string }[]>`
    SELECT id, name, password_hash FROM users WHERE email = ${email} AND role = ${role}`;
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return { error: "Email or password is incorrect." };
  await setSession({ role, userId: u.id, name: u.name });
  redirect(role === "TEACHER" ? "/teacher" : "/parent");
}

export async function logout() {
  const s = await getSession();
  await clearSession();
  redirect(s?.role === "KID" ? "/kid/login" : "/");
}

// ---------- Teacher: classes and kids ----------
export async function createClass(_: FormState, f: FormData): Promise<FormState> {
  const t = await requireTeacher();
  const name = str(f, "name");
  if (!name) return { error: "Give the class a name." };
  let code = newCode();
  while ((await sql`SELECT 1 FROM classrooms WHERE code = ${code}`).length) code = newCode();
  await sql`INSERT INTO classrooms (id, name, code, teacher_id) VALUES (${newId()}, ${name}, ${code}, ${t.userId})`;
  revalidatePath("/teacher");
  return { ok: `Class "${name}" created.` };
}

async function ownClass(teacherId: string, classId: string) {
  const [c] = await sql`SELECT id FROM classrooms WHERE id = ${classId} AND teacher_id = ${teacherId}`;
  return Boolean(c);
}

async function ownKid(teacherId: string, kidId: string) {
  const [k] = await sql`SELECT k.id FROM kids k JOIN classrooms c ON c.id = k.classroom_id WHERE k.id = ${kidId} AND c.teacher_id = ${teacherId}`;
  return Boolean(k);
}

export async function addKid(classId: string, _: FormState, f: FormData): Promise<FormState> {
  const t = await requireTeacher();
  if (!(await ownClass(t.userId, classId))) return { error: "Class not found." };
  const name = str(f, "name");
  const band = str(f, "band") as AgeBand;
  const pin = str(f, "pin");
  if (!name || name.length > 40) return { error: "Enter the child's first name." };
  if (!["JUNIOR", "MIDDLE", "SENIOR"].includes(band)) return { error: "Pick an age group." };
  if (!/^\d{4}$/.test(pin)) return { error: "PIN must be 4 digits." };
  const [dup] = await sql`SELECT 1 FROM kids WHERE classroom_id = ${classId} AND lower(name) = lower(${name})`;
  if (dup) return { error: "A child with this name is already in the class. Add an initial, e.g. 'Riya S'." };
  let parentCode = newCode(8);
  while ((await sql`SELECT 1 FROM kids WHERE parent_code = ${parentCode}`).length) parentCode = newCode(8);
  const id = newId();
  await sql`INSERT INTO kids (id, name, pin_hash, age_band, parent_code, classroom_id)
    VALUES (${id}, ${name}, ${await bcrypt.hash(pin, 10)}, ${band}, ${parentCode}, ${classId})`;
  await ensureProgress(id);
  revalidatePath(`/teacher/class/${classId}`);
  return { ok: `${name} added. Parent code: ${parentCode}` };
}

export async function resetPin(kidId: string, _: FormState, f: FormData): Promise<FormState> {
  const t = await requireTeacher();
  if (!(await ownKid(t.userId, kidId))) return { error: "Child not found." };
  const pin = str(f, "pin");
  if (!/^\d{4}$/.test(pin)) return { error: "PIN must be 4 digits." };
  await sql`UPDATE kids SET pin_hash = ${await bcrypt.hash(pin, 10)}, pin_failures = 0, pin_locked_until = NULL WHERE id = ${kidId}`;
  return { ok: "PIN updated." };
}

export async function unlockNextModule(kidId: string) {
  const t = await requireTeacher();
  if (!(await ownKid(t.userId, kidId))) return;
  const rows = await sql<{ module: number; status: string }[]>`SELECT module, status FROM module_progress WHERE kid_id = ${kidId} ORDER BY module`;
  const active = rows.find((r) => r.status === "ACTIVE");
  if (active) {
    await sql`UPDATE module_progress SET status = 'MASTERED', mastered_at = now() WHERE kid_id = ${kidId} AND module = ${active.module}`;
    const next = rows.find((r) => r.module > active.module && r.status === "LOCKED");
    if (next) await sql`UPDATE module_progress SET status = 'ACTIVE' WHERE kid_id = ${kidId} AND module = ${next.module}`;
  }
  revalidatePath(`/teacher/kid/${kidId}`);
}

export async function removeKid(kidId: string, classId: string) {
  const t = await requireTeacher();
  if (!(await ownKid(t.userId, kidId))) return;
  await sql`DELETE FROM kids WHERE id = ${kidId}`;
  redirect(`/teacher/class/${classId}`);
}

// ---------- Parent ----------
export async function linkChild(_: FormState, f: FormData): Promise<FormState> {
  const p = await requireParent();
  const code = str(f, "code").toUpperCase();
  const [kid] = await sql<{ id: string; name: string }[]>`SELECT id, name FROM kids WHERE parent_code = ${code}`;
  if (!kid) return { error: "That code wasn't found." };
  await sql`INSERT INTO parent_kids (parent_id, kid_id) VALUES (${p.userId}, ${kid.id}) ON CONFLICT DO NOTHING`;
  revalidatePath("/parent");
  return { ok: `${kid.name} added.` };
}

// ---------- Kid ----------
export async function kidLogin(_: FormState, f: FormData): Promise<FormState> {
  const code = str(f, "code").toUpperCase();
  const name = str(f, "name");
  const pin = str(f, "pin");
  const [kid] = await sql<{ id: string; name: string; pin_hash: string; pin_failures: number; pin_locked_until: Date | null }[]>`
    SELECT k.id, k.name, k.pin_hash, k.pin_failures, k.pin_locked_until FROM kids k
    JOIN classrooms c ON c.id = k.classroom_id
    WHERE c.code = ${code} AND lower(k.name) = lower(${name})`;
  if (!kid) return { error: "We couldn't find you. Check your class code and name." };
  if (kid.pin_locked_until && kid.pin_locked_until > new Date())
    return { error: "Too many wrong PINs. Wait 10 minutes or ask your teacher." };
  if (!(await bcrypt.compare(pin, kid.pin_hash))) {
    const fails = kid.pin_failures + 1;
    await sql`UPDATE kids SET pin_failures = ${fails >= 5 ? 0 : fails},
      pin_locked_until = ${fails >= 5 ? new Date(Date.now() + 10 * 60 * 1000) : null} WHERE id = ${kid.id}`;
    return { error: "That PIN isn't right. Try again." };
  }
  await sql`UPDATE kids SET pin_failures = 0, pin_locked_until = NULL WHERE id = ${kid.id}`;
  await setSession({ role: "KID", kidId: kid.id, name: kid.name });
  redirect("/kid");
}

export async function classNames(code: string): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`
    SELECT k.name FROM kids k JOIN classrooms c ON c.id = k.classroom_id WHERE c.code = ${code.trim().toUpperCase()} ORDER BY k.name`;
  return rows.map((r) => r.name);
}

export async function savePalace(spots: string[]): Promise<FormState> {
  const k = await requireKid();
  const clean = spots.map((s) => s.trim()).filter(Boolean).slice(0, 25);
  if (new Set(clean.map((s) => s.toLowerCase())).size !== clean.length) return { error: "Each spot needs a different name." };
  if (clean.length < 3) return { error: "Add at least 3 spots." };
  await sql`UPDATE kids SET palace_spots = ${clean} WHERE id = ${k.kidId}`;
  return { ok: "Palace saved!" };
}
