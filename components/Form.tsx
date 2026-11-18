"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions";

// Runs a server action and shows its error or success message.
// Fields keep their values on error; they clear only after success when resetOnOk is set.
export default function Form({
  action,
  children,
  submit,
  className,
  resetOnOk = false,
}: {
  action: (state: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit: string;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnOk && state?.ok) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => run(fd));
      }}
    >
      <div className="stack">
        {children}
        {state?.error && <div className="alert err">{state.error}</div>}
        {state?.ok && <div className="alert ok">{state.ok}</div>}
        <button className="btn block" disabled={pending}>
          {pending ? "Please wait…" : submit}
        </button>
      </div>
    </form>
  );
}
