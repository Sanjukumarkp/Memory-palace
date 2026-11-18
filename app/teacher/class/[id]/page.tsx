import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import Form from "@/components/Form";
import { requireTeacher } from "@/lib/auth";
import { sql, dayKey } from "@/lib/db";
import { addKid } from "@/app/actions";
import { kidSummary } from "@/lib/progress";
import { BAND_LABEL, MODULES, moduleById, type AgeBand } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await requireTeacher();
  const { id } = await params;
  const [cls] = await sql<{ id: string; name: string; code: string }[]>`
    SELECT id, name, code FROM classrooms WHERE id = ${id} AND teacher_id = ${t.userId}`;
  if (!cls) notFound();
  const kids = await sql<{ id: string; name: string; age_band: AgeBand; parent_code: string }[]>`
    SELECT id, name, age_band, parent_code FROM kids WHERE classroom_id = ${id} ORDER BY name`;
  const summaries = await Promise.all(kids.map((k) => kidSummary(k)));

  const today = dayKey();
  const doneToday = summaries.filter((s) => s.doneToday).length;
  const practisedToday = summaries.filter((s) => s.lastPractice === today).length;
  const inactive = summaries.filter((s) => !s.lastPractice || s.lastPractice < dayKey(new Date(Date.now() - 2 * 86400000)));
  const moduleCounts = MODULES.map((m) => ({ m, n: summaries.filter((s) => s.currentModule === m.id).length }));
  const finished = summaries.filter((s) => s.masteredCount === MODULES.length).length;

  return (
    <>
      <TopBar home="/teacher" name={t.name} links={[{ href: "/teacher", label: "All classes" }]} />
      <main className="wrap stack-lg">
        <div className="row between">
          <div>
            <h1>{cls.name}</h1>
            <p className="muted" style={{ marginTop: "0.25rem" }}>
              {kids.length} student{kids.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="card flat" style={{ padding: "0.75rem 1.1rem" }}>
            <div className="small muted">Class code for student login</div>
            <div className="code" style={{ fontSize: "1.3rem", background: "none", padding: 0 }}>
              {cls.code}
            </div>
          </div>
        </div>

        <div className="grid grid-3">
          <div className="card stat">
            <div className="label">Practised today</div>
            <div className="value">
              {doneToday} of {kids.length}
            </div>
            <div className="meter good">
              <div style={{ width: `${kids.length ? (doneToday / kids.length) * 100 : 0}%` }} />
            </div>
            <div className="hint" style={{ marginTop: "0.5rem" }}>
              {practisedToday - doneToday > 0 ? `${practisedToday - doneToday} started but not finished` : "Finished = today's plan complete"}
            </div>
          </div>
          <div className="card stat">
            <div className="label">Need a nudge</div>
            <div className="value" style={{ color: inactive.length ? "var(--warn)" : "var(--good)" }}>
              {inactive.length === 0 ? "None 🎉" : inactive.length}
            </div>
            <div className="hint">{inactive.length ? `No practice in 2+ days: ${inactive.map((s) => s.name).join(", ")}` : "Everyone practised recently"}</div>
          </div>
          <div className="card stat">
            <div className="label">Class progress</div>
            <div className="value">
              {(() => {
                const n = summaries.reduce((acc, s) => acc + s.masteredCount, 0);
                return `${n} skill${n === 1 ? "" : "s"}`;
              })()}
            </div>
            <div className="hint">
              mastered in total{finished ? ` · ${finished} finished the course` : ""}
              {moduleCounts.filter((x) => x.n).length > 0 &&
                ` · most are on ${[...moduleCounts].sort((a, b) => b.n - a.n)[0].m.title}`}
            </div>
          </div>
        </div>

        <section className="card">
          <div className="section-title">
            <h2>Students</h2>
            <p>Tap a name for the full report</p>
          </div>
          {kids.length === 0 ? (
            <p className="muted">No students yet. Add your first one below.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Today</th>
                    <th>This week</th>
                    <th style={{ minWidth: 180 }}>Progress</th>
                    <th>Needs help with</th>
                    <th>Memory Test</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/teacher/kid/${s.id}`}>
                          <b>{s.name}</b>
                        </Link>
                        <div className="small faint">{BAND_LABEL[s.band].split(" ")[0]}</div>
                      </td>
                      <td>
                        {s.doneToday ? (
                          <span className="pill good">✓ Done</span>
                        ) : s.lastPractice === today ? (
                          <span className="pill brand">Started</span>
                        ) : (
                          <span className="pill">Not yet</span>
                        )}
                      </td>
                      <td>
                        <b>{s.last7}</b>
                        <span className="muted">/7 days</span>
                        {s.streak > 1 && <div className="small faint">🔥 {s.streak}-day streak</div>}
                      </td>
                      <td>
                        <div className="meter good" style={{ maxWidth: 160 }}>
                          <div style={{ width: `${(s.masteredCount / 6) * 100}%` }} />
                        </div>
                        <div className="small muted" style={{ marginTop: "0.35rem" }}>
                          {s.masteredCount}/6 ·{" "}
                          {s.currentModule ? moduleById(s.currentModule).title : s.masteredCount === 6 ? "Complete 🎓" : "Not started"}
                        </div>
                      </td>
                      <td>
                        {s.weakest && s.weakest.avg < 70 ? (
                          <span className="pill warn">
                            {moduleById(s.weakest.module).title} · {s.weakest.avg}%
                          </span>
                        ) : (
                          <span className="faint small">Doing well</span>
                        )}
                      </td>
                      <td className="small">
                        {s.baseline === null ? (
                          <span className="faint">Not taken</span>
                        ) : (
                          <>
                            {s.baseline}%{s.bestChallenge !== null && <b style={{ color: "var(--good)" }}> → {s.bestChallenge}%</b>}
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card mid">
          <div className="section-title">
            <h2>Add a student</h2>
          </div>
          <p className="muted small" style={{ marginBottom: "1rem" }}>
            First name only, plus a 4-digit PIN the child can remember. You'll get a parent code to share with the family.
          </p>
          <Form action={addKid.bind(null, cls.id)} submit="Add student" resetOnOk>
            <div className="grid grid-3" style={{ gap: "0.9rem" }}>
              <div>
                <label htmlFor="name">First name</label>
                <input id="name" name="name" required maxLength={40} />
              </div>
              <div>
                <label htmlFor="band">Age group</label>
                <select id="band" name="band" defaultValue="MIDDLE">
                  {(Object.keys(BAND_LABEL) as AgeBand[]).map((b) => (
                    <option key={b} value={b}>
                      {BAND_LABEL[b]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="pin">4-digit PIN</label>
                <input id="pin" name="pin" inputMode="numeric" pattern="\d{4}" maxLength={4} required />
              </div>
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
