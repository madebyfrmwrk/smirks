import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { generate, generateSvg, palettes } from '../src';
import { EYES } from '../src/data/eyes';
import { MOUTHS } from '../src/data/mouths';
import { fnv1a } from '../src/hash';
import { bitmapToPath, type SvgOptions } from '../src/render';

/**
 * The determinism guarantee, made falsifiable.
 *
 * Everything else in the suite asserts that `generateSvg(x)` equals
 * `generateSvg(x)` — true by construction, and true even if the hash, the
 * bitmaps or the palette all changed. Only a committed fixture catches that.
 *
 * Regenerate deliberately with `pnpm build:golden`, and read the diff: a change
 * here means every avatar every consumer has ever rendered just moved.
 */

type PaletteName = keyof typeof palettes;

type GoldenOptions = {
  readonly palette?: PaletteName;
  readonly mode?: 'currentColor';
  readonly fg?: string;
  readonly bg?: string;
  readonly title?: string;
};

type Golden = {
  readonly hash: ReadonlyArray<{ readonly seed: string; readonly value: number }>;
  readonly paths: { readonly eyes: readonly string[]; readonly mouths: readonly string[] };
  readonly svg: ReadonlyArray<{
    readonly seed: string | number;
    readonly options: GoldenOptions;
    readonly svg: string;
  }>;
};

const golden: Golden = JSON.parse(
  readFileSync(new URL('./__fixtures__/golden.json', import.meta.url), 'utf8'),
);

function toSvgOptions(options: GoldenOptions): SvgOptions {
  const { palette, mode, fg, bg, title } = options;
  if (mode === 'currentColor') {
    return { mode, title };
  }
  return { palette: palette === undefined ? undefined : palettes[palette], fg, bg, title };
}

function label(seed: string | number, options: GoldenOptions): string {
  return `${JSON.stringify(seed)} ${JSON.stringify(options)}`;
}

describe('golden: the hash itself', () => {
  it('produces the pinned value for every fixture seed', () => {
    for (const { seed, value } of golden.hash) {
      expect(fnv1a(seed), JSON.stringify(seed)).toBe(value);
    }
  });
});

describe('golden: bitmap to path', () => {
  it('encodes every eye to the pinned path', () => {
    expect(EYES.length).toBe(golden.paths.eyes.length);
    for (const [index, bitmap] of EYES.entries()) {
      expect(bitmapToPath(bitmap), `EYES[${index}]`).toBe(golden.paths.eyes[index]);
    }
  });

  it('encodes every mouth to the pinned path', () => {
    expect(MOUTHS.length).toBe(golden.paths.mouths.length);
    for (const [index, bitmap] of MOUTHS.entries()) {
      expect(bitmapToPath(bitmap), `MOUTHS[${index}]`).toBe(golden.paths.mouths[index]);
    }
  });
});

describe('golden: complete SVG output', () => {
  it('reproduces every pinned SVG byte for byte', () => {
    for (const entry of golden.svg) {
      expect(
        generateSvg(entry.seed, toSvgOptions(entry.options)),
        label(entry.seed, entry.options),
      ).toBe(entry.svg);
    }
  });
});

describe('golden: the fixture is still a tripwire', () => {
  // A fixture that stopped covering the variant space would keep passing while
  // protecting nothing, so pin its reach as well as its values.
  it('exercises every eye, every mouth and every colour pair', () => {
    const eyes = new Set<number>();
    const mouths = new Set<number>();
    const pairs = new Set<string>();
    for (const entry of golden.svg) {
      if (Object.keys(entry.options).length > 0) continue;
      const { eye, mouth, fg, bg } = generate(entry.seed);
      eyes.add(eye);
      mouths.add(mouth);
      pairs.add(`${fg}/${bg}`);
    }
    expect(eyes.size).toBe(EYES.length);
    expect(mouths.size).toBe(MOUTHS.length);
    expect(pairs.size).toBe(palettes.default.pairs.length);
  });

  it('covers every shipped palette and currentColor', () => {
    const seen = new Set(
      golden.svg.map((entry) => entry.options.palette ?? entry.options.mode ?? 'default'),
    );
    for (const name of Object.keys(palettes)) {
      expect(seen, name).toContain(name);
    }
    expect(seen).toContain('currentColor');
  });
});
