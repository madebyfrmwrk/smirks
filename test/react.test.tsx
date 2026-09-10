import { execFileSync } from 'node:child_process';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { generateSvg, palettes } from '../src';
import { Smirk } from '../src/react';

/**
 * The two renderers cannot be compared byte for byte, and deliberately are not.
 * React never self-closes SVG elements (`<rect …></rect>`) and escapes `'` and
 * `"` that the string builder correctly leaves alone. Both differences parse to
 * the same document, so the comparison is canonical rather than literal:
 * empty elements collapsed, attributes sorted, entities decoded.
 */
const EMPTY_ELEMENT_RE = /<([a-z]+)([^>]*)><\/\1>/g;
const TAG_RE = /<([a-z]+)((?:\s+[\w-]+="[^"]*")*)\s*\/?>/g;
const ATTR_RE = /([\w-]+)="([^"]*)"/g;
const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#x27;': "'",
};

function decode(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|#x27);/g, (entity) => ENTITIES[entity] ?? entity);
}

function canonicalize(markup: string): string {
  return markup
    .replace(EMPTY_ELEMENT_RE, '<$1$2/>')
    .replace(TAG_RE, (_match, tag: string, attrs: string) => {
      const sorted = [...attrs.matchAll(ATTR_RE)]
        .map(([, name, value]) => `${name}="${decode(value ?? '')}"`)
        .sort();
      return sorted.length === 0 ? `<${tag}>` : `<${tag} ${sorted.join(' ')}>`;
    })
    .replace(/>([^<]+)</g, (_match, text: string) => `>${decode(text)}<`);
}

describe('<Smirk> agrees with generateSvg', () => {
  const seeds = ['alice', 'bob', '', '🦊', 'a-much-longer-seed-value', 42];

  it('renders the same document for the default palette', () => {
    for (const seed of seeds) {
      expect(canonicalize(renderToStaticMarkup(<Smirk seed={seed} />)), String(seed)).toBe(
        canonicalize(generateSvg(seed)),
      );
    }
  });

  it('renders the same document for every shipped palette and currentColor', () => {
    for (const [name, palette] of Object.entries(palettes)) {
      expect(
        canonicalize(renderToStaticMarkup(<Smirk seed="alice" palette={palette} />)),
        name,
      ).toBe(canonicalize(generateSvg('alice', { palette })));
    }
    expect(canonicalize(renderToStaticMarkup(<Smirk seed="alice" mode="currentColor" />))).toBe(
      canonicalize(generateSvg('alice', { mode: 'currentColor' })),
    );
  });

  it('renders the same document for colour overrides and titles', () => {
    const cases = [
      { fg: '#ffffff' },
      { bg: '#000000' },
      { fg: '#ffffff', bg: '#000000' },
      { title: 'Alice Liddell' },
      { title: `<Alice> & "Bob" O'Brien` },
    ] as const;
    for (const options of cases) {
      expect(canonicalize(renderToStaticMarkup(<Smirk seed="alice" {...options} />))).toBe(
        canonicalize(generateSvg('alice', options)),
      );
    }
  });
});

describe('<Smirk> accessibility', () => {
  it('is hidden from the accessibility tree when it has no name', () => {
    const markup = renderToStaticMarkup(<Smirk seed="alice" />);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain('role="img"');
    expect(markup).not.toContain('<title>');
  });

  it('becomes role="img" with a <title> when given a title', () => {
    const markup = renderToStaticMarkup(<Smirk seed="alice" title="Alice Liddell" />);
    expect(markup).toContain('role="img"');
    expect(markup).not.toContain('aria-hidden');
    expect(markup).toContain('<title>Alice Liddell</title>');
    expect(markup.indexOf('<title>')).toBeLessThan(markup.indexOf('<rect'));
  });

  it('renders a title containing an expression-like value as one text node', () => {
    // `<title>a {b}</title>` renders empty in production with only a dev
    // warning, so the component must pass exactly one child.
    const markup = renderToStaticMarkup(<Smirk seed="alice" title="Ada Lovelace (she/her)" />);
    expect(markup).toContain('<title>Ada Lovelace (she/her)</title>');
  });

  it('does not hide an avatar the caller has already named', () => {
    for (const props of [{ 'aria-label': 'Alice' }, { 'aria-labelledby': 'name-1' }] as const) {
      const markup = renderToStaticMarkup(<Smirk seed="alice" {...props} />);
      expect(markup).not.toContain('aria-hidden');
      expect(markup).toContain('role="img"');
    }
  });
});

describe('<Smirk> props', () => {
  it('forwards unknown props onto the <svg>', () => {
    const markup = renderToStaticMarkup(
      <Smirk seed="alice" id="avatar" data-testid="avatar" aria-describedby="hint" />,
    );
    expect(markup).toContain('id="avatar"');
    expect(markup).toContain('data-testid="avatar"');
    expect(markup).toContain('aria-describedby="hint"');
  });

  it('puts className and style on the <svg> itself, not a wrapper', () => {
    const markup = renderToStaticMarkup(
      <Smirk seed="alice" className="size-12 rounded-full" style={{ width: 48 }} />,
    );
    expect(markup.startsWith('<svg')).toBe(true);
    expect(markup).toContain('class="size-12 rounded-full"');
    expect(markup).toContain('style="width:48px"');
  });

  it('defaults to a 1em box that the caller can override', () => {
    expect(renderToStaticMarkup(<Smirk seed="alice" />)).toContain('width="1em"');
    const sized = renderToStaticMarkup(<Smirk seed="alice" width={48} height={48} />);
    expect(sized).toContain('width="48"');
    expect(sized).not.toContain('width="1em"');
  });

  it('does not let a caller clobber the output contract', () => {
    const markup = renderToStaticMarkup(
      <Smirk seed="alice" viewBox="0 0 1 1" shapeRendering="auto" role="presentation" />,
    );
    expect(markup).toContain('viewBox="0 0 512 512"');
    expect(markup).toContain('shape-rendering="crispEdges"');
    expect(markup).not.toContain('role="presentation"');
  });

  it('forwards a ref', () => {
    // A plain function component silently drops `ref` on React 18.
    expect(Smirk).toHaveProperty('render');
  });
});

describe('smirks/react in a React Server Component graph', () => {
  it('imports cleanly under the react-server condition', () => {
    // Guards against a future import of a client-only React API. `createContext`
    // is absent from React's react-server build, which is exactly what forced
    // Phosphor's separate /ssr entry — this test is why smirks needs only one.
    const output = execFileSync(
      process.execPath,
      [
        '--import',
        'tsx',
        '--conditions=react-server',
        '--input-type=module',
        '-e',
        "const m = await import('./src/react.tsx'); console.log(Object.keys(m).join(','));",
      ],
      { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
    );
    expect(output.trim()).toBe('Smirk');
  });
});
