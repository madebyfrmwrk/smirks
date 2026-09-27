import type { ColorPair, Palette } from './types';

/**
 * Soft palette: Tailwind *-700 on *-100, uniformly — no per-hue exceptions.
 *
 * It was *-600 on *-50 through 0.4.0. A *-50 tint sits within about 1.06:1 of
 * white, so on a white page the avatar barely read as a shape at all; *-100
 * roughly doubles that separation. Darkening the foreground to *-700 in the
 * same step is what keeps the change from eating the contrast budget: on *-100
 * the old foregrounds still cleared 3:1, but only by 3.7% at the worst hue,
 * whereas *-700 clears 4.5:1 — the stricter text bar — on all thirteen.
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
