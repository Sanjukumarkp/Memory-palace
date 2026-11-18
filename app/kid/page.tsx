import Link from "next/link";
import TopBar from "@/components/TopBar";
import SkillPath from "@/components/SkillPath";
import { requireKid } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dailyPlan, getProgress, moduleStats, practiceDays, streakFrom, type PlanTask } from "@/lib/progress";
import { badgesFor } from "@/lib/badges";
import { MODULES } from "@/lib/modules";

export const dynamic = "force-dynamic";

function taskIcon(t: PlanTask) {
  if (t.kind === "baseline") return "📏";
  if (t.kind === "review") return "🔁";
  const id = Number(t.key.split("-")[1]);
  return MODULES.find((m) => m.id === id)?.icon ?? "⭐";
}

function taskTitle(t: PlanTask) {
  // Titles carry the module icon already for practice tasks; the card shows it separately.
  return t.title.replace(/^\p{Extended_Pictographic}️?\s*/u, "");
}

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
  const done = plan.tasks.filter((t) => t.done).length;
  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  const message = plan.allDone
    ? "All done for today. Brilliant work! 🎉"
    : done === 0
      ? `${plan.tasks.length} short ${plan.tasks.length === 1 ? "activity" : "activities"} today. Let's go!`
      : `${done} of ${plan.tasks.length} done. Keep going!`;

  return (
    <>
      <TopBar home="/kid" name={kid.name} />
      <main className="wrap mid stack-lg">
        <section className="card hello">
          <div>
            <h1>Hi {kid.name}! 👋</h1>
            <p>{message}</p>
            {plan.tasks.length > 0 && (
              <div className="meter" aria-label={`${done} of ${plan.tasks.length} done`}>
                <div style={{ width: `${(done / plan.tasks.length) * 100}%` }} />
              </div>
            )}
          </div>
          <div className="streak-box">
            <b>🔥 {streak}</b>
            <span>day streak</span>
          </div>
        </section>

        {plan.courseComplete && <div className="alert sun">🎓 You've mastered all six skills! A little practice each day keeps them strong.</div>}

        <section>
          <div className="section-title">
            <h2>Today</h2>
          </div>
          <div className="tasks">
            {plan.tasks.map((t) => (
              <Link key={t.key} href={t.href} className={`task ${t.done ? "done" : ""}`}>
                <div className="badge-icon">{t.done ? "✅" : taskIcon(t)}</div>
                <div className="body">
                  <b>{taskTitle(t)}</b>
                  <span>{t.detail}</span>
                </div>
                <div className="go">{t.done ? "Again" : "Start →"}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="section-title">
            <h2>My skills</h2>
            <p>Score 80%+ on 3 days to unlock the next one</p>
          </div>
          <SkillPath progress={progress} stats={stats} linkable />
          {progress.find((p) => p.module === 5)?.status !== "LOCKED" && (
            <p className="small" style={{ marginTop: "0.75rem" }}>
              <Link href="/kid/palace">🏰 Change my palace spots</Link>
            </p>
          )}
        </section>

        <section className="card">
          <div className="section-title">
            <h2>My badges</h2>
            <p>
              {earned.length} of {badges.length} collected
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
            <p className="muted">Finish your first activity to win your first badge!</p>
          )}
          {locked.length > 0 && (
            <details className="more">
              <summary>See badges to unlock ({locked.length})</summary>
              <div className="badges">
                {locked.map((b) => (
                  <span key={b.key} className="badge off" title={b.detail}>
                    {b.icon} {b.title}
                  </span>
                ))}
              </div>
            </details>
          )}
        </section>
      </main>
    </>
  );
}
