import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Session =
  | { role: "TEACHER" | "PARENT"; userId: string; name: string }
  | { role: "KID"; kidId: string; name: string };

const COOKIE = "ms_session";

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
  return new TextEncoder().encode(s);
}

export async function setSession(session: Session) {
  const token = await new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(session.role === "KID" ? "12h" : "30d")
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.role === "KID" ? 60 * 60 * 12 : 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function requireTeacher() {
  const s = await getSession();
  if (!s || s.role !== "TEACHER") redirect("/teacher/login");
  return s;
}

export async function requireParent() {
  const s = await getSession();
  if (!s || s.role !== "PARENT") redirect("/parent/login");
  return s;
}

export async function requireKid() {
  const s = await getSession();
  if (!s || s.role !== "KID") redirect("/kid/login");
  return s;
}
