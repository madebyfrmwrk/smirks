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
