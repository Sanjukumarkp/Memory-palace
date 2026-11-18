// Runs once per server start: makes sure the database tables exist (idempotent).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  try {
    const { applySchema } = await import("./lib/schema");
    await applySchema();
  } catch (err) {
    console.error("Database setup failed:", (err as Error).message);
  }
}
