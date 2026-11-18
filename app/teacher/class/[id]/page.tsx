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
      <main className="wrap stack">
        <div className="row between">
          <div>
            <h1>{cls.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              Students log in at <b>/kid/login</b> with class code <span className="code">{cls.code}</span>, their name and their PIN.
            </p>
          </div>
        </div>

        <div className="grid grid-3">
          <div className="card">
            <div className="muted small">Finished today's plan</div>
            <div style={{ fontSize: "2rem", fontWeight: 900 }}>
              {doneToday}/{kids.length}
            </div>
            <div className="muted small">{practisedToday} practised at least once today</div>
          </div>
          <div className="card">
            <div className="muted small">Need a nudge (no practice in 2+ days)</div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: inactive.length ? "var(--warn)" : "var(--good)" }}>{inactive.length}</div>
            <div className="muted small">{inactive.map((s) => s.name).join(", ") || "Everyone is on track"}</div>
          </div>
          <div className="card">
            <div className="muted small">Where the class is</div>
            <div className="small" style={{ marginTop: "0.3rem" }}>
              {moduleCounts.map(({ m, n }) => (
                <div key={m.id} className="row between">
                  <span>
                    {m.icon} {m.title}
                  </span>
                  <b>{n}</b>
                </div>
              ))}
              <div className="row between">
                <span>🎓 Course complete</span>
                <b>{finished}</b>
              </div>
            </div>
          </div>
        </div>

        <section className="card">
          <h2>Students</h2>
          {kids.length === 0 ? (
            <p className="muted">No students yet. Add them below.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Group</th>
                    <th>Today</th>
                    <th>Streak</th>
                    <th>Days (7d)</th>
                    <th>Working on</th>
                    <th>Mastered</th>
                    <th>Weakest skill</th>
                    <th>Memory Test</th>
                    <th>Parent code</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s, i) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/teacher/kid/${s.id}`}>
                          <b>{s.name}</b>
                        </Link>
                      </td>
                      <td className="small">{BAND_LABEL[s.band].split(" ")[0]}</td>
                      <td>{s.doneToday ? <span className="pill good">Done</span> : s.lastPractice === today ? <span className="pill brand">Started</span> : <span className="pill warn">Not yet</span>}</td>
                      <td>{s.streak > 0 ? `🔥 ${s.streak}` : "–"}</td>
                      <td>{s.last7}/7</td>
                      <td className="small">{s.currentModule ? `${moduleById(s.currentModule).icon} ${moduleById(s.currentModule).title}` : s.masteredCount === 6 ? "🎓 Complete" : "–"}</td>
                      <td>{s.masteredCount}/6</td>
                      <td className="small">
                        {s.weakest ? (
                          <span className={s.weakest.avg < 70 ? "pill warn" : "pill"}>
                            {moduleById(s.weakest.module).title} · {s.weakest.avg}%
                          </span>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="small">
                        {s.baseline === null ? "Not taken" : `${s.baseline}% → ${s.bestChallenge ?? "–"}${s.bestChallenge !== null ? "%" : ""}`}
                      </td>
                      <td>
                        <span className="code small">{kids[i].parent_code}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card mid">
          <h2>Add a student</h2>
          <p className="muted small">Use first names only. Give each child a 4-digit PIN they can remember, and share the parent code with their family.</p>
          <Form action={addKid.bind(null, cls.id)} submit="Add student" resetOnOk>
            <div className="grid grid-3">
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
