import { sql, dayKey } from "@/lib/db";
import { kidSummary } from "@/lib/progress";
import { BAND_LABEL, moduleById } from "@/lib/modules";
import type { KidRow } from "@/lib/access";
import CoachNotes from "./CoachNotes";
import SkillPath from "./SkillPath";
import { badgesFor } from "@/lib/badges";

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Last 4 weeks as a Monday-first calendar grid.
function calendarCells() {
  const today = new Date(Date.now() + 5.5 * 3600 * 1000); // IST
  const dow = (today.getUTCDay() + 6) % 7; // 0 = Monday
  const start = new Date(today.getTime() - (21 + dow) * 86400000);
  const cells: { key: string; future: boolean }[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, future: d.getTime() > today.getTime() });
  }
  return cells;
}

export default async function KidReport({ kid }: { kid: KidRow }) {
  const sum = await kidSummary(kid);
  const dayRows = await sql<{ day_key: string }[]>`SELECT DISTINCT day_key FROM attempts WHERE kid_id = ${kid.id}`;
  const tough = await sql<{ prompt: string; answer: string; times_wrong: number }[]>`
    SELECT prompt, answer, times_wrong FROM review_items WHERE kid_id = ${kid.id} AND times_wrong > 0 AND box < 3
    ORDER BY times_wrong DESC, due_at ASC LIMIT 5`;
  const badges = await badgesFor(kid.id);
  const earned = badges.filter((b) => b.earned);

  const days = new Set(dayRows.map((d) => d.day_key));
  const today = dayKey();
  const cells = calendarCells();
  const improvement = sum.baseline !== null && sum.bestChallenge !== null ? sum.bestChallenge - sum.baseline : null;

  return (
    <div className="stack-lg">
      <div className="row between">
        <div>
          <h1>{kid.name}</h1>
          <p className="muted" style={{ marginTop: "0.2rem" }}>
            {BAND_LABEL[kid.age_band]} · {kid.class_name}
          </p>
        </div>
        <span className={sum.doneToday ? "pill good" : "pill warn"} style={{ fontSize: "0.9rem", padding: "0.4rem 0.9rem" }}>
          {sum.doneToday ? "✓ Practised today" : "Not practised today"}
        </span>
      </div>

      <div className="grid grid-3">
        <div className="card stat">
          <div className="label">Skills mastered</div>
          <div className="value">{sum.masteredCount} of 6</div>
          <div className="meter good">
            <div style={{ width: `${(sum.masteredCount / 6) * 100}%` }} />
          </div>
          <div className="hint" style={{ marginTop: "0.5rem" }}>
            {sum.currentModule ? `Now: ${moduleById(sum.currentModule).title}` : sum.masteredCount === 6 ? "Course complete 🎓" : ""}
          </div>
        </div>
        <div className="card stat">
          <div className="label">Practice this week</div>
          <div className="value">{sum.last7} of 7 days</div>
          <div className="hint">{sum.streak > 0 ? `🔥 ${sum.streak}-day streak` : "No streak right now"}</div>
        </div>
        <div className="card stat">
          <div className="label">Memory Test (15 items)</div>
          <div className="value">
            {sum.baseline === null ? "Not taken" : sum.bestChallenge === null ? `${sum.baseline}%` : `${sum.baseline}% → ${sum.bestChallenge}%`}
          </div>
          <div className="hint">
            {improvement === null
              ? sum.baseline === null
                ? "Taken on the first day"
                : "First score. Retaken in the final skill."
              : improvement > 0
                ? `Up ${improvement} points since the start`
                : "First score → best since"}
          </div>
        </div>
      </div>

      <section className="card">
        <div className="section-title">
          <h2>Coach notes</h2>
        </div>
        <CoachNotes kidId={kid.id} />
      </section>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <div className="section-title">
            <h2>Skills</h2>
            <p>Recent score · mastery days</p>
          </div>
          <SkillPath progress={sum.progress} stats={sum.stats} showScores />
        </section>

        <div className="stack-lg">
          <section className="card">
            <div className="section-title">
              <h2>Practice days</h2>
              <p>Last 4 weeks</p>
            </div>
            <div className="cal">
              {DOW.map((d) => (
                <div key={d} className="dow">
                  {d[0]}
                </div>
              ))}
              {cells.map((c) => (
                <div
                  key={c.key}
                  title={c.key}
                  className={c.future ? "blank" : `${days.has(c.key) ? "on" : ""} ${c.key === today ? "today" : ""}`}
                />
              ))}
            </div>
          </section>

          <section className="card">
            <div className="section-title">
              <h2>Facts to practise</h2>
            </div>
            {tough.length === 0 ? (
              <p className="muted">Nothing tricky right now. Missed facts show up here until they stick.</p>
            ) : (
              <div className="facts">
                {tough.map((t) => (
                  <div key={t.prompt} className="fact">
                    <b>{t.prompt}</b>
                    <span>Answer: {t.answer}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-title">
              <h2>Badges</h2>
              <p>
                {earned.length} of {badges.length}
              </p>
            </div>
            {earned.length ? (
              <div className="badges">
                {earned.map((b) => (
                  <span key={b.key} className="badge" title={b.detail}>
                    {b.icon} {b.title}
                  </span>
                ))}
              </div>
            ) : (
              <p className="muted">No badges yet.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
