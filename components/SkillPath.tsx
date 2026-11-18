import Link from "next/link";
import { MASTERY_DAYS, MODULES } from "@/lib/modules";
import type { ModuleStat, ProgressRow } from "@/lib/progress";

// The six skills as one vertical path: done, current, and still to come.
export default function SkillPath({
  progress,
  stats,
  linkable = false,
  showScores = false,
}: {
  progress: ProgressRow[];
  stats: ModuleStat[];
  linkable?: boolean;
  showScores?: boolean;
}) {
  return (
    <ol className="path">
      {MODULES.map((m) => {
        const p = progress.find((x) => x.module === m.id)!;
        const st = stats.find((x) => x.module === m.id)!;
        const status = p.status.toLowerCase();
        const days = p.status === "MASTERED" ? MASTERY_DAYS : Math.min(st.masteryDays, MASTERY_DAYS);
        const sub =
          p.status === "MASTERED"
            ? "Mastered ✓"
            : p.status === "ACTIVE"
              ? `Working on it · ${days} of ${MASTERY_DAYS} days`
              : "Locked";
        const info = (
          <>
            <b>{m.title}</b>
            <span>{sub}</span>
          </>
        );
        return (
          <li key={m.id} className={status}>
            <div className="node">{p.status === "LOCKED" ? "🔒" : m.icon}</div>
            {linkable && p.status !== "LOCKED" ? (
              <Link href={`/kid/practice/${m.id}`} className="info">
                {info}
              </Link>
            ) : (
              <div className="info">{info}</div>
            )}
            {p.status !== "LOCKED" && (
              <div className="row" style={{ gap: "0.6rem", flexWrap: "nowrap" }}>
                {showScores && st.avg !== null && (
                  <span className={st.avg >= 80 ? "pill good" : st.avg < 60 ? "pill warn" : "pill"}>{st.avg}%</span>
                )}
                <span className="dots" aria-label={`${days} of ${MASTERY_DAYS} mastery days`}>
                  {Array.from({ length: MASTERY_DAYS }, (_, i) => (
                    <i key={i} className={i < days ? "on" : ""} />
                  ))}
                </span>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
