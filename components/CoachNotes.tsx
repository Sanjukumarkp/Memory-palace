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
  if (!data) return <p className="muted">Reading the practice data…</p>;
  return (
    <>
      <ul className="notes">
        {data.notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      <p className="faint small" style={{ marginTop: "0.9rem" }}>
        {data.source === "ai" ? "Written by AI from this child's practice data." : "Based on this child's practice data."}
      </p>
    </>
  );
}
