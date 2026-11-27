"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { messages, type Lang } from "@/lib/i18n";
import LangSwitch from "./lang-switch";

export default function AuthForm({ demoEnabled, lang }: { demoEnabled: boolean; lang: Lang }) {
  const t = messages[lang];
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
      setError((await res.json().catch(() => ({}))).error ?? t.wentWrong);
    }
  }

  return (
    <div className="auth panel">
      <h1>{t.appName}</h1>
      <p className="muted">{t.tagline}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          post(`/api/auth/${mode}`, { email: f.get("email"), password: f.get("password") });
        }}
      >
        <label htmlFor="email">{t.email}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">{t.password}</label>
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
          <button disabled={busy}>{mode === "login" ? t.signIn : t.createAccount}</button>
          <button type="button" className="secondary" onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? t.needAccount : t.haveAccount}
          </button>
          {demoEnabled && (
            <button type="button" className="secondary" disabled={busy} onClick={() => post("/api/auth/demo")}>
              {t.tryDemo}
                        </button>
          )}
          <LangSwitch lang={lang} />
        </div>
      </form>
    </div>
  );
}
