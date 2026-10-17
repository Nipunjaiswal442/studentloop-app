import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");

function tokens(selector: string): Record<string, [number, number, number]> {
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? "";
  const out: Record<string, [number, number, number]> = {};
  for (const m of block.matchAll(/--([\w-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%;/g)) {
    out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  }
  return out;
}

function luminance([h, s, l]: [number, number, number]) {
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(channel(0)) + 0.7152 * lin(channel(8)) + 0.0722 * lin(channel(4));
}

function contrast(a: [number, number, number], b: [number, number, number]) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [text token, background token]: every pair the UI actually puts together. */
const TEXT_PAIRS: [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["foreground", "subtle"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "subtle"],
  ["primary-foreground", "primary"],
  ["primary-foreground", "primary-hover"],
  ["primary", "background"],
  ["primary", "card"],
  ["primary", "subtle"],
  ["primary-soft-foreground", "primary-soft"],
  ["success", "success-soft"],
  ["success", "card"],
  ["warning", "warning-soft"],
  ["danger", "danger-soft"],
  ["danger", "card"],
];

describe.each([
  ["light", ":root"],
  ["dark", "\\.dark"],
])("%s theme meets WCAG AA text contrast (4.5:1)", (_name, selector) => {
  const t = tokens(selector);

  it("defines every token", () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      expect(t[fg], `--${fg}`).toBeDefined();
      expect(t[bg], `--${bg}`).toBeDefined();
    }
  });

  it.each(TEXT_PAIRS)("%s on %s", (fg, bg) => {
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
  });
});

describe("brand colour", () => {
  it("is green in both themes", () => {
    for (const selector of [":root", "\\.dark"]) {
      const [hue] = tokens(selector).primary;
      expect(hue).toBeGreaterThanOrEqual(140);
      expect(hue).toBeLessThanOrEqual(170);
    }
  });

  it("is dark enough in light mode to read as dark green", () => {
    expect(tokens(":root").primary[2]).toBeLessThanOrEqual(30);
  });
});
