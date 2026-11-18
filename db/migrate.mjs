// Applies db/schema.sql to DATABASE_URL. Run: npm run db:migrate
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const sql = postgres(url, { ssl: url.includes("localhost") ? false : "require", max: 1 });
const schema = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "schema.sql"), "utf8");
await sql.unsafe(schema);
console.log("Schema applied.");
await sql.end();
