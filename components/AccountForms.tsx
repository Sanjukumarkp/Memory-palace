"use client";

import Form from "./Form";
import { login, signup } from "@/app/actions";

export function LoginForm({ role }: { role: "TEACHER" | "PARENT" }) {
  return (
    <Form action={login.bind(null, role)} submit="Log in">
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
    </Form>
  );
}

export function SignupForm({ role }: { role: "TEACHER" | "PARENT" }) {
  return (
    <Form action={signup.bind(null, role)} submit="Create account">
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" autoComplete="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password (8+ characters)</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      {role === "PARENT" && (
        <div className="field">
          <label htmlFor="code">Child's parent code (from the teacher)</label>
          <input id="code" name="code" placeholder="e.g. 7KQ2MXRA" required style={{ textTransform: "uppercase" }} />
        </div>
      )}
    </Form>
  );
}
