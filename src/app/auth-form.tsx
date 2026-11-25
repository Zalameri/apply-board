"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthForm({ demoEnabled }: { demoEnabled: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setError("");
    const res = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    setBusy(false);
    if (res.ok) {
      router.push("/board");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Something went wrong");
    }
  }

  return (
    <div className="auth panel">
      <h1>Apply Board</h1>
      <p className="muted">Track internship applications, deadlines and notes in one place.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          post(`/api/auth/${mode}`, { email: f.get("email"), password: f.get("password") });
        }}
      >
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">Password (8+ characters)</label>
        <input
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          required
        />
        <p className="err" role="alert">{error}</p>
        <div className="row">
          <button disabled={busy}>{mode === "login" ? "Sign in" : "Create account"}</button>
          <button type="button" className="secondary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Need an account?" : "Have an account?"}
          </button>
          {demoEnabled && (
            <button type="button" className="secondary" disabled={busy} onClick={() => post("/api/auth/demo")}>
              Try the demo
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
