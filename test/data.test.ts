import { describe, expect, it } from 'vitest';
import { EYES } from '../src/data/eyes';
import { MOUTHS } from '../src/data/mouths';

/**
 * `scripts/build-data.ts` enforces all of this at generation time — but it reads
 * source SVGs from the maintainer's Desktop, so it cannot run in CI. The
 * committed `src/data/*.ts` files are what ships, and nothing re-checked them.
 * These tests re-anchor the build-time invariants to the shipped artifacts.
 */
const BITMAP_BYTES = 32; // 16x16 cells, 2 bytes per row
const GRID = 16;
/**
 * The tightest frame (`scale: 'lg'`, see `resolveFrame` in src/render.ts) crops
 * two cells from each edge, so only cells 2–13 are visible there. A variant
 * drawn outside them would be silently clipped rather than fail — this is the
 * check that makes it fail.
 */
const FRAME_MIN = 2;
const FRAME_MAX = 13;

/** Mirrors `isCellSet` in src/render.ts: row-major, 2 bytes per row, MSB-first. */
function isCellSet(bitmap: Uint8Array, x: number, y: number): boolean {
  return ((bitmap[y * 2 + (x >>> 3)] ?? 0) & (1 << (7 - (x & 7)))) !== 0;
}

const GROUPS = [
  { name: 'EYES', variants: EYES, expected: 12 },
  { name: 'MOUTHS', variants: MOUTHS, expected: 8 },
] as const;

describe('committed variant data', () => {
  for (const { name, variants, expected } of GROUPS) {
    describe(name, () => {
      it(`has exactly ${expected} variants`, () => {
        // Pinned because the count is a modulus: changing it reassigns every
        // seed's face and is a major version bump.
        expect(variants.length).toBe(expected);
      });

      it('stores every variant as exactly 32 bytes', () => {
        for (const [index, bitmap] of variants.entries()) {
          expect(bitmap.length, `${name}[${index}]`).toBe(BITMAP_BYTES);
        }
      });

      it('has no empty variant', () => {
        // An all-zero bitmap renders `d=""` — an invisible face that would pass
        // every other test in the suite.
        for (const [index, bitmap] of variants.entries()) {
          expect(
            bitmap.some((byte) => byte !== 0),
            `${name}[${index}] is all zero`,
          ).toBe(true);
        }
      });

      it('draws nothing outside the visible frame', () => {
        for (const [index, bitmap] of variants.entries()) {
          for (let y = 0; y < GRID; y++) {
            for (let x = 0; x < GRID; x++) {
              if (!isCellSet(bitmap, x, y)) continue;
              const inside = x >= FRAME_MIN && x <= FRAME_MAX && y >= FRAME_MIN && y <= FRAME_MAX;
              expect(inside, `${name}[${index}] sets cell (${x}, ${y}) outside the frame`).toBe(
                true,
              );
            }
          }
        }
      });

      it('has no two variants sharing a bitmap', () => {
        // Duplicates add no variety and skew the seed distribution toward the
        // face they share. `build:data` fails loud on this; so does CI now.
        const seen = new Map<string, number>();
        for (const [index, bitmap] of variants.entries()) {
          const key = Array.from(bitmap, (byte) => byte.toString(16).padStart(2, '0')).join('');
          const first = seen.get(key);
          expect(first, `${name}[${index}] duplicates ${name}[${first}]`).toBeUndefined();
          seen.set(key, index);
        }
      });
    });
  }
});
