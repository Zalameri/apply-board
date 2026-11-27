import { describe, it, expect } from "vitest";
import { LANGS, dirOf, messages, normalizeLang, statusLabel } from "../src/lib/i18n";
import { STATUSES } from "../src/lib/schema";

describe("i18n", () => {
  it("Arabic and English define exactly the same keys", () => {
    expect(Object.keys(messages.ar).sort()).toEqual(Object.keys(messages.en).sort());
  });
  it("no message is empty", () => {
    for (const l of LANGS) for (const v of Object.values(messages[l])) expect(v.trim()).not.toBe("");
  });
  it("unknown or missing language falls back to English; Arabic is RTL", () => {
    expect(normalizeLang(undefined)).toBe("en");
    expect(normalizeLang("fr")).toBe("en");
    expect(normalizeLang("ar")).toBe("ar");
    expect(dirOf("ar")).toBe("rtl");
    expect(dirOf("en")).toBe("ltr");
  });
  it("every status has an Arabic label and English keeps the API value", () => {
    for (const s of STATUSES) {
      expect(statusLabel("ar", s)).toMatch(/[؀-ۿ]/);
      expect(statusLabel("en", s)).toBe(s);
    }
  });
});
