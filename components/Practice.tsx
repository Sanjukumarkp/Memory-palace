"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Mcq = { q: string; options: string[] };
type Card = { id: string; prompt: string; options: string[] };
type Content =
  | { kind: "recall"; title: string; text: string; questions: Mcq[] }
  | { kind: "flashcards" | "review"; cards: Card[] }
  | { kind: "tricks"; topic: string; items: string[]; example: string; seconds: number }
  | { kind: "story"; words: string[]; seconds: number }
  | { kind: "palace"; pairs: { spot: string; item: string }[]; seconds: number }
  | { kind: "challenge" | "baseline"; items: string[]; seconds: number };

type Line = { prompt: string; yours: string; correct: string; ok: boolean };
type Graded = {
  score: number;
  correct: number;
  total: number;
  lines: Line[];
  addedToReview: number;
  result: null | { levelChange: "up" | "down" | "same"; masteredNow: boolean; unlocked: number | null; masteryDays: number };
};

const TITLES: Record<number, string> = {
  1: "🧠 Read & Recall",
  2: "🗃️ Flashcard Boxes",
  3: "🎵 Memory Tricks",
  4: "📖 Story Links",
  5: "🏰 Memory Palace",
  6: "🏆 Memory Challenge",
};

const HOW: Record<string, string[]> = {
  recall: [
    "Read the passage carefully. Picture what's happening.",
    "When you feel ready, hide it.",
    "Answer from memory. Struggling to remember is what makes your brain stronger!",
  ],
  flashcards: [
    "New cards start in Box 1. Get one right and it moves up a box.",
    "Box 1 comes back tomorrow, Box 2 in 3 days, Box 3 in a week.",
    "Get one wrong and it goes back to Box 1. That's okay, it means you'll practise it more.",
  ],
  review: [
    "These cards are due today, including things you missed in other skills.",
    "Say the answer in your head before you tap. That's active recall!",
  ],
  tricks: [
    "Look at the list. Its order matters!",
    "Make a trick: take the first letters and make a word or a silly sentence, or turn it into a rhyme.",
    "Type your trick in the box. Then the list hides and you write it back in order.",
  ],
  story: [
    "Link every word into one crazy story, in order.",
    "Make the pictures BIG, funny and moving. A giant elephant opening an umbrella that rains mangoes!",
    "Then the words hide and you write down as many as you can.",
  ],
  palace: [
    "Each item is placed at a spot in YOUR memory palace.",
    "Picture each item doing something silly at that spot. A shark sleeping on your sofa!",
    "Then walk through your palace in your mind and say what's at each spot.",
  ],
  challenge: [
    "15 things, 60 seconds. Use your favourite technique: a story or your memory palace.",
    "Then write down as many as you can, in any order.",
  ],
  baseline: [
    "This first test shows where you're starting. Don't worry about the score!",
    "You'll see 15 things for 60 seconds. Then write down as many as you remember.",
    "At the end of the course you'll take it again and see how much you've grown.",
  ],
};

function useCountdown(seconds: number, running: boolean, onDone: () => void) {
  const [left, setLeft] = useState(seconds);
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!running || seconds <= 0) return;
    const endAt = Date.now() + seconds * 1000;
    setLeft(seconds);
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(l);
      if (l <= 0) {
        clearInterval(t);
        done.current();
      }
    }, 250);
    return () => clearInterval(t);
  }, [running, seconds]);
  return left;
}

function Timer({ left, total }: { left: number; total: number }) {
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="stack" style={{ gap: 4 }}>
      <div className="row between">
        <span className="muted small">Time to memorise</span>
        <span className="timer">
          {mm}:{ss}
        </span>
      </div>
      <div className="bar">
        <div style={{ width: `${(left / total) * 100}%` }} />
      </div>
    </div>
  );
}

export default function Practice({ module, mode }: { module: number; mode?: "baseline" | "review" }) {
  const [phase, setPhase] = useState<"intro" | "loading" | "study" | "answer" | "submitting" | "done" | "error">("intro");
  const [ex, setEx] = useState<{ id: string; content: Content } | null>(null);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const [answers, setAnswers] = useState<(string | number)[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [reveal, setReveal] = useState<number | null>(null);
  const [graded, setGraded] = useState<Graded | null>(null);
  const [note, setNote] = useState("");
  const router = useRouter();

  const kindKey = mode ?? ({ 1: "recall", 2: "flashcards", 3: "tricks", 4: "story", 5: "palace", 6: "challenge" } as Record<number, string>)[module];
  const title = mode === "review" ? "🔁 Daily review" : mode === "baseline" ? "📏 Your first Memory Test" : TITLES[module];

  const start = useCallback(async () => {
    setPhase("loading");
    setError(null);
    setAnswers([]);
    setQIndex(0);
    setReveal(null);
    setGraded(null);
    setNote("");
    const res = await fetch("/api/exercise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ module, baseline: mode === "baseline", review: mode === "review" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError({ msg: data.error, code: data.code });
      setPhase("error");
      return;
    }
    setEx(data);
    const c = data.content as Content;
    setPhase(c.kind === "flashcards" || c.kind === "review" ? "answer" : "study");
  }, [module, mode]);

  const submit = useCallback(
    async (responses: (string | number)[]) => {
      if (!ex) return;
      setPhase("submitting");
      const res = await fetch(`/api/exercise/${ex.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ msg: data.error });
        setPhase("error");
        return;
      }
      setGraded(data);
      setPhase("done");
      router.refresh(); // plan, streak and badges changed
    },
    [ex, router],
  );

  const c = ex?.content;
  const studySeconds = c && "seconds" in c ? c.seconds : 0;
  const left = useCountdown(studySeconds, phase === "study" && Boolean(c && "seconds" in c), () => setPhase("answer"));

  // ---------- Screens ----------
  if (phase === "intro") {
    return (
      <div className="card stack">
        <h1>{title}</h1>
        <h3>How it works</h3>
        <ol style={{ paddingLeft: "1.2rem", margin: 0 }}>
          {HOW[kindKey].map((h) => (
            <li key={h} style={{ marginBottom: "0.4rem" }}>
              {h}
            </li>
          ))}
        </ol>
        <button className="btn big" onClick={start}>
          I'm ready! Start
        </button>
      </div>
    );
  }

  if (phase === "loading" || phase === "submitting") {
    return (
      <div className="card center" style={{ padding: "3rem" }}>
        <div style={{ fontSize: "2.5rem" }}>{phase === "loading" ? "✨" : "🧮"}</div>
        <p className="muted">{phase === "loading" ? "Getting your practice ready…" : "Checking your answers…"}</p>
      </div>
    );
  }

  if (phase === "error" && error) {
    return (
      <div className="card stack center">
        <div style={{ fontSize: "2.5rem" }}>{error.code === "no_cards" ? "🎉" : error.code === "palace_setup" ? "🏰" : "😅"}</div>
        <p>{error.msg}</p>
        {error.code === "palace_setup" ? (
          <Link href="/kid/palace?next=5" className="btn">
            Build my palace
          </Link>
        ) : (
          <Link href="/kid" className="btn">
            Back to my plan
          </Link>
        )}
      </div>
    );
  }

  if (phase === "done" && graded) {
    const r = graded.result;
    const cheer = graded.score >= 90 ? "Amazing! 🌟" : graded.score >= 80 ? "Great job! 🎉" : graded.score >= 60 ? "Good effort! 💪" : "Keep going, you're learning! 🌱";
    return (
      <div className="card stack">
        <div className="center">
          <div className="result-score" style={{ color: graded.score >= 80 ? "var(--good)" : graded.score >= 60 ? "var(--brand)" : "var(--warn)" }}>
            {graded.score}%
          </div>
          <h2>{cheer}</h2>
          <p className="muted">
            You got {graded.correct} out of {graded.total}.
          </p>
        </div>
        {mode === "baseline" && <div className="alert ok">This is your starting score. Practise every day and watch it grow!</div>}
        {r?.masteredNow && <div className="alert ok">🏅 You mastered this skill!{r.unlocked ? " A new skill is unlocked. Check your plan!" : ""}</div>}
        {r && !r.masteredNow && graded.score >= 80 && mode !== "review" && (
          <div className="alert ok">That counts as a mastery day ({Math.min(r.masteryDays, 3)} of 3). Come back on another day for the next one.</div>
        )}
        {r?.levelChange === "up" && <div className="alert ok">⬆️ Level up! Next time will be a little harder.</div>}
        {r?.levelChange === "down" && <div className="alert err">Next time will be a little easier so you can build up again.</div>}
        {graded.addedToReview > 0 && (
          <p className="muted small">🔁 {graded.addedToReview} thing{graded.addedToReview === 1 ? "" : "s"} you missed will come back in your daily review.</p>
        )}
        <h3>Your answers</h3>
        <div className="lines">
          {graded.lines.map((l, i) => (
            <div key={i} className={`line ${l.ok ? "ok" : "no"}`}>
              <span>
                {l.ok ? "✓ " : "✗ "}
                {l.prompt !== l.correct ? (
                  <>
                    <b>{l.prompt}</b>
                    <br />
                    <span className="small">Answer: {l.correct}</span>
                  </>
                ) : (
                  <b>{l.correct}</b>
                )}
              </span>
              {!l.ok && <span className="muted small" style={{ textAlign: "right" }}>You: {l.yours || "(blank)"}</span>}
            </div>
          ))}
        </div>
        <div className="row">
          <a href="/kid" className="btn">
            Back to my plan
          </a>
          {mode !== "baseline" && (
            <button className="btn secondary" onClick={start}>
              Try another round
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!c) return null;

  // ---------- Exercises ----------
  if (c.kind === "recall") {
    if (phase === "study")
      return (
        <div className="card stack">
          <h2>{c.title}</h2>
          <div className="passage">{c.text}</div>
          <button className="btn big" onClick={() => setPhase("answer")}>
            I'm ready, hide it
          </button>
        </div>
      );
    const q = c.questions[qIndex];
    return (
      <div className="card stack">
        <div className="row between">
          <span className="pill brand">
            Question {qIndex + 1} of {c.questions.length}
          </span>
          <span className="muted small">No peeking. Answer from memory!</span>
        </div>
        <h2>{q.q}</h2>
        <div className="options">
          {q.options.map((o, i) => (
            <button
              key={i}
              className={`option ${answers[qIndex] === i ? "picked" : ""}`}
              onClick={() => {
                const next = [...answers];
                next[qIndex] = i;
                setAnswers(next);
                if (qIndex < c.questions.length - 1) setTimeout(() => setQIndex(qIndex + 1), 250);
                else setTimeout(() => submit(next), 300);
              }}
            >
              {o}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (c.kind === "flashcards" || c.kind === "review") {
    const card = c.cards[qIndex];
    return (
      <div className="card stack">
        <div className="row between">
          <span className="pill brand">
            Card {qIndex + 1} of {c.cards.length}
          </span>
        </div>
        <div className="passage center" style={{ fontSize: "1.4rem", fontWeight: 800 }}>
          {card.prompt}
        </div>
        <div className="options">
          {card.options.map((o, i) => (
            <button
              key={i}
              disabled={reveal !== null}
              className={`option ${answers[qIndex] === i ? "picked" : ""}`}
              onClick={() => {
                const next = [...answers];
                next[qIndex] = i;
                setAnswers(next);
                setReveal(i);
              }}
            >
              {o}
            </button>
          ))}
        </div>
        {reveal !== null && (
          <button
            className="btn"
            onClick={() => {
              setReveal(null);
              if (qIndex < c.cards.length - 1) setQIndex(qIndex + 1);
              else submit(answers);
            }}
          >
            {qIndex < c.cards.length - 1 ? "Next card →" : "Finish"}
          </button>
        )}
      </div>
    );
  }

  // List-memorising exercises share a study screen and a typed recall screen.
  const listItems: string[] =
    c.kind === "tricks" ? c.items : c.kind === "story" ? c.words : c.kind === "palace" ? c.pairs.map((p) => p.item) : (c as { items: string[] }).items;

  if (phase === "study") {
    return (
      <div className="card stack">
        <Timer left={left} total={studySeconds} />
        {c.kind === "tricks" && (
          <>
            <h2>{c.topic}</h2>
            <ol style={{ fontSize: "1.2rem", fontWeight: 800, paddingLeft: "1.5rem", margin: 0 }}>
              {c.items.map((it) => (
                <li key={it}>{it}</li>
              ))}
            </ol>
            <p className="muted small">
              Example trick: <i>{c.example}</i>
            </p>
            <div>
              <label htmlFor="mytrick">Make your own trick (acronym, sentence or rhyme)</label>
              <textarea id="mytrick" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. My Very Educated Mother…" />
            </div>
          </>
        )}
        {(c.kind === "story" || c.kind === "challenge" || c.kind === "baseline") && (
          <>
            <div className="chips">
              {listItems.map((w, i) => (
                <span key={w} className="chip">
                  {c.kind === "story" ? `${i + 1}. ` : ""}
                  {w}
                </span>
              ))}
            </div>
            {c.kind === "story" && (
              <div>
                <label htmlFor="story">Write your story (optional, but it helps!)</label>
                <textarea id="story" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="A giant elephant…" />
              </div>
            )}
          </>
        )}
        {c.kind === "palace" && (
          <div className="pairs">
            {c.pairs.map((p) => (
              <div key={p.spot} className="pair">
                <div className="spot">{p.spot}</div>
                <div className="item">{p.item}</div>
              </div>
            ))}
          </div>
        )}
        <button className="btn big" onClick={() => setPhase("answer")}>
          I've got it, test me!
        </button>
      </div>
    );
  }

  // Typed recall
  const ordered = c.kind === "tricks" || c.kind === "palace";
  const labels: string[] =
    c.kind === "palace" ? c.pairs.map((p) => p.spot) : c.kind === "tricks" ? c.items.map((_, i) => `#${i + 1}`) : listItems.map((_, i) => `${i + 1}`);
  return (
    <form
      className="card stack"
      onSubmit={(e) => {
        e.preventDefault();
        submit(labels.map((_, i) => String(answers[i] ?? "")));
      }}
    >
      <h2>
        {c.kind === "palace"
          ? "Walk through your palace. What's at each spot?"
          : c.kind === "tricks"
            ? `${c.topic}: write them in order`
            : "Write down every one you remember (any order)"}
      </h2>
      {(c.kind === "tricks" || c.kind === "story") && (
        <p className="muted small">
          {c.kind === "tricks" ? "Say your trick in your head first, then write each item." : "Replay your story in your head, picture by picture."}
        </p>
      )}
      <div className="grid" style={{ gridTemplateColumns: ordered ? "1fr" : "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.5rem" }}>
        {labels.map((label, i) => (
          <div key={i} className="row" style={{ flexWrap: "nowrap", gap: "0.5rem" }}>
            <span className="muted small" style={{ minWidth: ordered ? (c.kind === "palace" ? 130 : 32) : 22, fontWeight: 700 }}>
              {label}
            </span>
            <input
              autoFocus={i === 0}
              autoComplete="off"
              autoCapitalize="none"
              value={String(answers[i] ?? "")}
              onChange={(e) => {
                const next = [...answers];
                next[i] = e.target.value;
                setAnswers(next);
              }}
            />
          </div>
        ))}
      </div>
      <button className="btn big">Check my answers</button>
    </form>
  );
}
