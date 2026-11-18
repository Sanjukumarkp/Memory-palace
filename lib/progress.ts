import { sql, newId, dayKey } from "./db";
import {
  MODULES,
  MASTERY_DAYS,
  MASTERY_SCORE,
  REFRESH_BELOW,
  DAILY_TRIES,
  nextLevel,
  type AgeBand,
} from "./modules";

export type ProgressRow = { module: number; status: "LOCKED" | "ACTIVE" | "MASTERED"; level: number; mastered_at: Date | null };

export async function ensureProgress(kidId: string) {
  for (const m of MODULES) {
    await sql`
      INSERT INTO module_progress (kid_id, module, status)
      VALUES (${kidId}, ${m.id}, ${m.id === 1 ? "ACTIVE" : "LOCKED"})
      ON CONFLICT DO NOTHING`;
  }
}

export async function getProgress(kidId: string): Promise<ProgressRow[]> {
  await ensureProgress(kidId);
  return sql<ProgressRow[]>`SELECT module, status, level, mastered_at FROM module_progress WHERE kid_id = ${kidId} ORDER BY module`;
}

// Days (distinct) the child scored at least MASTERY_SCORE on a module.
export async function masteryDays(kidId: string, module: number): Promise<number> {
  const [r] = await sql<{ n: number }[]>`
    SELECT COUNT(DISTINCT day_key)::int AS n FROM attempts
    WHERE kid_id = ${kidId} AND module = ${module} AND score >= ${MASTERY_SCORE} AND kind <> 'baseline'`;
  return r.n;
}

export type RecordResult = {
  score: number;
  newLevel: number;
  levelChange: "up" | "down" | "same";
  masteredNow: boolean;
  unlocked: number | null;
  masteryDays: number;
};

export async function recordAttempt(opts: {
  kidId: string;
  module: number;
  kind: string;
  correct: number;
  total: number;
  missed: unknown[];
}): Promise<RecordResult> {
  const { kidId, module, kind, correct, total, missed } = opts;
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  await sql`
    INSERT INTO attempts (id, kid_id, module, kind, score, correct, total, missed, day_key)
    VALUES (${newId()}, ${kidId}, ${module}, ${kind}, ${score}, ${correct}, ${total}, ${sql.json(missed as never)}, ${dayKey()})`;

  const progress = await getProgress(kidId);
  const row = progress.find((p) => p.module === module)!;
  if (kind === "baseline") {
    return { score, newLevel: row.level, levelChange: "same", masteredNow: false, unlocked: null, masteryDays: 0 };
  }

  const lvl = nextLevel(row.level, score);
  await sql`UPDATE module_progress SET level = ${lvl} WHERE kid_id = ${kidId} AND module = ${module}`;

  const days = await masteryDays(kidId, module);
  let masteredNow = false;
  let unlocked: number | null = null;
  if (row.status === "ACTIVE" && days >= MASTERY_DAYS) {
    masteredNow = true;
    await sql`UPDATE module_progress SET status = 'MASTERED', mastered_at = now() WHERE kid_id = ${kidId} AND module = ${module}`;
    const next = progress.find((p) => p.module > module && p.status === "LOCKED");
    if (next) {
      unlocked = next.module;
      await sql`UPDATE module_progress SET status = 'ACTIVE' WHERE kid_id = ${kidId} AND module = ${next.module}`;
    }
  }
  return {
    score,
    newLevel: lvl,
    levelChange: lvl > row.level ? "up" : lvl < row.level ? "down" : "same",
    masteredNow,
    unlocked,
    masteryDays: days,
  };
}

// --- Spaced repetition (Leitner boxes) ---
const BOX_DAYS = [0, 1, 3, 7]; // box 1 -> tomorrow, box 2 -> 3 days, box 3 -> a week

export async function addReviewItems(kidId: string, module: number, items: { prompt: string; answer: string }[]) {
  for (const it of items) {
    await sql`
      INSERT INTO review_items (id, kid_id, module, prompt, answer, box, due_at)
      VALUES (${newId()}, ${kidId}, ${module}, ${it.prompt}, ${it.answer}, 1, now())
      ON CONFLICT (kid_id, prompt) DO UPDATE SET box = 1, due_at = now()`;
  }
}

export async function updateCard(kidId: string, cardId: string, right: boolean) {
  const [card] = await sql<{ box: number }[]>`SELECT box FROM review_items WHERE id = ${cardId} AND kid_id = ${kidId}`;
  if (!card) return;
  const box = right ? Math.min(3, card.box + 1) : 1;
  const days = right ? BOX_DAYS[box] : 1;
  await sql`
    UPDATE review_items SET box = ${box},
      due_at = now() + make_interval(days => ${days}),
      times_right = times_right + ${right ? 1 : 0},
      times_wrong = times_wrong + ${right ? 0 : 1}
    WHERE id = ${cardId}`;
}

export async function dueCount(kidId: string) {
  const [r] = await sql<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM review_items WHERE kid_id = ${kidId} AND due_at <= now()`;
  return r.n;
}

// --- Stats used by dashboards and the daily plan ---
export type ModuleStat = { module: number; avg: number | null; last: number | null; attempts: number; masteryDays: number };

export async function moduleStats(kidId: string): Promise<ModuleStat[]> {
  const rows = await sql<{ module: number; score: number; day_key: string }[]>`
    SELECT module, score, day_key FROM attempts WHERE kid_id = ${kidId} AND kind <> 'baseline' ORDER BY created_at DESC`;
  return MODULES.map((m) => {
    const mine = rows.filter((r) => r.module === m.id);
    const recent = mine.slice(0, 3);
    const masteryDaySet = new Set(mine.filter((r) => r.score >= MASTERY_SCORE).map((r) => r.day_key));
    return {
      module: m.id,
      avg: recent.length ? Math.round(recent.reduce((s, r) => s + r.score, 0) / recent.length) : null,
      last: mine[0]?.score ?? null,
      attempts: mine.length,
      masteryDays: masteryDaySet.size,
    };
  });
}

export async function practiceDays(kidId: string): Promise<string[]> {
  const rows = await sql<{ day_key: string }[]>`
    SELECT DISTINCT day_key FROM attempts WHERE kid_id = ${kidId} ORDER BY day_key DESC`;
  return rows.map((r) => r.day_key);
}

export function streakFrom(days: string[]): number {
  const set = new Set(days);
  const today = dayKey();
  const yesterday = dayKey(new Date(Date.now() - 86400000));
  let cursor = set.has(today) ? new Date() : set.has(yesterday) ? new Date(Date.now() - 86400000) : null;
  let n = 0;
  while (cursor && set.has(dayKey(cursor))) {
    n++;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  return n;
}

export function daysInLast(days: string[], n: number): number {
  const keys = new Set(Array.from({ length: n }, (_, i) => dayKey(new Date(Date.now() - i * 86400000))));
  return days.filter((d) => keys.has(d)).length;
}

export async function baselineAndLatest(kidId: string) {
  const rows = await sql<{ kind: string; score: number }[]>`
    SELECT kind, score FROM attempts WHERE kid_id = ${kidId} AND module = 6 ORDER BY created_at ASC`;
  const baseline = rows.find((r) => r.kind === "baseline")?.score ?? null;
  const challenges = rows.filter((r) => r.kind !== "baseline");
  const latest = challenges.length ? challenges[challenges.length - 1].score : null;
  const best = challenges.length ? Math.max(...challenges.map((r) => r.score)) : null;
  return { baseline, latest, best };
}

// --- Daily plan ---
export type PlanTask = {
  key: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
  kind: "baseline" | "review" | "practice" | "refresh";
};

export async function dailyPlan(kidId: string): Promise<{ tasks: PlanTask[]; allDone: boolean; courseComplete: boolean }> {
  const today = dayKey();
  const [progress, stats, todays, due, base] = await Promise.all([
    getProgress(kidId),
    moduleStats(kidId),
    sql<{ module: number; kind: string; score: number }[]>`SELECT module, kind, score FROM attempts WHERE kid_id = ${kidId} AND day_key = ${today}`,
    dueCount(kidId),
    baselineAndLatest(kidId),
  ]);
  // A practice task counts as done after a strong round (80%+) or three honest tries in one day.
  const roundsToday = (module: number) => todays.filter((a) => a.module === module && a.kind !== "baseline" && a.kind !== "review");
  const doneToday = (module: number) => {
    const r = roundsToday(module);
    return r.some((a) => a.score >= MASTERY_SCORE) || r.length >= DAILY_TRIES;
  };
  const triesNote = (module: number) => {
    const r = roundsToday(module);
    if (!r.length || doneToday(module)) return "";
    return ` Today: best ${Math.max(...r.map((a) => a.score))}%, round ${r.length} of ${DAILY_TRIES}.`;
  };

  const tasks: PlanTask[] = [];
  if (base.baseline === null) {
    tasks.push({
      key: "baseline",
      title: "Your first Memory Test",
      detail: "See where you start. Remember as many of 15 things as you can.",
      href: "/kid/practice/6?baseline=1",
      done: false,
      kind: "baseline",
    });
    return { tasks, allDone: false, courseComplete: false };
  }

  const reviewedToday = todays.some((a) => a.kind === "review");
  if (due > 0 || reviewedToday) {
    tasks.push({
      key: "review",
      title: "Review your cards",
      detail: due > 0 ? `${due} card${due === 1 ? "" : "s"} due today, including ones you missed before.` : "All due cards reviewed.",
      href: "/kid/review",
      done: due === 0,
      kind: "review",
    });
  }

  const active = progress.find((p) => p.status === "ACTIVE");
  if (active) {
    const m = MODULES.find((x) => x.id === active.module)!;
    const st = stats.find((s) => s.module === active.module)!;
    const struggling = st.last !== null && st.last < 60;
    tasks.push({
      key: `practice-${m.id}`,
      title: `${m.icon} ${m.title}`,
      detail:
        (struggling
          ? "Let's try again. We've made it a little easier."
          : `Mastery: ${Math.min(st.masteryDays, MASTERY_DAYS)} of ${MASTERY_DAYS} days at ${MASTERY_SCORE}%+.`) + triesNote(m.id),
      href: `/kid/practice/${m.id}`,
      done: doneToday(m.id),
      kind: "practice",
    });
  }

  // Weak areas: a mastered skill whose recent average has dropped gets repeated.
  const weak = progress
    .filter((p) => p.status === "MASTERED")
    .map((p) => ({ p, st: stats.find((s) => s.module === p.module)! }))
    .filter(({ st }) => st.avg !== null && st.avg < REFRESH_BELOW)
    .sort((a, b) => (a.st.avg ?? 0) - (b.st.avg ?? 0))[0];
  if (weak) {
    const m = MODULES.find((x) => x.id === weak.p.module)!;
    tasks.push({
      key: `refresh-${m.id}`,
      title: `Refresh: ${m.title}`,
      detail: `Your recent score here is ${weak.st.avg}%. A quick round keeps the skill sharp.` + triesNote(m.id),
      href: `/kid/practice/${m.id}`,
      done: doneToday(m.id),
      kind: "refresh",
    });
  }

  const courseComplete = progress.every((p) => p.status === "MASTERED");
  if (courseComplete && !weak) {
    // Keep practising: rotate through skills so nothing fades.
    const rotate = MODULES[new Date().getDate() % MODULES.length];
    tasks.push({
      key: `keep-${rotate.id}`,
      title: `Keep sharp: ${rotate.title}`,
      detail: "You've mastered every skill. One round a day keeps them strong.",
      href: `/kid/practice/${rotate.id}`,
      done: doneToday(rotate.id),
      kind: "refresh",
    });
  }

  return { tasks, allDone: tasks.length > 0 && tasks.every((t) => t.done), courseComplete };
}

// --- Summary used by teacher and parent views ---
export type KidSummary = {
  id: string;
  name: string;
  band: AgeBand;
  progress: ProgressRow[];
  stats: ModuleStat[];
  streak: number;
  last7: number;
  lastPractice: string | null;
  doneToday: boolean;
  currentModule: number | null;
  masteredCount: number;
  weakest: { module: number; avg: number } | null;
  baseline: number | null;
  latestChallenge: number | null;
  bestChallenge: number | null;
  dueCards: number;
};

export async function kidSummary(kid: { id: string; name: string; age_band: AgeBand }): Promise<KidSummary> {
  const [progress, stats, days, base, due, plan] = await Promise.all([
    getProgress(kid.id),
    moduleStats(kid.id),
    practiceDays(kid.id),
    baselineAndLatest(kid.id),
    dueCount(kid.id),
    dailyPlan(kid.id),
  ]);
  const unlocked = progress.filter((p) => p.status !== "LOCKED");
  const weakest =
    unlocked
      .map((p) => stats.find((s) => s.module === p.module)!)
      .filter((s) => s.avg !== null)
      .sort((a, b) => (a.avg ?? 0) - (b.avg ?? 0))
      .map((s) => ({ module: s.module, avg: s.avg! }))[0] ?? null;
  return {
    id: kid.id,
    name: kid.name,
    band: kid.age_band,
    progress,
    stats,
    streak: streakFrom(days),
    last7: daysInLast(days, 7),
    lastPractice: days[0] ?? null,
    doneToday: plan.allDone,
    currentModule: progress.find((p) => p.status === "ACTIVE")?.module ?? null,
    masteredCount: progress.filter((p) => p.status === "MASTERED").length,
    weakest,
    baseline: base.baseline,
    latestChallenge: base.latest,
    bestChallenge: base.best,
    dueCards: due,
  };
}
