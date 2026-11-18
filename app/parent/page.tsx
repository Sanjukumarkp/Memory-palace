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
      <main className="wrap stack-lg">
        <div>
          <h1>Your children</h1>
          <p className="muted" style={{ marginTop: "0.25rem" }}>
            A quick look at today. Open a card for the full report and tips for home.
          </p>
        </div>
        {sums.length === 0 && <p className="muted">No children linked yet. Add one with the parent code from the teacher.</p>}
        <div className="grid grid-2">
          {sums.map((s) => (
            <Link key={s.id} href={`/parent/kid/${s.id}`} className="card role-card" style={{ textAlign: "left", padding: "1.5rem" }}>
              <div className="row between">
                <h2>{s.name}</h2>
                <span className={s.doneToday ? "pill good" : "pill"}>{s.doneToday ? "✓ Done today" : "Not yet today"}</span>
              </div>
              <div style={{ margin: "1.1rem 0 0.4rem" }} className="row between small">
                <span className="muted">Skills mastered</span>
                <b>{s.masteredCount} of 6</b>
              </div>
              <div className="meter good">
                <div style={{ width: `${(s.masteredCount / 6) * 100}%` }} />
              </div>
              <div className="row between small" style={{ marginTop: "1rem" }}>
                <span className="muted">
                  {s.currentModule ? `Working on ${moduleById(s.currentModule).title}` : s.masteredCount === 6 ? "Course complete 🎓" : "Getting started"}
                </span>
                <span>{s.streak > 0 ? `🔥 ${s.streak}-day streak` : `${s.last7}/7 days this week`}</span>
              </div>
              {s.weakest && s.weakest.avg < 70 && (
                <div className="alert sun small" style={{ marginTop: "1rem" }}>
                  Could use extra practice: {moduleById(s.weakest.module).title}
                </div>
              )}
            </Link>
          ))}
        </div>
        <details className="more">
          <summary>＋ Add another child</summary>
          <div className="card mid">
            <Form action={linkChild} submit="Add child" resetOnOk>
              <div className="field">
                <label htmlFor="code">Parent code from the teacher</label>
                <input id="code" name="code" required style={{ textTransform: "uppercase" }} />
              </div>
            </Form>
          </div>
        </details>
      </main>
    </>
  );
}
