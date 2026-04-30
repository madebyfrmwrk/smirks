import type { ColorPair, Palette } from './types';

/**
 * Soft palette: Tailwind *-600 (or *-700 for yellow/lime) on *-50.
 * All pairs cleared WCAG 2.1 non-text contrast (3:1) and APCA Lc >= 50.
 *
 * ORDER IS LOCKED. Do not reorder. Do not edit existing entries.
 * Append-only — and even appending is a major version bump because it shifts
 * `% length` outputs for some seeds.
 */
const SOFT_PAIRS = [
  { fg: '#dc2626', bg: '#fef2f2' }, // red-600     / red-50
  { fg: '#ea580c', bg: '#fff7ed' }, // orange-600  / orange-50
  { fg: '#d97706', bg: '#fffbeb' }, // amber-600   / amber-50
  { fg: '#a16207', bg: '#fefce8' }, // yellow-700  / yellow-50
  { fg: '#4d7c0f', bg: '#f7fee7' }, // lime-700    / lime-50
  { fg: '#059669', bg: '#ecfdf5' }, // emerald-600 / emerald-50
  { fg: '#0891b2', bg: '#ecfeff' }, // cyan-600    / cyan-50
  { fg: '#2563eb', bg: '#eff6ff' }, // blue-600    / blue-50
  { fg: '#7c3aed', bg: '#f5f3ff' }, // violet-600  / violet-50
  { fg: '#9333ea', bg: '#faf5ff' }, // purple-600  / purple-50
  { fg: '#c026d3', bg: '#fdf4ff' }, // fuchsia-600 / fuchsia-50
  { fg: '#e11d48', bg: '#fff1f2' }, // rose-600    / rose-50
] as const satisfies readonly ColorPair[];

/**
 * Bold palette: white fg on each soft palette's fg as bg.
 * Derived via .map() so the two palettes stay in sync forever.
 */
const BOLD_PAIRS: readonly ColorPair[] = SOFT_PAIRS.map(({ fg }) => ({
  fg: '#ffffff',
  bg: fg,
}));

export const palettes = {
  default: { pairs: SOFT_PAIRS } satisfies Palette,
  bold: { pairs: BOLD_PAIRS } satisfies Palette,
  monochrome: { pairs: [{ fg: '#000000', bg: '#ffffff' }] } satisfies Palette,
  duotone: {
    pairs: [
      { fg: '#000000', bg: '#ffffff' },
      { fg: '#ffffff', bg: '#000000' },
    ],
  } satisfies Palette,
} as const;
