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
    // The default palette is the soft preset — fg and bg always come from one pair.
    expect(palettes.default.pairs).toContainEqual({ fg: a.fg, bg: a.bg });
  });

  it('alternate preset (palettes.bold) picks white fg', () => {
    const a = generate(SEED, { palette: palettes.bold });
    expect(a.fg).toBe('#ffffff');
  });

  it('bold lands on the same hue as default for any seed', () => {
    // Documented: a profile header can render the avatar from the default palette
    // and its cover from bold and get a matching hue. That holds because both are
    // pairs mode, the same length, and bold is derived from default index for
    // index — break any of those and this promise breaks silently.
    for (let i = 0; i < 200; i++) {
      const seed = `user-${i}`;
      const soft = generate(seed);
      const bold = generate(seed, { palette: palettes.bold });
      expect(bold.bg, seed).toBe(soft.fg);
      expect(bold.fg, seed).toBe('#ffffff');
    }
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
    // Different seeds → different shapes (very likely with 12 * 8 = 96 combinations)
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

  it('monochromeLight preset always returns black on white', () => {
    for (const seed of ['x', 'y', 'z', 'longer', 'even longer one']) {
      const r = generate(seed, { palette: palettes.monochromeLight });
      expect(r.fg).toBe('#000000');
      expect(r.bg).toBe('#ffffff');
    }
  });

  it('monochromeDark preset always returns white on black', () => {
    for (const seed of ['x', 'y', 'z', 'longer', 'even longer one']) {
      const r = generate(seed, { palette: palettes.monochromeDark });
      expect(r.fg).toBe('#ffffff');
      expect(r.bg).toBe('#000000');
    }
  });

  it('duotone is exactly the union of the two monochrome presets', () => {
    expect(palettes.duotone.pairs).toEqual([
      ...palettes.monochromeLight.pairs,
      ...palettes.monochromeDark.pairs,
    ]);
  });

  it('throws on empty palettes', () => {
    expect(() => generate(SEED, { palette: { pairs: [] } })).toThrow(/empty/);
    expect(() => generate(SEED, { palette: { fg: [], bg: ['#fff'] } })).toThrow(/empty/);
    expect(() => generate(SEED, { palette: { fg: ['#000'], bg: [] } })).toThrow(/empty/);
  });
});
