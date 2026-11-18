"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { classNames, kidLogin } from "@/app/actions";

export default function KidLogin() {
  const [state, run, pending] = useActionState(kidLogin, undefined);
  const [code, setCode] = useState("");
  const [names, setNames] = useState<string[] | null>(null);
  const [looking, setLooking] = useState(false);
  const [codeErr, setCodeErr] = useState("");
  const [name, setName] = useState("");

  async function findClass() {
    setLooking(true);
    setCodeErr("");
    const list = await classNames(code);
    setLooking(false);
    if (!list.length) setCodeErr("We couldn't find that class code. Check with your teacher.");
    else setNames(list);
  }

  return (
    <main className="wrap narrow" style={{ paddingTop: "3rem" }}>
      <div className="card stack">
        <div className="center">
          <div style={{ fontSize: "3rem" }}>🧠</div>
          <h1>Let's practise!</h1>
        </div>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => run(fd));
          }}
        >
          <div className="field">
            <label htmlFor="code">Class code</label>
            <div className="row" style={{ flexWrap: "nowrap" }}>
              <input
                id="code"
                name="code"
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  setNames(null);
                }}
                placeholder="e.g. K7M2QX"
                autoComplete="off"
                style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}
              />
              {!names && (
                <button type="button" className="btn" onClick={findClass} disabled={code.length < 4 || looking}>
                  {looking ? "…" : "Next"}
                </button>
              )}
            </div>
          </div>
          {codeErr && <div className="alert err">{codeErr}</div>}
          {names && (
            <>
              <div className="field">
                <label htmlFor="name">Who are you?</label>
                <select id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)}>
                  <option value="" disabled>
                    Pick your name
                  </option>
                  {names.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="pin">Your secret PIN</label>
                <input
                  id="pin"
                  name="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  required
                  style={{ fontSize: "1.5rem", letterSpacing: "0.5em", textAlign: "center" }}
                />
              </div>
              {state?.error && <div className="alert err">{state.error}</div>}
              <button className="btn big block" disabled={pending}>
                {pending ? "Opening…" : "Let's go! 🚀"}
              </button>
            </>
          )}
        </form>
        <p className="small muted center">
          <Link href="/">Back</Link>
        </p>
      </div>
    </main>
  );
}
