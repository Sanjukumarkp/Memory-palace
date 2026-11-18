"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePalace } from "@/app/actions";

export default function PalaceBuilder({
  initial,
  count,
  suggestions,
  nextHref,
}: {
  initial: string[];
  count: number;
  suggestions: string[];
  nextHref: string;
}) {
  const router = useRouter();
  const [spots, setSpots] = useState<string[]>(() => {
    const base = [...initial];
    while (base.length < count) base.push("");
    return base;
  });
  const [msg, setMsg] = useState<{ error?: string; ok?: string } | undefined>();
  const [saving, setSaving] = useState(false);
  const unused = suggestions.filter((s) => !spots.some((x) => x.trim().toLowerCase() === s.toLowerCase()));

  function fillNext(s: string) {
    const i = spots.findIndex((x) => !x.trim());
    if (i < 0) return;
    const next = [...spots];
    next[i] = s;
    setSpots(next);
  }

  return (
    <div className="card stack">
      <h1>🏰 Build your memory palace</h1>
      <p>
        Think of a place you know really well, like your home. Walk through it in your mind and pick {count} spots <b>in the order you'd pass them</b>.
        You'll use the same route every time.
      </p>
      <div className="stack" style={{ gap: "0.5rem" }}>
        {spots.map((s, i) => (
          <div key={i} className="row" style={{ flexWrap: "nowrap" }}>
            <span className="muted small" style={{ minWidth: 26, fontWeight: 800 }}>
              {i + 1}
            </span>
            <input
              value={s}
              placeholder={i === 0 ? "e.g. Front door" : "Next spot"}
              onChange={(e) => {
                const next = [...spots];
                next[i] = e.target.value;
                setSpots(next);
              }}
            />
          </div>
        ))}
      </div>
      {unused.length > 0 && spots.some((x) => !x.trim()) && (
        <div>
          <div className="muted small" style={{ marginBottom: "0.4rem" }}>
            Ideas (tap to add):
          </div>
          <div className="chips">
            {unused.slice(0, 12).map((s) => (
              <button key={s} type="button" className="option" style={{ padding: "0.4rem 0.7rem" }} onClick={() => fillNext(s)}>
                + {s}
              </button>
            ))}
          </div>
        </div>
      )}
      <button type="button" className="linkbtn small" style={{ textAlign: "left" }} onClick={() => setSpots([...spots, ""])}>
        + Add another spot
      </button>
      {msg?.error && <div className="alert err">{msg.error}</div>}
      {msg?.ok && <div className="alert ok">{msg.ok}</div>}
      <button
        className="btn big"
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          const r = await savePalace(spots);
          setSaving(false);
          setMsg(r);
          if (r?.ok) setTimeout(() => router.push(nextHref), 600);
        }}
      >
        {saving ? "Saving…" : "Save my palace"}
      </button>
    </div>
  );
}
