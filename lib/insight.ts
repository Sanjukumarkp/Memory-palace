import { sql } from "./db";
import { aiCoachNotes, aiEnabled } from "./ai";
import { kidSummary } from "./progress";
import { MODULES, MASTERY_DAYS, moduleById, type AgeBand } from "./modules";

// Coaching notes for a teacher or parent: AI-written when a key is set, rule-based otherwise.
export async function coachNotes(kid: { id: string; name: string; age_band: AgeBand }, audience: "teacher" | "parent") {
  const sum = await kidSummary(kid);
  const tough = await sql<{ prompt: string }[]>`
    SELECT prompt FROM review_items WHERE kid_id = ${kid.id} AND times_wrong >= 2 ORDER BY times_wrong DESC LIMIT 5`;

  if (aiEnabled()) {
    const text = await aiCoachNotes(
      {
        name: kid.name,
        band: kid.age_band,
        modules: MODULES.map((m) => {
          const p = sum.progress.find((x) => x.module === m.id)!;
          const st = sum.stats.find((x) => x.module === m.id)!;
          return { title: m.title, status: p.status, avg: st.avg, attempts: st.attempts };
        }),
        streak: sum.streak,
        practiceDaysLast7: sum.last7,
        baseline: sum.baseline,
        latestChallenge: sum.latestChallenge,
        toughCards: tough.map((t) => t.prompt),
      },
      audience,
    );
    if (text) return { source: "ai" as const, notes: text.split("\n").filter(Boolean) };
  }

  const notes: string[] = [];
  const name = kid.name;
  if (sum.last7 >= 5) notes.push(`${name} practised on ${sum.last7} of the last 7 days. That consistency is what builds memory.`);
  else if (sum.last7 >= 2) notes.push(`${name} practised on ${sum.last7} of the last 7 days. Aim for 5 short days a week.`);
  else notes.push(`${name} has practised on only ${sum.last7} of the last 7 days. A fixed daily time (e.g. after homework) helps most.`);

  const scored = sum.stats.filter((s) => s.avg !== null);
  if (scored.length) {
    const best = [...scored].sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];
    notes.push(`Strongest skill so far: ${moduleById(best.module).title} (${best.avg}% recently).`);
  }
  if (sum.weakest && sum.weakest.avg < 80) {
    const m = moduleById(sum.weakest.module);
    const tip: Record<number, string> = {
      1: "after reading anything, close the book and ask them to tell you 3 facts.",
      2: "do the daily card review together; say answers out loud before tapping.",
      3: "make up a silly sentence together for a list from their textbook.",
      4: "ask them to tell you the story out loud and make it sillier and more colourful.",
      5: "walk through the palace spots in order together, then picture one item at each.",
      6: "practise one favourite technique (story or palace) on a 10-item list.",
    };
    notes.push(`Needs more practice: ${m.title} (${sum.weakest.avg}% recently). At ${audience === "teacher" ? "school" : "home"}: ${tip[m.id]}`);
  }
  if (sum.currentModule) {
    const st = sum.stats.find((s) => s.module === sum.currentModule)!;
    notes.push(`Working on ${moduleById(sum.currentModule).title}: ${Math.min(st.masteryDays, MASTERY_DAYS)} of ${MASTERY_DAYS} mastery days done.`);
  }
  if (sum.baseline !== null && sum.bestChallenge !== null)
    notes.push(`Memory Test: started at ${sum.baseline}%, best so far ${sum.bestChallenge}%.`);
  if (tough.length) notes.push(`Facts that keep slipping: ${tough.map((t) => `"${t.prompt}"`).join(", ")}.`);
  return { source: "rules" as const, notes };
}
