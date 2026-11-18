import Link from "next/link";
import TopBar from "@/components/TopBar";
import Form from "@/components/Form";
import { requireTeacher } from "@/lib/auth";
import { sql } from "@/lib/db";
import { createClass } from "@/app/actions";

export default async function TeacherHome() {
  const t = await requireTeacher();
  const classes = await sql<{ id: string; name: string; code: string; kids: number }[]>`
    SELECT c.id, c.name, c.code, COUNT(k.id)::int AS kids
    FROM classrooms c LEFT JOIN kids k ON k.classroom_id = c.id
    WHERE c.teacher_id = ${t.userId} GROUP BY c.id ORDER BY c.created_at`;

  return (
    <>
      <TopBar home="/teacher" name={t.name} />
      <main className="wrap">
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <section className="stack">
            <h1>Your classes</h1>
            {classes.length === 0 && <p className="muted">No classes yet. Create your first one to start adding students.</p>}
            {classes.map((c) => (
              <Link key={c.id} href={`/teacher/class/${c.id}`} className="card" style={{ display: "block", color: "inherit" }}>
                <div className="row between">
                  <h2 style={{ margin: 0 }}>{c.name}</h2>
                  <span className="pill brand">{c.kids} students</span>
                </div>
                <p className="muted small" style={{ marginTop: "0.4rem", marginBottom: 0 }}>
                  Class code for student login: <span className="code">{c.code}</span>
                </p>
              </Link>
            ))}
          </section>
          <section className="card">
            <h2>New class</h2>
            <Form action={createClass} submit="Create class" resetOnOk>
              <div className="field">
                <label htmlFor="name">Class name</label>
                <input id="name" name="name" placeholder="e.g. Memory Club – Batch 1" required />
              </div>
            </Form>
          </section>
        </div>
      </main>
    </>
  );
}
