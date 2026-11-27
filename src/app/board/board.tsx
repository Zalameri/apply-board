"use client";

import { useRef, useState } from "react";
import type { ParsedAd } from "@/lib/parse-ad";
import { useRouter } from "next/navigation";
import { STATUSES, type Application, type Status } from "@/lib/schema";
import { messages, statusLabel, type Lang } from "@/lib/i18n";
import LangSwitch from "../lang-switch";
import type { Stats } from "@/lib/applications";

const JSON_HEADERS = { "content-type": "application/json" };

export default function Board(props: { lang: Lang; email: string; isDemo: boolean; initial: Application[]; initialStats: Stats }) {
  const router = useRouter();
  const t = messages[props.lang];
  const [apps, setApps] = useState(props.initial);
  const [stats, setStats] = useState(props.initialStats);
  const [error, setError] = useState("");
  const [adText, setAdText] = useState("");
  const [parsed, setParsed] = useState<ParsedAd | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function readAd() {
    const res = await call("/api/parse-ad", "POST", { text: adText });
    if (!res) return;
    const { parsed: p } = (await res.json()) as { parsed: ParsedAd };
    setParsed(p);
    const el = formRef.current?.elements;
    if (!el) return;
    (el.namedItem("company") as HTMLInputElement).value = p.company;
    (el.namedItem("role") as HTMLInputElement).value = p.role;
    (el.namedItem("deadline") as HTMLInputElement).value = p.deadline ?? "";
    (el.namedItem("url") as HTMLInputElement).value = p.url;
  }

  async function refreshStats() {
    const r = await fetch("/api/stats");
    if (r.ok) setStats((await r.json()).stats);
  }

  async function call(url: string, method: string, body?: unknown): Promise<Response | null> {
    setError("");
    const res = await fetch(url, { method, headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? t.requestFailed);
      return null;
    }
    return res;
  }

  async function add(form: HTMLFormElement) {
    const f = new FormData(form);
    const res = await call("/api/applications", "POST", {
      company: f.get("company"),
      role: f.get("role"),
      status: f.get("status"),
      deadline: f.get("deadline") || null,
      url: f.get("url") || "",
      notes: parsed ? parsed.checklist.map((c) => `- [ ] ${c}`).join("\n").slice(0, 2000) : "",
    });
    if (res) {
      const { application } = await res.json();
      setApps((a) => [...a, application]);
      form.reset();
      setParsed(null);
      setAdText("");
      refreshStats();
    }
  }

  async function patch(id: number, changes: Partial<Application>) {
    const res = await call(`/api/applications/${id}`, "PATCH", changes);
    if (res) {
      const { application } = await res.json();
      setApps((a) => a.map((x) => (x.id === id ? application : x)));
      refreshStats();
    }
  }

  async function remove(id: number) {
    if (!confirm(t.confirmDelete)) return;
    if (await call(`/api/applications/${id}`, "DELETE")) {
      setApps((a) => a.filter((x) => x.id !== id));
      refreshStats();
    }
  }

  async function logout() {
    await call("/api/auth/logout", "POST");
    router.push("/");
    router.refresh();
  }

  const soon = new Map(stats.upcoming.map((u) => [u.id, u.daysLeft]));

  return (
    <>
      <header className="bar">
        <div>
          <h1>{t.appName}</h1>
          <span className="muted">{props.isDemo ? t.demoAccount : props.email}</span>
        </div>
        <div className="row">
          <a className="btn secondary" href="/api/applications/export" download>{t.exportIcs}</a>
          <LangSwitch lang={props.lang} />
          <button className="secondary" onClick={logout}>{t.signOut}</button>
        </div>
      </header>

      <section className="stats" aria-label={t.summary}>
        <div className="panel stat"><b>{stats.total}</b>{t.applications}</div>
        <div className="panel stat"><b>{stats.responseRate === null ? "n/a" : `${stats.responseRate}%`}</b>{t.responseRate}</div>
        <div className="panel stat"><b>{stats.upcoming.length}</b>{t.deadlines14}</div>
        <div className="panel stat"><b>{stats.byStatus.interview}</b>{t.interviews}</div>
      </section>

      <section className="panel" aria-labelledby="ad-h" style={{ marginBlockEnd: 16 }}>
        <h2 id="ad-h" style={{ marginTop: 0, fontSize: "1.1rem" }}>{t.pasteAd}</h2>
        <p className="muted">{t.pasteAdHelp}</p>
        <label htmlFor="ad">{t.adText}</label>
        <textarea id="ad" rows={5} maxLength={12000} value={adText} onChange={(e) => setAdText(e.target.value)} />
        <button type="button" style={{ marginBlockStart: 8 }} disabled={adText.trim().length < 10} onClick={readAd}>{t.fillFromAd}</button>
        {parsed && (
          <div aria-live="polite">
            <h3 style={{ fontSize: "1rem" }}>{t.checklistTitle}</h3>
            <ul>{parsed.checklist.map((c) => <li key={c}>{c}</li>)}</ul>
          </div>
        )}
      </section>

      <form
        ref={formRef}
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          add(e.currentTarget);
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>{t.addApplication}</h2>
        <div className="form-grid">
          <div><label htmlFor="company">{t.company}</label><input id="company" name="company" required maxLength={120} /></div>
          <div><label htmlFor="role">{t.role}</label><input id="role" name="role" required maxLength={120} /></div>
          <div>
            <label htmlFor="status">{t.status}</label>
            <select id="status" name="status" defaultValue="wishlist">
              {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(props.lang, s)}</option>)}
            </select>
          </div>
          <div><label htmlFor="deadline">{t.deadline}</label><input id="deadline" name="deadline" type="date" /></div>
          <div><label htmlFor="url">{t.link}</label><input id="url" name="url" type="url" maxLength={500} /></div>
        </div>
        <p className="err" role="alert">{error}</p>
        <button>{t.add}</button>
      </form>

      <section className="board" aria-label={t.byStatus} style={{ marginBlockStart: 16 }}>
        {STATUSES.map((status) => (
          <div className="col" key={status}>
            <h2>{statusLabel(props.lang, status)} ({apps.filter((a) => a.status === status).length})</h2>
            {apps.filter((a) => a.status === status).map((a) => (
              <article className="card" key={a.id}>
                <h3>{a.role}</h3>
                <div>{a.company}</div>
                {a.deadline && (
                  <div className={`meta ${soon.has(a.id) ? "soon" : ""}`}>
                    {t.deadline} {a.deadline}{soon.has(a.id) ? ` (${soon.get(a.id)} ${t.days})` : ""}
                  </div>
                )}
                {/^https?:\/\//i.test(a.url) && (
                  <div className="meta"><a href={a.url} target="_blank" rel="noopener noreferrer">{t.posting}</a></div>
                )}
                <label htmlFor={`s${a.id}`}>{t.status}</label>
                <select id={`s${a.id}`} value={a.status} onChange={(e) => patch(a.id, { status: e.target.value as Status })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(props.lang, s)}</option>)}
                </select>
                <label htmlFor={`n${a.id}`}>{t.notes}</label>
                <textarea
                  id={`n${a.id}`}
                  rows={2}
                  maxLength={2000}
                  defaultValue={a.notes}
                  onBlur={(e) => e.target.value !== a.notes && patch(a.id, { notes: e.target.value })}
                />
                <button className="danger" style={{ marginBlockStart: 8 }} onClick={() => remove(a.id)}>{t.delete}</button>
              </article>
            ))}
          </div>
        ))}
      </section>
    </>
  );
}
