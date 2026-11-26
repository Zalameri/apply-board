/**
 * Local, rule-based job-ad parser. It runs on the server with no network call and no API key, so
 * "paste a job ad" works in demo mode too. It only extracts what the text actually says; fields it
 * cannot find stay empty and the user fills them in.
 */
export interface ParsedAd {
  company: string;
  role: string;
  deadline: string | null;
  url: string;
  requirements: string[];
  checklist: string[];
}

export const MAX_AD_LENGTH = 12000;

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

function isoDate(y: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt.toISOString().slice(0, 10);
}

/** Finds a date written as 2026-12-15, 15/12/2026 (day first) or "15 December 2026" / "December 15, 2026". */
export function findDate(s: string, today: string): string | null {
  let m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return isoDate(+m[1], +m[2], +m[3]);
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if (m) return isoDate(+m[3], +m[2], +m[1]);
  const monthRe = MONTHS.map((x) => x.slice(0, 3) + "[a-z]*").join("|");
  m = s.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${monthRe})\\.?,?\\s+(\\d{4})\\b`, "i"));
  if (m) return isoDate(+m[3], MONTHS.findIndex((x) => x.startsWith(m![2].slice(0, 3).toLowerCase())) + 1, +m[1]);
  m = s.match(new RegExp(`\\b(${monthRe})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i"));
  if (m) return isoDate(+m[3], MONTHS.findIndex((x) => x.startsWith(m![1].slice(0, 3).toLowerCase())) + 1, +m[2]);
  void today;
  return null;
}

const LABEL = (names: string) => new RegExp(`^\\s*(?:${names})\\s*[:\\-–]\\s*(.+)$`, "im");

const SKILLS = [
  "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "SQL", "React", "Node.js", "Next.js", "Django",
  "Flask", "Docker", "Git", "Linux", "AWS", "Azure", "Machine Learning", "Data Structures", "Algorithms", "REST", "HTML", "CSS",
  "PyTorch", "TensorFlow", "Pandas", "PostgreSQL", "MySQL", "MongoDB", "Kubernetes", "CI/CD",
];

function mentions(text: string, skill: string): boolean {
  const esc = skill.replace(/[.+/]/g, "\\$&");
  return new RegExp(`(^|[^A-Za-z0-9])${esc}($|[^A-Za-z0-9+#])`, "i").test(text);
}

function bulletLines(text: string): string[] {
  const out: string[] = [];
  let inReq = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^(requirements?|qualifications?|what you('|’)ll need|you have|skills)\b.*:?$/i.test(line) && line.length < 50) {
      inReq = true;
      continue;
    }
    if (inReq && /^(responsibilities|benefits|about|what we offer|how to apply)\b/i.test(line)) inReq = false;
    const bullet = line.match(/^(?:[-•*·]|\d+[.)])\s+(.+)$/);
    if (inReq && bullet) out.push(bullet[1].slice(0, 200));
  }
  return out.slice(0, 8);
}

export function parseJobAd(text: string, today: string): ParsedAd {
  const t = text.slice(0, MAX_AD_LENGTH);
  const lines = t.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let role = LABEL("role|position|job title|title")?.exec(t)?.[1]?.trim() ?? "";
  let company = LABEL("company|employer|organi[sz]ation")?.exec(t)?.[1]?.trim() ?? "";

  if (!role || !company) {
    const head = lines[0] ?? "";
    const m = head.match(/^(.{3,100}?)\s+(?:at|@|-|–|\|)\s+(.{2,100})$/i);
    if (m && !head.includes(":")) {
      if (!role) role = m[1].trim();
      if (!company) company = m[2].trim();
    }
  }
  if (!company) {
    const m = t.match(/\b(?:join|about)\s+([A-Z][\w&.\- ]{1,60}?)(?:[,.!\n]| as | and )/);
    if (m) company = m[1].trim();
  }
  if (!role && lines[0] && lines[0].length <= 100 && !lines[0].includes(":")) role = lines[0];

  let deadline: string | null = null;
  for (const line of t.split(/\r?\n/)) {
    if (/deadline|apply (?:by|before)|applications? (?:close|due)|closing date|due date/i.test(line)) {
      deadline = findDate(line, today);
      if (deadline) break;
    }
  }

  const url = t.match(/https?:\/\/[^\s<>"')]+/i)?.[0].replace(/[.,;]+$/, "") ?? "";
  const requirements = bulletLines(t);
  const skills = SKILLS.filter((s) => mentions(t, s)).slice(0, 8);

  const checklist: string[] = [];
  if (skills.length) checklist.push(`Show a project or experience that uses: ${skills.join(", ")}.`);
  for (const r of requirements.slice(0, 3)) checklist.push(`Prepare evidence for: ${r}`);
  if (company) checklist.push(`Read what ${company} builds and write one sentence on why you want to join.`);
  if (deadline) checklist.push(`Send the application before ${deadline}.`);
  checklist.push("Tailor your CV: put the most relevant project at the top.");
  checklist.push("Prepare two questions to ask the interviewer.");

  return {
    company: company.slice(0, 120),
    role: role.slice(0, 120),
    deadline,
    url: /^https?:\/\//i.test(url) ? url.slice(0, 500) : "",
    requirements,
    checklist,
  };
}
