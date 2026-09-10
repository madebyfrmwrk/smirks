import { EYES } from './data/eyes';
import { MOUTHS } from './data/mouths';
import { fnv1a } from './hash';
import { palettes } from './palettes';
import type { ColorPair, GeneratedSmirk, Palette, SmirkColorOptions } from './types';

export type SvgOptions = SmirkColorOptions & { title?: string | undefined };

export const VIEWBOX_SIZE = 512;
const CELL = 32;
const GRID = 16;

/**
 * Bitmap layout (load-bearing):
 *   - 32 bytes per variant = 256 bits = 16 rows * 16 columns.
 *   - Row-major: row r occupies bytes r*2 and r*2+1.
 *   - Within each pair of bytes, bit (7 - (x % 8)) of byte (y*2 + (x >>> 3))
 *     represents cell (x, y). MSB-first within byte.
 */
function isCellSet(bitmap: Uint8Array, x: number, y: number): boolean {
  const byte = bitmap[y * 2 + (x >>> 3)];
  if (byte === undefined) return false;
  return (byte & (1 << (7 - (x & 7)))) !== 0;
}

const pathCache = new WeakMap<Uint8Array, string>();

/**
 * Run-length-encode a 16x16 bitmap into an SVG path `d` string.
 *
 * RLE is HORIZONTAL ONLY by design. Vertically adjacent filled cells produce
 * two separate rect subpaths, never one tall rect. See test/bitmap.test.ts.
 *
 * Returns "" for an empty bitmap.
 */
export function bitmapToPath(bitmap: Uint8Array): string {
  const cached = pathCache.get(bitmap);
  if (cached !== undefined) return cached;

  let out = '';
  for (let y = 0; y < GRID; y++) {
    let runStart = -1;
    for (let x = 0; x < GRID; x++) {
      const filled = isCellSet(bitmap, x, y);
      if (filled && runStart === -1) {
        runStart = x;
      } else if (!filled && runStart !== -1) {
        out += emitRect(runStart, y, x - runStart);
        runStart = -1;
      }
    }
    if (runStart !== -1) {
      out += emitRect(runStart, y, GRID - runStart);
    }
  }

  pathCache.set(bitmap, out);
  return out;
}

function emitRect(x: number, y: number, runLen: number): string {
  const px = x * CELL;
  const py = y * CELL;
  const w = runLen * CELL;
  return `M${px} ${py}h${w}v${CELL}h-${w}z`;
}

function pickFromPalette(hash: number, palette: Palette): ColorPair {
  if ('pairs' in palette) {
    const pairs = palette.pairs;
    if (pairs.length === 0) {
      throw new Error('smirks: palette.pairs must not be empty');
    }
    const idx = ((hash >>> 16) & 0xff) % pairs.length;
    const pair = pairs[idx];
    if (pair === undefined) throw new Error('smirks: palette resolution failed');
    return pair;
  }
  const fgs = palette.fg;
  const bgs = palette.bg;
  if (fgs.length === 0 || bgs.length === 0) {
    throw new Error('smirks: palette.fg and palette.bg must not be empty');
  }
  const fg = fgs[((hash >>> 16) & 0xff) % fgs.length];
  const bg = bgs[((hash >>> 24) & 0xff) % bgs.length];
  if (fg === undefined || bg === undefined) {
    throw new Error('smirks: palette resolution failed');
  }
  return { fg, bg };
}

function resolveColors(hash: number, options: SmirkColorOptions): ColorPair {
  if (options.mode === 'currentColor') {
    return { fg: 'currentColor', bg: 'transparent' };
  }
  const palette = options.palette ?? palettes.default;
  const picked = pickFromPalette(hash, palette);
  return {
    fg: options.fg ?? picked.fg,
    bg: options.bg ?? picked.bg,
  };
}

/**
 * Normalises a seed to the string the hash consumes.
 *
 * Numbers are accepted because `seed={user.id}` with an integer primary key is
 * the obvious call — `generate(42)` and `generate('42')` are the same avatar,
 * forever. Everything else throws rather than collapsing silently: `fnv1a`
 * loops on `str.length`, so any other type used to skip the loop entirely and
 * return the offset basis, giving every such seed one identical face.
 */
function toSeed(seed: string | number): string {
  if (typeof seed === 'string') return seed;
  if (typeof seed === 'number' && Number.isFinite(seed)) return String(seed);
  const got = typeof seed === 'number' ? seed : typeof seed;
  throw new TypeError(`smirks: seed must be a string or a finite number; got ${got}`);
}

type SmirkParts = ColorPair & {
  readonly eye: number;
  readonly mouth: number;
  readonly eyePath: string;
  readonly mouthPath: string;
};

/**
 * Everything a renderer needs, resolved once from the seed.
 *
 * `generateSvg` serialises these into a string and `smirks/react` turns them
 * into elements. Routing both through here is what stops the two renderers
 * from drifting — see test/react.test.tsx, which asserts they agree.
 */
export function resolveParts(seed: string | number, options: SmirkColorOptions): SmirkParts {
  const hash = fnv1a(toSeed(seed));
  const eye = (hash & 0xff) % EYES.length;
  const mouth = ((hash >>> 8) & 0xff) % MOUTHS.length;
  const eyeBitmap = EYES[eye];
  const mouthBitmap = MOUTHS[mouth];
  if (eyeBitmap === undefined || mouthBitmap === undefined) {
    throw new Error('smirks: variant data is missing — did you run `pnpm build:data`?');
  }
  const { fg, bg } = resolveColors(hash, options);
  return {
    eye,
    mouth,
    eyePath: bitmapToPath(eyeBitmap),
    mouthPath: bitmapToPath(mouthBitmap),
    fg,
    bg,
  };
}

/** Returns the resolved indices and colors for a seed, without rendering SVG. */
export function generate(seed: string | number, options: SmirkColorOptions = {}): GeneratedSmirk {
  const { eye, mouth, fg, bg } = resolveParts(seed, options);
  return { eye, mouth, fg, bg };
}

/**
 * Characters XML 1.0 forbids outright — illegal even as numeric character
 * references, so they can only be removed, never escaped. The C0 controls
 * except tab/LF/CR, plus the two non-characters.
 *
 * Reachable input: `title` carries user-supplied display names. One vertical
 * tab pasted from a word processor otherwise makes the SVG unparseable in the
 * non-HTML embedding contexts `xmlns` exists to serve.
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching them is the point — XML 1.0 forbids these outright, so they are stripped rather than escaped.
const XML_ILLEGAL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g;

/** Unpaired surrogates are equally illegal; U+FFFD is the standard stand-in. */
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

/** Drops what XML cannot represent. Runs before the entity pass, never after. */
function stripIllegal(value: string): string {
  return value.replace(XML_ILLEGAL_RE, '').replace(LONE_SURROGATE_RE, '\uFFFD');
}

const ATTR_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '"': '&quot;',
  '<': '&lt;',
  '>': '&gt;',
};

function escapeAttr(value: string): string {
  return stripIllegal(value).replace(/[&"<>]/g, (ch) => ATTR_ESCAPES[ch] ?? ch);
}

const TEXT_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

export function escapeText(value: string): string {
  return stripIllegal(value).replace(/[&<>]/g, (ch) => TEXT_ESCAPES[ch] ?? ch);
}

/**
 * Returns a complete SVG string for the given seed.
 *
 * The string is byte-identical for identical inputs across runtimes — this is
 * the load-bearing determinism guarantee documented in CLAUDE.md.
 *
 * `width`/`height` are `1em` so an unstyled avatar tracks the surrounding font
 * size instead of falling back to the 300x300 default replaced-element box.
 * They are presentation attributes at specificity 0, so any CSS still wins.
 */
export function generateSvg(seed: string | number, options: SvgOptions = {}): string {
  const { eyePath, mouthPath, fg, bg } = resolveParts(seed, options);

  const fgAttr = escapeAttr(fg);
  const bgAttr = escapeAttr(bg);

  const title = options.title;
  const ariaAttrs = title === undefined ? ' aria-hidden="true"' : ' role="img"';
  const titleNode = title === undefined ? '' : `<title>${escapeText(title)}</title>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em"` +
    ` viewBox="0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}" shape-rendering="crispEdges"${ariaAttrs}>` +
    titleNode +
    `<rect width="${VIEWBOX_SIZE}" height="${VIEWBOX_SIZE}" fill="${bgAttr}"/>` +
    `<path d="${eyePath}" fill="${fgAttr}"/>` +
    `<path d="${mouthPath}" fill="${fgAttr}"/>` +
    `</svg>`
  );
}
