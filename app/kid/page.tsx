import Link from "next/link";
import TopBar from "@/components/TopBar";
import { requireKid } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dailyPlan, getProgress, moduleStats, practiceDays, streakFrom } from "@/lib/progress";
import { badgesFor } from "@/lib/badges";
import { MASTERY_DAYS, MODULES } from "@/lib/modules";

export const dynamic = "force-dynamic";

export default async function KidHome() {
  const k = await requireKid();
  const [kid] = await sql<{ name: string }[]>`SELECT name FROM kids WHERE id = ${k.kidId}`;
  if (!kid) return null;
  const [plan, progress, stats, days, badges] = await Promise.all([
    dailyPlan(k.kidId),
    getProgress(k.kidId),
    moduleStats(k.kidId),
    practiceDays(k.kidId),
    badgesFor(k.kidId),
  ]);
  const streak = streakFrom(days);
  const earned = badges.filter((b) => b.earned);

  return (
    <>
      <TopBar home="/kid" name={kid.name} />
      <main className="wrap mid stack">
        <div className="row between">
          <h1>Today's plan</h1>
          <span className="streak">{streak > 0 ? `🔥 ${streak}-day streak` : "Start a streak today!"}</span>
        </div>

        {plan.allDone && (
          <div className="alert ok" style={{ fontSize: "1.05rem" }}>
            🎉 All done for today, great work! Come back tomorrow to keep your streak going.
          </div>
        )}
        {plan.courseComplete && (
          <div className="alert ok">🎓 You've mastered all six skills! Keep practising a little each day so they stay strong.</div>
        )}

        <div className="stack">
          {plan.tasks.map((t) => (
            <div key={t.key} className={`task ${t.done ? "done" : ""}`}>
              <div className="row" style={{ flexWrap: "nowrap" }}>
                <div className="tick">{t.done ? "✓" : ""}</div>
                <div>
                  <b>{t.title}</b>
                  <div className="muted small">{t.detail}</div>
                </div>
              </div>
              <Link href={t.href} className={t.done ? "btn secondary" : "btn"}>
                {t.done ? "Again" : "Start"}
              </Link>
            </div>
          ))}
        </div>

        <section className="card">
          <h2>Your skills</h2>
          <p className="muted small">
            Master a skill by scoring {80}% or more on {MASTERY_DAYS} different days. Then the next one unlocks.
          </p>
          <div className="module-map">
            {MODULES.map((m) => {
              const p = progress.find((x) => x.module === m.id)!;
              const st = stats.find((x) => x.module === m.id)!;
              const cls = p.status.toLowerCase();
              const inner = (
                <>
                  <div className="icon">{p.status === "LOCKED" ? "🔒" : m.icon}</div>
                  <b>{m.title}</b>
                  <div className="muted small">{m.technique}</div>
                  <div className="dots" aria-label={`${Math.min(st.masteryDays, MASTERY_DAYS)} of ${MASTERY_DAYS} mastery days`}>
                    {Array.from({ length: MASTERY_DAYS }, (_, i) => (
                      <i key={i} className={i < st.masteryDays || p.status === "MASTERED" ? "on" : ""} />
                    ))}
                  </div>
                </>
              );
              return p.status === "LOCKED" ? (
                <div key={m.id} className={`mod ${cls}`}>
                  {inner}
                </div>
              ) : (
                <Link key={m.id} href={`/kid/practice/${m.id}`} className={`mod ${cls}`} style={{ color: "inherit" }}>
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        <section className="card">
          <div className="row between">
            <h2 style={{ margin: 0 }}>Badges</h2>
            <span className="muted small">
              {earned.length} of {badges.length}
            </span>
          </div>
          <div className="badges" style={{ marginTop: "0.75rem" }}>
            {badges.map((b) => (
              <span key={b.key} className={b.earned ? "badge" : "badge off"} title={b.detail}>
                {b.icon} {b.title}
              </span>
            ))}
          </div>
        </section>
        <p className="small muted center">
          <Link href="/kid/palace">🏰 Edit my memory palace</Link>
        </p>
      </main>
    </>
  );
}
