import Link from "next/link";
import TopBar from "@/components/TopBar";
import Form from "@/components/Form";
import { requireParent } from "@/lib/auth";
import { sql } from "@/lib/db";
import { linkChild } from "@/app/actions";
import { kidSummary } from "@/lib/progress";
import { moduleById, type AgeBand } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function ParentHome() {
  const p = await requireParent();
  const kids = await sql<{ id: string; name: string; age_band: AgeBand }[]>`
    SELECT k.id, k.name, k.age_band FROM kids k JOIN parent_kids pk ON pk.kid_id = k.id
    WHERE pk.parent_id = ${p.userId} ORDER BY k.name`;
  const sums = await Promise.all(kids.map((k) => kidSummary(k)));

  return (
    <>
      <TopBar home="/parent" name={p.name} />
      <main className="wrap stack">
        <h1>Your children</h1>
        <div className="grid grid-2">
          {sums.map((s) => (
            <Link key={s.id} href={`/parent/kid/${s.id}`} className="card" style={{ color: "inherit", display: "block" }}>
              <div className="row between">
                <h2 style={{ margin: 0 }}>{s.name}</h2>
                <span className={s.doneToday ? "pill good" : "pill warn"}>{s.doneToday ? "Done today ✓" : "Not done today"}</span>
              </div>
              <div className="grid grid-3" style={{ marginTop: "0.75rem" }}>
                <div>
                  <div className="muted small">Streak</div>
                  <b>{s.streak > 0 ? `🔥 ${s.streak} days` : "–"}</b>
                </div>
                <div>
                  <div className="muted small">Skills mastered</div>
                  <b>{s.masteredCount}/6</b>
                </div>
                <div>
                  <div className="muted small">Working on</div>
                  <b>{s.currentModule ? moduleById(s.currentModule).title : s.masteredCount === 6 ? "Course complete" : "–"}</b>
                </div>
              </div>
              {s.weakest && s.weakest.avg < 70 && (
                <p className="small" style={{ marginTop: "0.6rem", marginBottom: 0, color: "var(--warn)" }}>
                  Needs practice: {moduleById(s.weakest.module).title} ({s.weakest.avg}%)
                </p>
              )}
            </Link>
          ))}
        </div>
        <section className="card mid">
          <h2>Add another child</h2>
          <Form action={linkChild} submit="Add child" resetOnOk>
            <div className="field">
              <label htmlFor="code">Parent code from the teacher</label>
              <input id="code" name="code" required style={{ textTransform: "uppercase" }} />
            </div>
          </Form>
        </section>
      </main>
    </>
  );
}
