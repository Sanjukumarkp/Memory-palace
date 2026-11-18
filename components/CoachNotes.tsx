"use client";

import { useEffect, useState } from "react";

export default function CoachNotes({ kidId }: { kidId: string }) {
  const [data, setData] = useState<{ source: string; notes: string[] } | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    fetch(`/api/insight/${kidId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr(true));
  }, [kidId]);
  if (err) return <p className="muted">Couldn't load notes right now.</p>;
  if (!data) return <p className="muted">Looking at the practice data…</p>;
  return (
    <>
      <ul style={{ paddingLeft: "1.1rem", margin: 0 }}>
        {data.notes.map((n, i) => (
          <li key={i} style={{ marginBottom: "0.4rem" }}>
            {n}
          </li>
        ))}
      </ul>
      <p className="muted small" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
        {data.source === "ai" ? "Written by AI from this child's practice data." : "Based on this child's practice data."}
      </p>
    </>
  );
}
