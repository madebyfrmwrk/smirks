import { describe, expect, it } from 'vitest';
import { bitmapToPath } from '../src/render';

const GRID = 16;

function emptyBitmap(): Uint8Array {
  return new Uint8Array(GRID * 2);
}

function setCell(bm: Uint8Array, x: number, y: number): Uint8Array {
  const idx = y * 2 + (x >>> 3);
  const bit = 1 << (7 - (x & 7));
  bm[idx] = (bm[idx] ?? 0) | bit;
  return bm;
}

function rect(x: number, y: number, w: number): string {
  return `M${x * 32} ${y * 32}h${w * 32}v32h-${w * 32}z`;
}

describe('bitmapToPath (RLE is horizontal-only)', () => {
  it('returns empty string for empty bitmap', () => {
    expect(bitmapToPath(emptyBitmap())).toBe('');
  });

  it('emits a single rect for a single filled cell', () => {
    const bm = emptyBitmap();
    setCell(bm, 5, 7);
    expect(bitmapToPath(bm)).toBe(rect(5, 7, 1));
  });

  it('emits ONE rect for a full row of 16 cells (run-length encoded)', () => {
    const bm = emptyBitmap();
    for (let x = 0; x < GRID; x++) setCell(bm, x, 3);
    const out = bitmapToPath(bm);
    expect(out).toBe(rect(0, 3, 16));
    // Sanity: not 16 separate M commands
    expect((out.match(/M/g) ?? []).length).toBe(1);
  });

  it('emits separate subpaths for cells in non-adjacent rows', () => {
    const bm = emptyBitmap();
    setCell(bm, 2, 1);
    setCell(bm, 9, 12);
    const out = bitmapToPath(bm);
    expect(out).toBe(rect(2, 1, 1) + rect(9, 12, 1));
    expect((out.match(/M/g) ?? []).length).toBe(2);
  });

  it('does NOT vertically merge a column of 4 cells (RLE is horizontal-only)', () => {
    const bm = emptyBitmap();
    for (let y = 5; y < 9; y++) setCell(bm, 7, y);
    const out = bitmapToPath(bm);
    expect(out).toBe(rect(7, 5, 1) + rect(7, 6, 1) + rect(7, 7, 1) + rect(7, 8, 1));
    expect((out.match(/M/g) ?? []).length).toBe(4);
  });

  it('emits two rects for a row with two horizontal runs separated by a gap', () => {
    const bm = emptyBitmap();
    setCell(bm, 1, 4);
    setCell(bm, 2, 4);
    // gap at x=3
    setCell(bm, 4, 4);
    setCell(bm, 5, 4);
    setCell(bm, 6, 4);
    const out = bitmapToPath(bm);
    expect(out).toBe(rect(1, 4, 2) + rect(4, 4, 3));
    expect((out.match(/M/g) ?? []).length).toBe(2);
  });

  it('emits one rect for a run that ends at the last column (x=15)', () => {
    const bm = emptyBitmap();
    setCell(bm, 13, 0);
    setCell(bm, 14, 0);
    setCell(bm, 15, 0);
    expect(bitmapToPath(bm)).toBe(rect(13, 0, 3));
  });
});
