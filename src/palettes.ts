import type { ColorPair, Palette } from './types';

/**
 * Soft palette: Tailwind *-600 on *-50, or *-700 where *-600 is too light to
 * clear 3:1 against its own tint (amber, yellow, lime).
 *
 * Hue-matched by design — the foreground and its background are always the same
 * hue. Mixing them across hues is reachable in the type (arrays-mode `Palette`)
 * and was measured as safe for contrast, but it looks wrong: a blue face on a
 * pink ground reads as a bug rather than as variety.
 *
 * Twelve chromatic hues in colour-wheel order, then neutral. Neutral has no
 * spectral position, so it sits last — which is also the only slot the
 * append-only rule allows.
 *
 * ORDER IS LOCKED. Do not reorder. Do not edit existing entries.
 * Append-only — and even appending is a major version bump because it shifts
 * `% length` outputs for some seeds.
 */
const SOFT_PAIRS = [
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
] as const satisfies readonly ColorPair[];

/**
 * Bold palette: white on each soft foreground.
 * Derived via .map() so the two palettes stay in sync forever.
 */
const BOLD_PAIRS: readonly ColorPair[] = SOFT_PAIRS.map(({ fg }) => ({ fg: '#ffffff', bg: fg }));

/**
 * The two achromatic pairs, declared once. `duotone` is their union, so the
 * three presets can never drift apart.
 */
const MONO_LIGHT = { fg: '#000000', bg: '#ffffff' } as const satisfies ColorPair;
const MONO_DARK = { fg: '#ffffff', bg: '#000000' } as const satisfies ColorPair;

/**
 * Freezes the presets at module init. `palettes` is shared mutable state: a
 * single write reroutes colours for every seed, and because the vanilla and
 * React entries each bundle their own copy, the two would then disagree about
 * the same seed in the same app.
 */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const child of Object.values(value)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

export const palettes = deepFreeze({
  default: { pairs: SOFT_PAIRS },
  bold: { pairs: BOLD_PAIRS },
  monochromeLight: { pairs: [MONO_LIGHT] },
  monochromeDark: { pairs: [MONO_DARK] },
  duotone: { pairs: [MONO_LIGHT, MONO_DARK] },
} as const satisfies Record<string, Palette>);
