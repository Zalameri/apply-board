import type { Application } from "./schema";

/** Escape text values as RFC 5545 requires (backslash, semicolon, comma, newline). */
export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 octets (RFC 5545 section 3.1), never splitting a UTF-8 character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts: string[] = [];
  let cur = "";
  let curBytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (curBytes + n > limit) {
      parts.push(cur);
      cur = "";
      curBytes = 0;
      limit = 74; // continuation lines start with one space
    }
    cur += ch;
    curBytes += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const compact = (d: string) => d.replace(/-/g, "");

function nextDay(d: string): string {
  const t = new Date(`${d}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** One all-day event per application that has a deadline. `stamp` is injectable for tests. */
export function buildIcs(apps: Application[], stamp = new Date()): string {
  const dtstamp = stamp.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//apply-board//EN", "CALSCALE:GREGORIAN"];
  for (const a of apps) {
    if (!a.deadline) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:application-${a.id}@apply-board`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(a.deadline)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(a.deadline))}`,
      `SUMMARY:${escapeIcsText(`Deadline: ${a.role} at ${a.company}`)}`,
      `DESCRIPTION:${escapeIcsText(`Status: ${a.status}${a.url ? `\n${a.url}` : ""}`)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}
