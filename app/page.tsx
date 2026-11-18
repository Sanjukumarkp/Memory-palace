import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TopBar from "@/components/TopBar";
import { MODULES } from "@/lib/modules";

export default async function Home() {
  const s = await getSession();
  if (s?.role === "KID") redirect("/kid");
  if (s?.role === "TEACHER") redirect("/teacher");
  if (s?.role === "PARENT") redirect("/parent");

  return (
    <>
      <TopBar home="/" />
      <main className="wrap">
        <section className="hero">
          <h1>Train your memory, a little every day</h1>
          <p className="muted" style={{ maxWidth: 620, margin: "0 auto" }}>
            Six proven techniques, practised daily. Kids move on only after they master each skill, missed facts come back for review,
            and teachers and parents see exactly where each child needs help.
          </p>
        </section>
        <div className="grid grid-3" style={{ marginTop: "1.5rem" }}>
          <Link href="/kid/login" className="card role-card" style={{ color: "inherit" }}>
            <div className="emoji">🎒</div>
            <h2>I'm a student</h2>
            <p className="muted">Log in with your class code and PIN.</p>
            <span className="btn">Start practising</span>
          </Link>
          <Link href="/teacher/login" className="card role-card" style={{ color: "inherit" }}>
            <div className="emoji">🧑‍🏫</div>
            <h2>I'm a teacher</h2>
            <p className="muted">Create classes, add students, track progress.</p>
            <span className="btn secondary">Teacher login</span>
          </Link>
          <Link href="/parent/login" className="card role-card" style={{ color: "inherit" }}>
            <div className="emoji">👪</div>
            <h2>I'm a parent</h2>
            <p className="muted">See your child's daily practice and progress.</p>
            <span className="btn secondary">Parent login</span>
          </Link>
        </div>
        <section className="card" style={{ marginTop: "2rem" }}>
          <h2>The six skills</h2>
          <div className="grid grid-3" style={{ marginTop: "0.75rem" }}>
            {MODULES.map((m) => (
              <div key={m.id}>
                <h3>
                  {m.icon} {m.id}. {m.title}
                </h3>
                <p className="muted small">{m.blurb}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
