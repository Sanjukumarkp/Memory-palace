export type AgeBand = "JUNIOR" | "MIDDLE" | "SENIOR";

export const MODULES = [
  {
    id: 1,
    key: "recall",
    title: "Read & Recall",
    technique: "Active recall",
    icon: "🧠",
    blurb: "Read a short passage, hide it, then answer from memory. Pulling facts out makes them stick.",
  },
  {
    id: 2,
    key: "flashcards",
    title: "Flashcard Boxes",
    technique: "Spaced repetition",
    icon: "🗃️",
    blurb: "Cards you know move up a box and come back less often. Cards you miss go back to Box 1.",
  },
  {
    id: 3,
    key: "tricks",
    title: "Memory Tricks",
    technique: "Acronyms, sentences and rhymes",
    icon: "🎵",
    blurb: "Turn a list into a word, a silly sentence or a rhyme, then recall it in order.",
  },
  {
    id: 4,
    key: "story",
    title: "Story Links",
    technique: "Story method",
    icon: "📖",
    blurb: "Link words into a crazy, colourful story. The sillier the picture, the better it sticks.",
  },
  {
    id: 5,
    key: "palace",
    title: "Memory Palace",
    technique: "Method of loci",
    icon: "🏰",
    blurb: "Put each item at a spot in a place you know, then walk the route in your mind.",
  },
  {
    id: 6,
    key: "challenge",
    title: "Memory Challenge",
    technique: "Use any technique",
    icon: "🏆",
    blurb: "15 items, 60 seconds. Use your best technique and beat your first score.",
  },
] as const;

export type ModuleId = 1 | 2 | 3 | 4 | 5 | 6;

export function moduleById(id: number) {
  return MODULES.find((m) => m.id === id)!;
}

export const BAND_LABEL: Record<AgeBand, string> = {
  JUNIOR: "Juniors (6–8)",
  MIDDLE: "Middles (9–12)",
  SENIOR: "Seniors (13–16)",
};

// Mastery: a module is mastered after scoring at least MASTERY_SCORE on MASTERY_DAYS different days.
export const MASTERY_SCORE = 80;
export const MASTERY_DAYS = 3;
// A mastered skill whose recent average falls below this is scheduled for a refresh.
export const REFRESH_BELOW = 70;
export const MAX_LEVEL = 5;
// Daily practice is done after one round at MASTERY_SCORE+ or this many rounds.
export const DAILY_TRIES = 3;

const BASE_ITEMS: Record<AgeBand, number> = { JUNIOR: 5, MIDDLE: 8, SENIOR: 12 };
const MAX_ITEMS: Record<AgeBand, number> = { JUNIOR: 10, MIDDLE: 16, SENIOR: 24 };

export function itemCount(band: AgeBand, level: number) {
  return Math.min(MAX_ITEMS[band], BASE_ITEMS[band] + (level - 1) * 2);
}

export function questionCount(band: AgeBand, level: number) {
  const base = { JUNIOR: 3, MIDDLE: 4, SENIOR: 5 }[band];
  return Math.min(base + Math.floor((level - 1) / 2), base + 2);
}

// Seconds to study a list before it is hidden.
export function studySeconds(band: AgeBand, items: number) {
  const perItem = { JUNIOR: 8, MIDDLE: 6, SENIOR: 5 }[band];
  return Math.max(30, items * perItem);
}

export function palaceSpotCount(band: AgeBand) {
  return { JUNIOR: 5, MIDDLE: 10, SENIOR: 15 }[band];
}

export const CHALLENGE_ITEMS = 15;
export const CHALLENGE_SECONDS = 60;

export function nextLevel(level: number, score: number) {
  if (score >= 90) return Math.min(MAX_LEVEL, level + 1);
  if (score < 60) return Math.max(1, level - 1);
  return level;
}
