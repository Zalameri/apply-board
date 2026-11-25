import type { Db } from "./db";
import { createApplication } from "./applications";

/** Fictional sample data for the demo account. Deadlines are relative to `today` so the board always looks current. */
export function seedDemoApplications(db: Db, userId: number, today: string) {
  const plus = (days: number) => {
    const d = new Date(`${today}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  };
  const samples = [
    { company: "Northwind Labs", role: "Backend Intern", status: "wishlist", deadline: plus(12), notes: "Ask about the team before applying." },
    { company: "Contoso Robotics", role: "ML Engineering Intern", status: "applied", deadline: plus(5), notes: "Sent CV and cover letter." },
    { company: "Fabrikam Health", role: "Data Science Intern", status: "interview", deadline: plus(3), notes: "Technical call: revise SQL joins and probability." },
    { company: "Adventure Works", role: "Frontend Intern", status: "offer", deadline: null, notes: "Reply to the offer in two weeks." },
    { company: "Tailspin Systems", role: "QA Intern", status: "rejected", deadline: null, notes: "Ask for feedback." },
  ] as const;
  for (const s of samples) createApplication(db, userId, s);
}
