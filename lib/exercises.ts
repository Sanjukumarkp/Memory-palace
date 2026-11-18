import { sql, newId, dayKey } from "./db";
import {
  CHALLENGE_ITEMS,
  CHALLENGE_SECONDS,
  itemCount,
  palaceSpotCount,
  questionCount,
  studySeconds,
  type AgeBand,
} from "./modules";
import { FLASHCARDS, ORDERED_LISTS, PASSAGES, WORDS, pick, shuffle, type Mcq } from "./content";
import { aiFlashcards, aiOrderedList, aiPassage } from "./ai";
import { addReviewItems, getProgress, recordAttempt, updateCard, type RecordResult } from "./progress";

type Kid = { id: string; name: string; age_band: AgeBand; palace_spots: string[] };

export type ExerciseContent =
  | { kind: "recall"; title: string; text: string; questions: Mcq[]; source: "ai" | "bank" }
  | { kind: "flashcards" | "review"; cards: { id: string; prompt: string; options: string[]; answer: number; answerText: string }[] }
  | { kind: "tricks"; topic: string; items: string[]; example: string; seconds: number; source: "ai" | "bank" }
  | { kind: "story"; words: string[]; seconds: number }
  | { kind: "palace"; pairs: { spot: string; item: string }[]; seconds: number }
  | { kind: "challenge" | "baseline"; items: string[]; seconds: number };

export class ExerciseError extends Error {
  constructor(message: string, public code: "locked" | "palace_setup" | "no_cards" | "bad_request") {
    super(message);
  }
}

// What the browser may see. Correct answers for questions stay on the server.
export function publicView(c: ExerciseContent) {
  if (c.kind === "recall") return { ...c, questions: c.questions.map(({ q, options }) => ({ q, options })) };
  if (c.kind === "flashcards" || c.kind === "review")
    return { ...c, cards: c.cards.map(({ id, prompt, options }) => ({ id, prompt, options })) };
  return c;
}

async function recentTitles(kidId: string, module: number, field: string): Promise<string[]> {
  const rows = await sql<{ v: string | null }[]>`
    SELECT content->>${field} AS v FROM exercises WHERE kid_id = ${kidId} AND module = ${module}
    ORDER BY created_at DESC LIMIT 12`;
  return rows.map((r) => r.v).filter((v): v is string => Boolean(v));
}

function mcqOptions(answer: string, pool: string[]): { options: string[]; answer: number } {
  const norm = (s: string) => s.trim().toLowerCase();
  const distractors = shuffle(Array.from(new Set(pool.filter((p) => norm(p) !== norm(answer))))).slice(0, 3);
  const options = shuffle([answer, ...distractors]);
  return { options, answer: options.indexOf(answer) };
}

async function buildCardSession(kid: Kid, withNewCards: boolean) {
  const band = kid.age_band;
  if (withNewCards) {
    // One fresh batch of cards per day (IST); extra rounds review what's already in the boxes.
    const [{ n, today }] = await sql<{ n: number; today: number }[]>`
      SELECT COUNT(*)::int AS n,
        COUNT(*) FILTER (WHERE (created_at + interval '330 minutes')::date = (now() + interval '330 minutes')::date)::int AS today
      FROM review_items WHERE kid_id = ${kid.id} AND module = 2`;
    const want = itemCount(band, 1);
    const target = n + want; // add a fresh batch each practice day, up to the band's size
    const existing = await sql<{ prompt: string }[]>`SELECT prompt FROM review_items WHERE kid_id = ${kid.id}`;
    const have = new Set(existing.map((e) => e.prompt));
    let fresh = FLASHCARDS[band].filter((c) => !have.has(c.prompt));
    if (fresh.length < want) {
      const ai = await aiFlashcards(band, want, [...have]);
      if (ai) fresh = [...fresh, ...ai.filter((c) => !have.has(c.prompt))];
    }
    const add = today > 0 ? [] : pick(fresh, Math.max(0, Math.min(want, target - n)));
    await addReviewItems(kid.id, 2, add);
  }
  const due = await sql<{ id: string; prompt: string; answer: string }[]>`
    SELECT id, prompt, answer FROM review_items WHERE kid_id = ${kid.id} AND due_at <= now()
    ORDER BY box ASC, due_at ASC LIMIT ${withNewCards ? 15 : 12}`;
  if (!due.length) throw new ExerciseError("No cards are due right now. Great job!", "no_cards");
  const allAnswers = await sql<{ answer: string }[]>`SELECT answer FROM review_items WHERE kid_id = ${kid.id}`;
  const pool = [...allAnswers.map((a) => a.answer), ...FLASHCARDS[band].map((c) => c.answer)];
  return due.map((c) => {
    const looksNumeric = /^[\d.,\s−-]+$/.test(c.answer);
    const sameType = pool.filter((p) => /^[\d.,\s−-]+$/.test(p) === looksNumeric);
    const { options, answer } = mcqOptions(c.answer, sameType.length >= 4 ? sameType : pool);
    return { id: c.id, prompt: c.prompt, options, answer, answerText: c.answer };
  });
}

export async function createExercise(kid: Kid, module: number, opts: { baseline?: boolean; review?: boolean } = {}) {
  const band = kid.age_band;
  const progress = await getProgress(kid.id);
  const row = progress.find((p) => p.module === module);
  if (!row) throw new ExerciseError("Unknown module", "bad_request");

  let content: ExerciseContent;
  if (opts.review) {
    content = { kind: "review", cards: await buildCardSession(kid, false) };
  } else if (opts.baseline) {
    content = { kind: "baseline", items: pick(WORDS, CHALLENGE_ITEMS), seconds: CHALLENGE_SECONDS };
  } else {
    if (row.status === "LOCKED") throw new ExerciseError("Finish the earlier skills to unlock this one.", "locked");
    const level = row.level;
    const n = itemCount(band, level);
    switch (module) {
      case 1: {
        const qn = questionCount(band, level);
        const avoid = await recentTitles(kid.id, 1, "title");
        const ai = await aiPassage(band, qn, avoid);
        if (ai) {
          content = { kind: "recall", ...ai, source: "ai" };
        } else {
          const choices = PASSAGES[band].filter((p) => !avoid.slice(0, 1).includes(p.title));
          const p = pick(choices.length ? choices : PASSAGES[band], 1)[0];
          content = { kind: "recall", title: p.title, text: p.text, questions: pick(p.questions, Math.min(qn, p.questions.length)), source: "bank" };
        }
        break;
      }
      case 2:
        content = { kind: "flashcards", cards: await buildCardSession(kid, true) };
        break;
      case 3: {
        const avoid = await recentTitles(kid.id, 3, "topic");
        const bankChoices = ORDERED_LISTS.filter((l) => l.bands.includes(band) && !avoid.includes(l.topic) && l.items.length <= n + 4);
        const useAi = bankChoices.length === 0 || Math.random() < 0.5;
        const ai = useAi ? await aiOrderedList(band, Math.max(4, n), [...avoid, ...ORDERED_LISTS.map((l) => l.topic)]) : null;
        const list = ai ?? pick(bankChoices.length ? bankChoices : ORDERED_LISTS.filter((l) => l.bands.includes(band)), 1)[0];
        content = {
          kind: "tricks",
          topic: list.topic,
          items: list.items,
          example: list.example,
          seconds: studySeconds(band, list.items.length) + 30,
          source: ai ? "ai" : "bank",
        };
        break;
      }
      case 4: {
        const words = pick(WORDS, n);
        content = { kind: "story", words, seconds: studySeconds(band, n) + 30 };
        break;
      }
      case 5: {
        const spots = kid.palace_spots;
        const need = Math.min(n, palaceSpotCount(band) + 5);
        if (spots.length < Math.min(need, palaceSpotCount(band)))
          throw new ExerciseError("Build your memory palace first.", "palace_setup");
        const use = spots.slice(0, Math.min(need, spots.length));
        const items = pick(WORDS, use.length);
        content = { kind: "palace", pairs: use.map((spot, i) => ({ spot, item: items[i] })), seconds: studySeconds(band, use.length) + 20 };
        break;
      }
      case 6:
        content = { kind: "challenge", items: pick(WORDS, CHALLENGE_ITEMS), seconds: CHALLENGE_SECONDS };
        break;
      default:
        throw new ExerciseError("Unknown module", "bad_request");
    }
  }

  const id = newId();
  await sql`INSERT INTO exercises (id, kid_id, module, kind, content) VALUES (${id}, ${kid.id}, ${module}, ${content.kind}, ${sql.json(content as never)})`;
  return { id, module, content: publicView(content) };
}

// ---------- Grading ----------
export function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]/g, "");
}

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// Forgiving match: ignores case, spaces and punctuation, and allows small spelling slips.
export function matches(given: string, expected: string) {
  const g = normalize(given || "");
  const e = normalize(expected);
  if (!g) return false;
  if (g === e) return true;
  if (e.length >= 4 && g.length >= 3 && (e.startsWith(g) && g.length >= e.length - 2)) return true;
  const allowed = e.length >= 8 ? 2 : e.length >= 4 ? 1 : 0;
  return editDistance(g, e) <= allowed;
}

export type ReviewLine = { prompt: string; yours: string; correct: string; ok: boolean };

export async function gradeExercise(kidId: string, exerciseId: string, responses: unknown) {
  const [ex] = await sql<{ id: string; module: number; kind: string; content: ExerciseContent; completed_at: Date | null }[]>`
    SELECT id, module, kind, content, completed_at FROM exercises WHERE id = ${exerciseId} AND kid_id = ${kidId}`;
  if (!ex) throw new ExerciseError("Exercise not found", "bad_request");
  if (ex.completed_at) throw new ExerciseError("Already submitted", "bad_request");
  const c = ex.content;
  const lines: ReviewLine[] = [];
  const toReview: { prompt: string; answer: string }[] = [];
  const arr = Array.isArray(responses) ? responses : [];

  if (c.kind === "recall") {
    c.questions.forEach((q, i) => {
      const pickIdx = Number(arr[i]);
      const ok = pickIdx === q.answer;
      lines.push({ prompt: q.q, yours: q.options[pickIdx] ?? "(no answer)", correct: q.options[q.answer], ok });
      if (!ok) toReview.push({ prompt: q.q, answer: q.options[q.answer] });
    });
  } else if (c.kind === "flashcards" || c.kind === "review") {
    for (let i = 0; i < c.cards.length; i++) {
      const card = c.cards[i];
      const pickIdx = Number(arr[i]);
      const ok = pickIdx === card.answer;
      lines.push({ prompt: card.prompt, yours: card.options[pickIdx] ?? "(no answer)", correct: card.answerText, ok });
      await updateCard(kidId, card.id, ok);
    }
  } else if (c.kind === "tricks") {
    c.items.forEach((item, i) => {
      const given = String(arr[i] ?? "");
      const ok = matches(given, item);
      lines.push({ prompt: `#${i + 1}`, yours: given || "(blank)", correct: item, ok });
      if (!ok)
        toReview.push({
          prompt: i === 0 ? `${c.topic}: what comes first?` : `${c.topic}: what comes after "${c.items[i - 1]}"?`,
          answer: item,
        });
    });
  } else if (c.kind === "palace") {
    c.pairs.forEach((p, i) => {
      const given = String(arr[i] ?? "");
      const ok = matches(given, p.item);
      lines.push({ prompt: p.spot, yours: given || "(blank)", correct: p.item, ok });
    });
  } else {
    // story, challenge, baseline: recall in any order
    const items = c.kind === "story" ? c.words : (c as { items: string[] }).items;
    const remaining = arr.map((a) => String(a ?? "")).filter((s) => s.trim());
    for (const item of items) {
      const idx = remaining.findIndex((r) => matches(r, item));
      const ok = idx >= 0;
      lines.push({ prompt: item, yours: ok ? remaining[idx] : "", correct: item, ok });
      if (ok) remaining.splice(idx, 1);
    }
  }

  const correct = lines.filter((l) => l.ok).length;
  const total = lines.length;
  if (toReview.length) await addReviewItems(kidId, ex.module, toReview);

  // Review sessions count toward Flashcard Boxes only once that skill is unlocked.
  let module = ex.module;
  if (c.kind === "review") {
    const progress = await getProgress(kidId);
    if (progress.find((p) => p.module === 2)?.status === "LOCKED") module = 0;
  }

  let result: RecordResult | null = null;
  const missed = lines.filter((l) => !l.ok).map((l) => ({ prompt: l.prompt, correct: l.correct }));
  if (module === 0) {
    await sql`INSERT INTO attempts (id, kid_id, module, kind, score, correct, total, missed, day_key)
      VALUES (${newId()}, ${kidId}, 0, 'review', ${total ? Math.round((correct / total) * 100) : 0}, ${correct}, ${total}, ${sql.json(missed as never)}, ${dayKey()})`;
  } else {
    result = await recordAttempt({ kidId, module, kind: c.kind, correct, total, missed });
  }
  await sql`UPDATE exercises SET completed_at = now() WHERE id = ${exerciseId}`;

  const score = total ? Math.round((correct / total) * 100) : 0;
  return { score, correct, total, lines, result, addedToReview: toReview.length };
}
