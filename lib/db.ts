import postgres from "postgres";
import { randomBytes } from "node:crypto";

// Connects lazily on first query, so builds work before DATABASE_URL is configured.
const url = process.env.DATABASE_URL || "postgres://not-configured@localhost:1/missing";

const globalForDb = globalThis as unknown as { sql?: postgres.Sql };

export const sql =
  globalForDb.sql ??
  postgres(url, {
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
    max: 5,
    idle_timeout: 20,
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export function newId(): string {
  return randomBytes(12).toString("base64url");
}

// Short human-friendly code without look-alike characters.
export function newCode(len = 6): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// Calendar day in India Standard Time, used for streaks and mastery days.
export function dayKey(d: Date = new Date()): string {
  const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}
