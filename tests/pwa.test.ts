import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import manifest from "../src/app/manifest";

const pub = (p: string) => join(process.cwd(), "public", p);
function pngSize(file: string) {
  const b = readFileSync(file);
  expect(b.subarray(1, 4).toString()).toBe("PNG");
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

describe("PWA", () => {
  const m = manifest();
  it("manifest is installable", () => {
    expect(m.name).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/board");
    expect(m.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  });
  it("icons exist and have the declared size, 192 and 512 present", () => {
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    for (const i of m.icons ?? []) {
      const f = pub(i.src.replace(/^\//, ""));
      expect(existsSync(f)).toBe(true);
      const { w, h } = pngSize(f);
      expect(`${w}x${h}`).toBe(i.sizes);
    }
    expect((m.icons ?? []).some((i) => i.purpose === "maskable")).toBe(true);
  });
  it("offline page exists and service worker never caches API or page data", () => {
    expect(existsSync(pub("offline.html"))).toBe(true);
    const sw = readFileSync(pub("sw.js"), "utf8");
    expect(sw).toContain('startsWith("/api/")');
    expect(sw).toContain("/offline.html");
    expect(sw).not.toMatch(/c\.put\(req[^)]*\)[^;]*api/);
  });
});
