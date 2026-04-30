import { describe, expect, it } from 'vitest';
import { generate, generateSvg, palettes } from '../src';

describe('SVG structure', () => {
  it('untitled smirk gets aria-hidden="true" and no <title>', () => {
    const svg = generateSvg('alice');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('role="img"');
    expect(svg).not.toContain('<title>');
  });

  it('titled smirk gets role="img" and a <title> as the first child', () => {
    const svg = generateSvg('alice', { title: 'Alice Liddell' });
    expect(svg).toContain('role="img"');
    expect(svg).not.toContain('aria-hidden');
    expect(svg).toContain('<title>Alice Liddell</title>');
    // <title> must precede <rect>
    expect(svg.indexOf('<title>')).toBeLessThan(svg.indexOf('<rect'));
  });

  it('escapes special characters in the title', () => {
    const svg = generateSvg('alice', { title: '<Alice & Bob>' });
    expect(svg).toContain('<title>&lt;Alice &amp; Bob&gt;</title>');
    expect(svg).not.toContain('<Alice');
  });

  it('escapes special characters in fg/bg attributes (no attribute breakout)', () => {
    const svg = generateSvg('alice', { fg: 'url(#x)" onerror="alert(1)', bg: '#000' });
    // The double-quote that would break out of the attribute is escaped to &quot;,
    // so `onerror=` is neutralized as part of the fill value (no real attribute).
    expect(svg).toContain('&quot;');
    expect(svg).not.toMatch(/"\s+onerror=/);
  });

  it('renders three SVG-level children: optional <title>, <rect>, two <path>s', () => {
    const svg = generateSvg('alice');
    // 1 rect + 2 paths
    expect((svg.match(/<rect/g) ?? []).length).toBe(1);
    expect((svg.match(/<path/g) ?? []).length).toBe(2);
  });

  it('background rect uses the resolved bg color', () => {
    const { bg } = generate('alice', { bg: '#abcdef' });
    expect(bg).toBe('#abcdef');
    const svg = generateSvg('alice', { bg: '#abcdef' });
    expect(svg).toContain(`fill="${bg}"`);
  });

  it('paths use the resolved fg color', () => {
    const { fg } = generate('alice', { fg: '#123456' });
    const svg = generateSvg('alice', { fg: '#123456' });
    // Both paths fill with fg
    expect((svg.match(new RegExp(`fill="${fg}"`, 'g')) ?? []).length).toBe(2);
  });

  it('default-palette output uses one of the SOFT_PAIRS background colors', () => {
    const svg = generateSvg('alice');
    const bgMatch = svg.match(/<rect[^>]*fill="([^"]+)"/);
    expect(bgMatch?.[1]).toBeDefined();
    const bgColors = palettes.default.pairs.map((p) => p.bg);
    expect(bgColors).toContain(bgMatch?.[1]);
  });
});
