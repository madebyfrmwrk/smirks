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
