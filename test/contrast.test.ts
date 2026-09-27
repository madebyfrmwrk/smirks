import { describe, expect, it } from 'vitest';
import { palettes } from '../src';

/**
 * The README promises the shipped palettes clear WCAG 2.1 non-text contrast
 * (3:1) and APCA Lc >= 50. Nothing executed that promise until this file.
 *
 * Both formulas are written out rather than pulled from a dependency: the
 * zero-runtime-dependency rule does not cover devDeps, but APCA is explicitly
 * versioned, so a dependency could silently move the bar we assert against.
 * Literals plus the algorithm name are the safer pin.
 */

const channels = (hex: string): number[] =>
  [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));

/** WCAG 2.1 relative luminance. */
function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 contrast ratio, 1:1 to 21:1. Order-independent. */
function wcag(a: string, b: string): number {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** APCA 0.98G-4g screen luminance, with the black soft-clamp. */
function screenY(hex: string): number {
  const [r, g, b] = channels(hex) as [number, number, number];
  const y =
    0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: 1.414 is APCA's blkClmp exponent, not sqrt(2) — the spec fixes the literal.
  return y < 0.022 ? y + (0.022 - y) ** 1.414 : y;
}

/** APCA 0.98G-4g lightness contrast. Positive = dark text on light. */
function apca(text: string, bg: string): number {
  const yt = screenY(text);
  const yb = screenY(bg);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const s = (yb ** 0.56 - yt ** 0.57) * 1.14;
    return (s < 0.1 ? 0 : s - 0.027) * 100;
  }
  const s = (yb ** 0.65 - yt ** 0.62) * 1.14;
  return (s > -0.1 ? 0 : s + 0.027) * 100;
}

/** Hue angle in degrees, plus the saturation that says whether the angle means anything. */
function hsl(hex: string): { hue: number; sat: number } {
  const [r, g, b] = channels(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  if (delta === 0) return { hue: 0, sat: 0 };
  const sat = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === r) hue = ((g - b) / delta) % 6;
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  hue *= 60;
  return { hue: hue < 0 ? hue + 360 : hue, sat };
}

/** Shortest distance between two hue angles, in degrees. */
function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

const WCAG_FLOOR = 3;
const APCA_FLOOR = 50;
const HUE_TOLERANCE = 30;

describe('contrast helpers', () => {
  // If these drift the palette assertions below become meaningless, so pin the
  // helpers against published reference values first.
  it('match published reference values', () => {
    expect(wcag('#000000', '#ffffff')).toBeCloseTo(21, 4);
    expect(apca('#000000', '#ffffff')).toBeCloseTo(106.0407, 4);
    expect(apca('#ffffff', '#000000')).toBeCloseTo(-107.8847, 4);
    expect(apca('#888888', '#ffffff')).toBeCloseTo(63.0565, 4);
  });
});

describe('palettes.default', () => {
  it('ships the locked pairs, hue-matched, in colour-wheel order', () => {
    expect(palettes.default.pairs).toEqual([
      { fg: '#b91c1c', bg: '#fee2e2' }, // red-700     / red-100
      { fg: '#c2410c', bg: '#ffedd5' }, // orange-700  / orange-100
      { fg: '#b45309', bg: '#fef3c7' }, // amber-700   / amber-100
      { fg: '#a16207', bg: '#fef9c3' }, // yellow-700  / yellow-100
      { fg: '#4d7c0f', bg: '#ecfccb' }, // lime-700    / lime-100
      { fg: '#047857', bg: '#d1fae5' }, // emerald-700 / emerald-100
      { fg: '#0e7490', bg: '#cffafe' }, // cyan-700    / cyan-100
      { fg: '#1d4ed8', bg: '#dbeafe' }, // blue-700    / blue-100
      { fg: '#6d28d9', bg: '#ede9fe' }, // violet-700  / violet-100
      { fg: '#7e22ce', bg: '#f3e8ff' }, // purple-700  / purple-100
      { fg: '#a21caf', bg: '#fae8ff' }, // fuchsia-700 / fuchsia-100
      { fg: '#be123c', bg: '#ffe4e6' }, // rose-700    / rose-100
      { fg: '#404040', bg: '#f5f5f5' }, // neutral-700 / neutral-100
    ]);
  });

  it('pairs every foreground with its own hue', () => {
    // Hue-matching is the design, and nothing in the type enforces it — `pairs`
    // would happily hold a blue face on a pink ground, which measures fine for
    // contrast and looks like a bug. Assert the intent, not just the values.
    let worstGap = 0;
    for (const { fg, bg } of palettes.default.pairs) {
      const [a, b] = [hsl(fg), hsl(bg)];
      if (a.sat < 0.1 || b.sat < 0.1) continue; // neutral has no hue to match
      const gap = hueGap(a.hue, b.hue);
      expect(gap, `${fg} on ${bg}`).toBeLessThanOrEqual(HUE_TOLERANCE);
      worstGap = Math.max(worstGap, gap);
    }
    // amber-700 against amber-100 — Tailwind's tints are not perfectly hue-constant.
    expect(worstGap).toBeCloseTo(22.0351, 3);
  });

  it('clears both bars on every pair', () => {
    for (const { fg, bg } of palettes.default.pairs) {
      expect(wcag(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(WCAG_FLOOR);
      expect(Math.abs(apca(fg, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(APCA_FLOOR);
    }
  });

  it('clears the stricter 4.5:1 text bar as well, on every pair', () => {
    // Not required — an avatar is non-text content, so 3:1 is the bar it has to
    // meet. But *-700 on *-100 clears 4.5:1 on all thirteen, and that margin is
    // what made darkening the background affordable: the old *-600 foregrounds
    // on *-100 sat at 3.11:1 at the worst hue, 3.7% above the floor.
    for (const { fg, bg } of palettes.default.pairs) {
      expect(wcag(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('holds its measured headroom (erosion tripwire)', () => {
    let worstWcag = Number.POSITIVE_INFINITY;
    let worstApca = Number.POSITIVE_INFINITY;
    for (const { fg, bg } of palettes.default.pairs) {
      worstWcag = Math.min(worstWcag, wcag(fg, bg));
      worstApca = Math.min(worstApca, Math.abs(apca(fg, bg)));
    }
    // WCAG floor is amber-700 on amber-100; the APCA floor is orange-700 on
    // orange-100. Moving the palette to *-700 on *-100 lifted both: at *-600 on
    // *-50 the floor was 3.3526 / Lc 57.963.
    expect(worstWcag).toBeCloseTo(4.5097, 4);
    expect(worstApca).toBeCloseTo(65.2721, 4);
  });
});

describe('palettes.bold', () => {
  it('is white on each default foreground, in the same order', () => {
    expect(palettes.bold.pairs).toEqual(
      palettes.default.pairs.map(({ fg }) => ({ fg: '#ffffff', bg: fg })),
    );
  });

  it('clears both bars on every pair', () => {
    for (const { fg, bg } of palettes.bold.pairs) {
      expect(wcag(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(WCAG_FLOOR);
      expect(Math.abs(apca(fg, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(APCA_FLOOR);
    }
  });
});

describe('achromatic presets', () => {
  it('clear both bars', () => {
    for (const preset of [palettes.monochromeLight, palettes.monochromeDark, palettes.duotone]) {
      for (const { fg, bg } of preset.pairs) {
        expect(wcag(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(WCAG_FLOOR);
        expect(Math.abs(apca(fg, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(APCA_FLOOR);
      }
    }
  });
});

describe('palettes are frozen', () => {
  it('cannot be mutated at runtime', () => {
    // `palettes` is shared global state and the two entries each bundle their
    // own copy — an unfrozen mutation makes generateSvg and <Smirk> disagree
    // about the same seed in the same app.
    expect(Object.isFrozen(palettes)).toBe(true);
    expect(Object.isFrozen(palettes.default)).toBe(true);
    expect(Object.isFrozen(palettes.default.pairs)).toBe(true);
    expect(Object.isFrozen(palettes.default.pairs[0])).toBe(true);
    expect(Object.isFrozen(palettes.bold.pairs)).toBe(true);
    expect(Object.isFrozen(palettes.bold.pairs[0])).toBe(true);
    expect(Object.isFrozen(palettes.duotone.pairs)).toBe(true);
  });
});
