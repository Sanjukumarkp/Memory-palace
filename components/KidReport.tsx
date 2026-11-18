import { sql, dayKey } from "@/lib/db";
import { kidSummary } from "@/lib/progress";
import { BAND_LABEL, MASTERY_DAYS, MODULES } from "@/lib/modules";
import type { KidRow } from "@/lib/access";
import CoachNotes from "./CoachNotes";
import { badgesFor } from "@/lib/badges";

function Spark({ scores }: { scores: number[] }) {
  if (!scores.length) return <span className="muted small">No attempts yet</span>;
  const w = 160, h = 40, pad = 4;
  const xs = (i: number) => (scores.length === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (scores.length - 1));
  const ys = (v: number) => h - pad - (v / 100) * (h - 2 * pad);
  const d = scores.map((v, i) => `${i ? "L" : "M"}${xs(i).toFixed(1)},${ys(v).toFixed(1)}`).join(" ");
  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Recent scores: ${scores.join(", ")}`}>
      <line x1={pad} x2={w - pad} y1={ys(80)} y2={ys(80)} stroke="#bfe8cf" strokeDasharray="3 3" />
      <path d={d} fill="none" stroke="#5b4bdb" strokeWidth={2} />
      {scores.map((v, i) => (
        <circle key={i} cx={xs(i)} cy={ys(v)} r={2.5} fill={v >= 80 ? "#1f9d55" : v < 60 ? "#c2410c" : "#5b4bdb"} />
      ))}
    </svg>
  );
}

export default async function KidReport({ kid }: { kid: KidRow }) {
  const sum = await kidSummary(kid);
  const history = await sql<{ module: number; score: number; kind: string; day_key: string }[]>`
    SELECT module, score, kind, day_key FROM attempts WHERE kid_id = ${kid.id} ORDER BY created_at ASC`;
  const tough = await sql<{ prompt: string; answer: string; times_wrong: number; box: number }[]>`
    SELECT prompt, answer, times_wrong, box FROM review_items WHERE kid_id = ${kid.id} AND times_wrong > 0
    ORDER BY times_wrong DESC, box ASC LIMIT 8`;
  const badges = await badgesFor(kid.id);

  const days = new Set(history.map((h) => h.day_key));
  const calendar = Array.from({ length: 28 }, (_, i) => dayKey(new Date(Date.now() - (27 - i) * 86400000)));

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <h1>{kid.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {BAND_LABEL[kid.age_band]} · {kid.class_name}
          </p>
        </div>
        <div className="row">
          <span className="pill">{sum.streak > 0 ? `🔥 ${sum.streak}-day streak` : "No current streak"}</span>
          <span className={sum.doneToday ? "pill good" : "pill warn"}>{sum.doneToday ? "Today's plan done" : "Today's plan not done"}</span>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <div className="muted small">Skills mastered</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{sum.masteredCount}/6</div>
        </div>
        <div className="card">
          <div className="muted small">Practice days (last 7)</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>{sum.last7}/7</div>
        </div>
        <div className="card">
          <div className="muted small">Memory Test (15 items)</div>
          <div style={{ fontSize: "2rem", fontWeight: 900 }}>
            {sum.baseline === null ? "–" : `${sum.baseline}%`}
            {sum.bestChallenge !== null && <span style={{ color: "var(--good)" }}> → {sum.bestChallenge}%</span>}
          </div>
          <div className="muted small">First score → best since</div>
        </div>
      </div>

      <section className="card">
        <h2>Practice calendar (last 4 weeks)</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 6, maxWidth: 520, marginTop: "0.5rem" }}>
          {calendar.map((d) => (
            <div
              key={d}
              title={`${d}${days.has(d) ? " · practised" : ""}`}
              style={{ aspectRatio: "1", borderRadius: 6, background: days.has(d) ? "var(--good)" : "#eeeae3" }}
            />
          ))}
        </div>
        <p className="muted small" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
          Green = practised that day. Oldest on the left, today at the bottom right.
        </p>
      </section>

      <section className="card">
        <h2>Skills</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Skill</th>
                <th>Status</th>
                <th>Mastery days</th>
                <th>Level</th>
                <th>Recent avg</th>
                <th>Last 10 scores (dashed = 80%)</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => {
                const p = sum.progress.find((x) => x.module === m.id)!;
                const st = sum.stats.find((x) => x.module === m.id)!;
                const scores = history.filter((h) => h.module === m.id && h.kind !== "baseline").slice(-10).map((h) => h.score);
                return (
                  <tr key={m.id}>
                    <td>
                      {m.icon} <b>{m.title}</b>
                    </td>
                    <td>
                      {p.status === "MASTERED" ? (
                        <span className="pill good">Mastered</span>
                      ) : p.status === "ACTIVE" ? (
                        <span className="pill brand">Working on</span>
                      ) : (
                        <span className="pill">Locked</span>
                      )}
                    </td>
                    <td>
                      {Math.min(st.masteryDays, MASTERY_DAYS)}/{MASTERY_DAYS}
                    </td>
                    <td>{p.level}</td>
                    <td>{st.avg === null ? "–" : <span className={st.avg < 70 ? "pill warn" : "pill good"}>{st.avg}%</span>}</td>
                    <td>
                      <Spark scores={scores} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <section className="card">
          <h2>Facts that keep slipping</h2>
          {tough.length === 0 ? (
            <p className="muted">Nothing yet. Missed facts appear here and come back in daily review until they stick.</p>
          ) : (
            <table>
              <tbody>
                {tough.map((t) => (
                  <tr key={t.prompt}>
                    <td>
                      {t.prompt}
                      <div className="muted small">Answer: {t.answer}</div>
                    </td>
                    <td className="small">Missed {t.times_wrong}×</td>
                    <td className="small">Box {t.box}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <section className="card">
          <h2>Coach notes</h2>
          <CoachNotes kidId={kid.id} />
          <h3 style={{ marginTop: "1rem" }}>Badges</h3>
          <div className="badges">
            {badges.map((b) => (
              <span key={b.key} className={b.earned ? "badge" : "badge off"} title={b.detail}>
                {b.icon} {b.title}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
