import { sql } from "./db";
import { MODULES } from "./modules";
import { baselineAndLatest, practiceDays, streakFrom } from "./progress";

export type Badge = { key: string; icon: string; title: string; detail: string; earned: boolean };

function longestStreak(days: string[]) {
  const sorted = [...days].sort();
  let best = 0, run = 0, prev: number | null = null;
  for (const d of sorted) {
    const t = Date.parse(d + "T00:00:00Z");
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

export async function badgesFor(kidId: string): Promise<Badge[]> {
  const [days, base, mastered, cards] = await Promise.all([
    practiceDays(kidId),
    baselineAndLatest(kidId),
    sql<{ module: number }[]>`SELECT module FROM module_progress WHERE kid_id = ${kidId} AND status = 'MASTERED'`,
    sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM review_items WHERE kid_id = ${kidId} AND box = 3`,
  ]);
  const longest = Math.max(longestStreak(days), streakFrom(days));
  const m = new Set(mastered.map((x) => x.module));
  return [
    { key: "first", icon: "🌱", title: "First practice", detail: "Practised for the first time", earned: days.length > 0 },
    { key: "s3", icon: "🔥", title: "3-day streak", detail: "Practised 3 days in a row", earned: longest >= 3 },
    { key: "s7", icon: "⚡", title: "7-day streak", detail: "Practised 7 days in a row", earned: longest >= 7 },
    { key: "s30", icon: "🌟", title: "30-day streak", detail: "Practised 30 days in a row", earned: longest >= 30 },
    { key: "cards", icon: "🗃️", title: "10 cards in Box 3", detail: "10 flashcards fully learned", earned: cards[0].n >= 10 },
    {
      key: "beat",
      icon: "📈",
      title: "Beat my first test",
      detail: "Scored higher than the first Memory Test",
      earned: base.baseline !== null && base.best !== null && base.best > base.baseline,
    },
    ...MODULES.map((mod) => ({
      key: `m${mod.id}`,
      icon: mod.icon,
      title: `${mod.title} master`,
      detail: `Mastered ${mod.title}`,
      earned: m.has(mod.id),
    })),
  ];
}
