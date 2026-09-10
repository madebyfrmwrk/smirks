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
      { fg: '#dc2626', bg: '#fef2f2' }, // red-600     / red-50
      { fg: '#ea580c', bg: '#fff7ed' }, // orange-600  / orange-50
      { fg: '#b45309', bg: '#fffbeb' }, // amber-700   / amber-50
      { fg: '#a16207', bg: '#fefce8' }, // yellow-700  / yellow-50
      { fg: '#4d7c0f', bg: '#f7fee7' }, // lime-700    / lime-50
      { fg: '#059669', bg: '#ecfdf5' }, // emerald-600 / emerald-50
      { fg: '#0891b2', bg: '#ecfeff' }, // cyan-600    / cyan-50
      { fg: '#2563eb', bg: '#eff6ff' }, // blue-600    / blue-50
      { fg: '#7c3aed', bg: '#f5f3ff' }, // violet-600  / violet-50
      { fg: '#9333ea', bg: '#faf5ff' }, // purple-600  / purple-50
      { fg: '#c026d3', bg: '#fdf4ff' }, // fuchsia-600 / fuchsia-50
      { fg: '#e11d48', bg: '#fff1f2' }, // rose-600    / rose-50
      { fg: '#525252', bg: '#fafafa' }, // neutral-600 / neutral-50
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
    // amber-700 against amber-50 — Tailwind's tints are not perfectly hue-constant.
    expect(worstGap).toBeCloseTo(22.0, 1);
  });

  it('clears both bars on every pair', () => {
    for (const { fg, bg } of palettes.default.pairs) {
      expect(wcag(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(WCAG_FLOOR);
      expect(Math.abs(apca(fg, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(APCA_FLOOR);
    }
  });

  it('holds its measured headroom (erosion tripwire)', () => {
    let worstWcag = Number.POSITIVE_INFINITY;
    let worstApca = Number.POSITIVE_INFINITY;
    for (const { fg, bg } of palettes.default.pairs) {
      worstWcag = Math.min(worstWcag, wcag(fg, bg));
      worstApca = Math.min(worstApca, Math.abs(apca(fg, bg)));
    }
    // Both minima are orange-600 #ea580c on orange-50 #fff7ed. Moving amber from
    // *-600 to *-700 lifted the floor here: amber was the worst pair at 3.07 / Lc 56.0.
    expect(worstWcag).toBeCloseTo(3.3526, 4);
    expect(worstApca).toBeCloseTo(57.963, 3);
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
