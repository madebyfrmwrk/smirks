import { describe, expect, it } from 'vitest';
import { generate, generateSvg, palettes } from '../src';
import type { Palette } from '../src/types';

const SEED = 'alice';

describe('color resolution', () => {
  it('palette mode (default) picks fg+bg deterministically from palettes.default', () => {
    const a = generate(SEED);
    const b = generate(SEED);
    expect(a.fg).toBe(b.fg);
    expect(a.bg).toBe(b.bg);
    // The default palette is the soft preset — any pair has fg from the locked SOFT_PAIRS.
    const defaultFgs = palettes.default.pairs.map((p) => p.fg);
    expect(defaultFgs).toContain(a.fg);
  });

  it('alternate preset (palettes.bold) picks white fg', () => {
    const a = generate(SEED, { palette: palettes.bold });
    expect(a.fg).toBe('#ffffff');
  });

  it('partial override: fg only — bg still comes from palette', () => {
    const baseline = generate(SEED);
    const overridden = generate(SEED, { fg: '#123456' });
    expect(overridden.fg).toBe('#123456');
    expect(overridden.bg).toBe(baseline.bg);
  });

  it('partial override: bg only — fg still comes from palette', () => {
    const baseline = generate(SEED);
    const overridden = generate(SEED, { bg: '#abcdef' });
    expect(overridden.bg).toBe('#abcdef');
    expect(overridden.fg).toBe(baseline.fg);
  });

  it('full override: both fg and bg fixed; shape still varies by seed', () => {
    const a = generate('alice', { fg: '#fff', bg: '#000' });
    const b = generate('bob', { fg: '#fff', bg: '#000' });
    expect(a.fg).toBe('#fff');
    expect(a.bg).toBe('#000');
    expect(b.fg).toBe('#fff');
    expect(b.bg).toBe('#000');
    // Different seeds → different shapes (very likely with 14 * 9 = 126 combinations)
    expect([a.eye, a.mouth]).not.toEqual([b.eye, b.mouth]);
  });

  it("mode: 'currentColor' yields fg=currentColor and bg=transparent", () => {
    const result = generate(SEED, { mode: 'currentColor' });
    expect(result.fg).toBe('currentColor');
    expect(result.bg).toBe('transparent');
  });

  it("mode: 'currentColor' renders with currentColor in the SVG", () => {
    const svg = generateSvg(SEED, { mode: 'currentColor' });
    expect(svg).toContain('fill="currentColor"');
    expect(svg).toContain('fill="transparent"');
  });

  it('arrays palette: fg and bg picked independently', () => {
    const palette: Palette = {
      fg: ['#aa0000', '#00aa00', '#0000aa'],
      bg: ['#fafafa', '#eeeeee'],
    };
    const result = generate(SEED, { palette });
    expect(palette.fg).toContain(result.fg);
    expect(palette.bg).toContain(result.bg);
  });

  it('pairs palette: fg/bg always come from the same pair', () => {
    const palette: Palette = {
      pairs: [
        { fg: '#111', bg: '#aaa' },
        { fg: '#222', bg: '#bbb' },
        { fg: '#333', bg: '#ccc' },
      ],
    };
    for (const seed of ['a', 'bob', 'carol', 'dave', 'eve']) {
      const r = generate(seed, { palette });
      const matching = palette.pairs.find((p) => p.fg === r.fg && p.bg === r.bg);
      expect(matching).toBeDefined();
    }
  });

  it('monochrome preset always returns black on white', () => {
    for (const seed of ['x', 'y', 'z', 'longer', 'even longer one']) {
      const r = generate(seed, { palette: palettes.monochrome });
      expect(r.fg).toBe('#000000');
      expect(r.bg).toBe('#ffffff');
    }
  });

  it('throws on empty palettes', () => {
    expect(() => generate(SEED, { palette: { pairs: [] } })).toThrow(/empty/);
    expect(() => generate(SEED, { palette: { fg: [], bg: ['#fff'] } })).toThrow(/empty/);
    expect(() => generate(SEED, { palette: { fg: ['#000'], bg: [] } })).toThrow(/empty/);
  });
});
