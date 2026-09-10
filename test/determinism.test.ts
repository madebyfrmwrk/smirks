import { describe, expect, it } from 'vitest';
import { generate, generateSvg, palettes } from '../src';

describe('determinism', () => {
  it('same seed → byte-identical SVG output, every call', () => {
    const a = generateSvg('alice');
    const b = generateSvg('alice');
    expect(a).toBe(b);
  });

  it('same seed across many palettes is internally consistent', () => {
    const seeds = ['alice', 'bob', 'carol', 'dave', 'eve', '', '12345', '🦊'];
    for (const seed of seeds) {
      expect(generateSvg(seed)).toBe(generateSvg(seed));
      expect(generateSvg(seed, { palette: palettes.bold })).toBe(
        generateSvg(seed, { palette: palettes.bold }),
      );
      expect(generateSvg(seed, { mode: 'currentColor' })).toBe(
        generateSvg(seed, { mode: 'currentColor' }),
      );
    }
  });

  it('same seed → same eye and mouth indices regardless of color mode', () => {
    const seed = 'alice';
    const a = generate(seed);
    const b = generate(seed, { mode: 'currentColor' });
    const c = generate(seed, { fg: '#fff', bg: '#000' });
    const d = generate(seed, { palette: palettes.bold });
    expect(a.eye).toBe(b.eye);
    expect(a.eye).toBe(c.eye);
    expect(a.eye).toBe(d.eye);
    expect(a.mouth).toBe(b.mouth);
    expect(a.mouth).toBe(c.mouth);
    expect(a.mouth).toBe(d.mouth);
  });

  it('different seeds produce different overall outputs (sanity)', () => {
    const a = generateSvg('alice');
    const b = generateSvg('bob');
    expect(a).not.toBe(b);
  });

  it('output starts with a properly namespaced <svg> tag', () => {
    const svg = generateSvg('alice');
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  it('output always carries shape-rendering="crispEdges"', () => {
    expect(generateSvg('alice')).toContain('shape-rendering="crispEdges"');
  });

  it('output always carries viewBox="0 0 512 512"', () => {
    expect(generateSvg('alice')).toContain('viewBox="0 0 512 512"');
  });

  it('byte-identical output across 50 random-ish seeds (regression guard)', () => {
    for (let i = 0; i < 50; i++) {
      const seed = `seed-${i}-${i * 37}`;
      const first = generateSvg(seed);
      const second = generateSvg(seed);
      expect(second).toBe(first);
    }
  });
});

describe('seed normalisation', () => {
  it('treats a number and its decimal string as the same seed, forever', () => {
    for (const n of [0, 7, 42, 999, -1, 1.5]) {
      expect(generate(n)).toEqual(generate(String(n)));
      expect(generateSvg(n)).toBe(generateSvg(String(n)));
    }
  });

  it('gives different numbers different avatars', () => {
    // Before the guard, every non-string seed skipped the hash loop and
    // returned the FNV offset basis — one identical face for every user.
    const svgs = new Set([1, 2, 3, 4, 5, 42, 999].map((n) => generateSvg(n)));
    expect(svgs.size).toBeGreaterThan(1);
    expect(generateSvg(42)).not.toBe(generateSvg(999));
  });

  it('rejects every other type with a branded TypeError', () => {
    for (const bad of [null, undefined, {}, [], true, Number.NaN, Number.POSITIVE_INFINITY]) {
      // @ts-expect-error — the point is the runtime guard for untyped callers.
      expect(() => generate(bad), String(bad)).toThrow(TypeError);
      // @ts-expect-error — same.
      expect(() => generate(bad), String(bad)).toThrow(/^smirks: seed must be a string/);
    }
  });

  it('accepts the empty string as an ordinary seed', () => {
    expect(() => generateSvg('')).not.toThrow();
  });
});
