"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUSES, type Application, type Status } from "@/lib/schema";
import type { Stats } from "@/lib/applications";

const JSON_HEADERS = { "content-type": "application/json" };

export default function Board(props: { email: string; isDemo: boolean; initial: Application[]; initialStats: Stats }) {
  const router = useRouter();
  const [apps, setApps] = useState(props.initial);
  const [stats, setStats] = useState(props.initialStats);
  const [error, setError] = useState("");

  async function refreshStats() {
    const r = await fetch("/api/stats");
    if (r.ok) setStats((await r.json()).stats);
  }

  async function call(url: string, method: string, body?: unknown): Promise<Response | null> {
    setError("");
    const res = await fetch(url, { method, headers: JSON_HEADERS, body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Request failed");
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
    });
    if (res) {
      const { application } = await res.json();
      setApps((a) => [...a, application]);
      form.reset();
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
    if (!confirm("Delete this application?")) return;
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
          <h1>Apply Board</h1>
          <span className="muted">{props.isDemo ? "Demo account with fictional data" : props.email}</span>
        </div>
        <div className="row">
          <a className="btn secondary" href="/api/applications/export" download>Export deadlines (.ics)</a>
          <button className="secondary" onClick={logout}>Sign out</button>
        </div>
      </header>

      <section className="stats" aria-label="Summary">
        <div className="panel stat"><b>{stats.total}</b>applications</div>
        <div className="panel stat"><b>{stats.responseRate === null ? "n/a" : `${stats.responseRate}%`}</b>response rate</div>
        <div className="panel stat"><b>{stats.upcoming.length}</b>deadlines in 14 days</div>
        <div className="panel stat"><b>{stats.byStatus.interview}</b>interviews</div>
      </section>

      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          add(e.currentTarget);
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "1.1rem" }}>Add application</h2>
        <div className="form-grid">
          <div><label htmlFor="company">Company</label><input id="company" name="company" required maxLength={120} /></div>
          <div><label htmlFor="role">Role</label><input id="role" name="role" required maxLength={120} /></div>
          <div>
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue="wishlist">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label htmlFor="deadline">Deadline</label><input id="deadline" name="deadline" type="date" /></div>
          <div><label htmlFor="url">Link</label><input id="url" name="url" type="url" maxLength={500} /></div>
        </div>
        <p className="err" role="alert">{error}</p>
        <button>Add</button>
      </form>

      <section className="board" aria-label="Applications by status" style={{ marginBlockStart: 16 }}>
        {STATUSES.map((status) => (
          <div className="col" key={status}>
            <h2>{status} ({apps.filter((a) => a.status === status).length})</h2>
            {apps.filter((a) => a.status === status).map((a) => (
              <article className="card" key={a.id}>
                <h3>{a.role}</h3>
                <div>{a.company}</div>
                {a.deadline && (
                  <div className={`meta ${soon.has(a.id) ? "soon" : ""}`}>
                    Deadline {a.deadline}{soon.has(a.id) ? ` (${soon.get(a.id)} days)` : ""}
                  </div>
                )}
                {/^https?:\/\//i.test(a.url) && (
                  <div className="meta"><a href={a.url} target="_blank" rel="noopener noreferrer">Posting</a></div>
                )}
                <label htmlFor={`s${a.id}`}>Status</label>
                <select id={`s${a.id}`} value={a.status} onChange={(e) => patch(a.id, { status: e.target.value as Status })}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <label htmlFor={`n${a.id}`}>Notes</label>
                <textarea
                  id={`n${a.id}`}
                  rows={2}
                  maxLength={2000}
                  defaultValue={a.notes}
                  onBlur={(e) => e.target.value !== a.notes && patch(a.id, { notes: e.target.value })}
                />
                <button className="danger" style={{ marginBlockStart: 8 }} onClick={() => remove(a.id)}>Delete</button>
              </article>
            ))}
          </div>
        ))}
      </section>
    </>
  );
}
