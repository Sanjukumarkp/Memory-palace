import Anthropic from "@anthropic-ai/sdk";
import type { AgeBand } from "./modules";
import type { Card, Mcq, OrderedList, Passage } from "./content";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";

export function aiEnabled() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const client = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 25_000, maxRetries: 1 });

const AGE_TEXT: Record<AgeBand, string> = {
  JUNIOR: "children aged 6-8 (very simple words, short sentences)",
  MIDDLE: "children aged 9-12 (school-level vocabulary)",
  SENIOR: "students aged 13-16 following an Indian school syllabus (CBSE/ICSE level)",
};

const SYSTEM =
  "You write learning content for a memory-skills app used by school children in India. " +
  "Content must be factually correct, kind, safe for children, free of violence, brands and real private people. " +
  "Reply with JSON only, no prose and no code fences.";

async function askJson<T>(prompt: string, maxTokens = 1500): Promise<T | null> {
  if (!aiEnabled()) return null;
  try {
    const msg = await client().messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end < 0) return null;
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch (err) {
    console.error("AI generation failed, using built-in content:", (err as Error).message);
    return null;
  }
}

function validMcqs(qs: unknown, n: number): Mcq[] | null {
  if (!Array.isArray(qs) || qs.length < n) return null;
  const out: Mcq[] = [];
  for (const q of qs.slice(0, n)) {
    if (
      typeof q?.q !== "string" ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      !q.options.every((o: unknown) => typeof o === "string") ||
      typeof q.answer !== "number" ||
      q.answer < 0 ||
      q.answer > 3
    )
      return null;
    out.push({ q: q.q, options: q.options, answer: q.answer });
  }
  return out;
}

export async function aiPassage(band: AgeBand, questions: number, avoidTitles: string[]): Promise<Passage | null> {
  const words = { JUNIOR: "60-80", MIDDLE: "100-130", SENIOR: "130-170" }[band];
  const res = await askJson<{ title: string; text: string; questions: Mcq[] }>(
    `Write one reading passage for ${AGE_TEXT[band]}, ${words} words, on an interesting topic from science, nature, Indian history, geography or everyday life (or a short story for the youngest). ` +
      `Avoid these titles: ${avoidTitles.join(", ") || "none"}. ` +
      `Then write ${questions} multiple-choice questions that test specific details stated in the passage. Each has exactly 4 options and one correct answer (0-based index); vary which index is correct. ` +
      `JSON shape: {"title": string, "text": string, "questions": [{"q": string, "options": [string,string,string,string], "answer": number}]}`,
  );
  if (!res || typeof res.title !== "string" || typeof res.text !== "string") return null;
  const qs = validMcqs(res.questions, questions);
  return qs ? { title: res.title, text: res.text, questions: qs } : null;
}

export async function aiOrderedList(band: AgeBand, maxItems: number, avoid: string[]): Promise<OrderedList | null> {
  const res = await askJson<{ topic: string; items: string[]; example: string }>(
    `Pick one real ordered list that ${AGE_TEXT[band]} learn at school (between 4 and ${maxItems} items, order matters), ` +
      `for example a sequence, ranking or process. Avoid these topics: ${avoid.join(", ")}. ` +
      `Give the items in the correct order, each item 1-3 words, and an example memory trick (acronym, silly sentence or rhyme) for it. ` +
      `JSON shape: {"topic": string, "items": string[], "example": string}`,
    800,
  );
  if (!res || typeof res.topic !== "string" || !Array.isArray(res.items) || res.items.length < 3) return null;
  if (!res.items.every((i) => typeof i === "string")) return null;
  return { topic: res.topic, items: res.items.slice(0, maxItems), example: String(res.example || ""), bands: [band] };
}

export async function aiFlashcards(band: AgeBand, n: number, avoidPrompts: string[]): Promise<Card[] | null> {
  const res = await askJson<{ cards: Card[] }>(
    `Write ${n} flashcards for ${AGE_TEXT[band]} covering school facts (maths tables, science, Indian and world geography, history, vocabulary). ` +
      `Each answer must be short (1-4 words or a number) and unambiguous. Do not repeat any of: ${avoidPrompts.slice(0, 60).join(" | ")}. ` +
      `JSON shape: {"cards": [{"prompt": string, "answer": string}]}`,
  );
  if (!res || !Array.isArray(res.cards)) return null;
  const cards = res.cards.filter((c) => typeof c?.prompt === "string" && typeof c?.answer === "string");
  return cards.length ? cards.slice(0, n) : null;
}

export type CoachInput = {
  name: string;
  band: AgeBand;
  modules: { title: string; status: string; avg: number | null; attempts: number }[];
  streak: number;
  practiceDaysLast7: number;
  baseline: number | null;
  latestChallenge: number | null;
  toughCards: string[];
};

export async function aiCoachNotes(input: CoachInput, audience: "teacher" | "parent"): Promise<string | null> {
  const res = await askJson<{ notes: string[] }>(
    `You are a supportive learning coach. Write 3-4 short, specific notes for the child's ${audience} about this child's memory-skills practice, ` +
      `based only on the data below. Name the strongest skill, the weakest skill and one concrete thing to do this week at ${audience === "teacher" ? "school" : "home"}. ` +
      `Be encouraging, plain and practical; never label the child. Data: ${JSON.stringify(input)}. ` +
      `JSON shape: {"notes": string[]}`,
    700,
  );
  if (!res || !Array.isArray(res.notes)) return null;
  return res.notes.filter((n) => typeof n === "string").join("\n");
}
