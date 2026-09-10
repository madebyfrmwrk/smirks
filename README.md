# smirks

[![npm](https://img.shields.io/npm/v/smirks.svg?style=flat-square&color=000)](https://www.npmjs.com/package/smirks)
[![bundle size](https://img.shields.io/bundlephobia/minzip/smirks?style=flat-square&label=gzipped&color=000)](https://bundlephobia.com/package/smirks)
[![types](https://img.shields.io/npm/types/smirks?style=flat-square&color=000)](https://www.npmjs.com/package/smirks)
[![license](https://img.shields.io/npm/l/smirks?style=flat-square&color=000)](./LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/madebyfrmwrk/smirks/ci.yml?branch=main&style=flat-square&label=CI&color=000)](https://github.com/madebyfrmwrk/smirks/actions/workflows/ci.yml)

Deterministic pixel-face avatars for the modern web.

```bash
pnpm add smirks
```

```tsx
import { Smirk } from 'smirks/react';

<Smirk seed={user.id} />
```

That's it. Same seed → same smirk, forever.

## Features

- **Deterministic.** Same seed produces the exact same SVG bytes on every runtime, every version. Pinned by committed golden fixtures, not by hope.
- **Tiny.** 1.7 KB gzipped per entry, zero runtime dependencies. Enforced in CI.
- **Themeable.** Built-in palettes, custom palettes, fixed colors, or `currentColor` for full Tailwind control.
- **Accessible.** Every pair in the shipped palettes meets WCAG 2.1 non-text contrast (3:1) and APCA Lc ≥ 50, asserted in the test suite with the measured minima pinned so the floor can't erode.
- **Server-first.** No `'use client'`, no hooks, no context. Renders in a React Server Component with zero client JS, in a Client Component, and in a pure-server `renderToString` for emails and OG images.
- **Type-safe.** Strict TypeScript, discriminated unions for color modes, autocomplete on every option.

ESM-only. Works in React, vanilla JS, Node, Bun, Deno, Cloudflare Workers and Vercel Edge. `require()` resolves on Node ≥ 20.19 / ≥ 22.12 via `require(esm)`; older CommonJS toolchains need a dynamic `import()`.

## Usage

### React

```tsx
import { Smirk } from 'smirks/react';
import { palettes } from 'smirks';

// Default palette (soft pastel, hue-matched pairs)
<Smirk seed={user.id} />

// Bold palette (white on saturated)
<Smirk seed={user.id} palette={palettes.bold} />

// Fixed colors (shape still varies by seed)
<Smirk seed={user.id} fg="#ffffff" bg="#000000" />

// Tailwind-native: currentColor follows your CSS
<Smirk
  seed={user.id}
  mode="currentColor"
  className="text-white bg-black rounded-full"
/>

// Accessible label
<Smirk seed={user.id} title={user.displayName} />

// Sizing is CSS — no size prop. className and style land on the <svg> itself.
<Smirk seed={user.id} className="size-12 rounded-full" />
```

`seed` accepts a string or a finite number, so an integer primary key works as-is. Anything else throws rather than silently collapsing every user onto one face.

Unknown props spread onto the `<svg>`, so `ref`, `onClick`, `id`, `data-*` and `aria-*` all reach the DOM — `asChild` triggers from Radix, Headless UI and Ark work as expected. `viewBox`, `shape-rendering`, `role` and `aria-hidden` are part of the output contract and are not overridable; `width` and `height` are.

### Vanilla / SSR / Workers

```ts
import { generateSvg } from 'smirks';

const svg = generateSvg('alice');                   // string starting with <svg…>
const svg = generateSvg('alice', { palette: MY });  // custom palette
```

The SVG carries `width="1em" height="1em"`, so an unstyled avatar tracks the surrounding font size instead of falling back to the 300×300 default. Both are presentation attributes at specificity 0, so any CSS wins:

```js
el.innerHTML = generateSvg(user.id);
// svg { display: block; width: 3rem; height: 3rem }
```

To use it as a data URI, encode it first — every hex colour contains `#`, which truncates the URI otherwise:

```ts
const dataUri = `data:image/svg+xml,${encodeURIComponent(generateSvg(user.id))}`;
```

### Colors without the SVG

`generate` resolves a seed and hands back what it picked, without rendering anything — for when
something other than the avatar has to match it.

```ts
import { generate } from 'smirks';

const { fg, bg } = generate(user.id);
// { eye: 6, mouth: 6, fg: '#2563eb', bg: '#eff6ff' }
```

It takes the same options as `generateSvg`, so `generate(user.id, { palette })` tells you what
that palette would have chosen. (`eye` and `mouth` are indices into the variant sets. They shift
whenever the artwork changes, so read them if you like but don't store them.)

**Profile headers.** `palettes.bold` is derived from the default palette index for index, and
both are read from the same hash bits — so **a seed always lands on the same hue in both**. That
gives you a matched avatar and cover from one seed:

```tsx
const cover = generate(user.id, { palette: palettes.bold }); // #ffffff on #2563eb

<header style={{ backgroundColor: cover.bg, color: cover.fg }}>
  <Smirk seed={user.id} className="size-20 rounded-full" />
</header>
```

Use bold's `bg` for the banner, not the default palette's. The default backgrounds are near-white
tints and make a washed-out cover; against the saturated hue the avatar's own pale background
reads as a cut-out, which is usually what you want where the two overlap.

### Built-in palettes

```ts
import { palettes } from 'smirks';

palettes.default;         // soft: 13 hue-matched pairs (*-600/700 on its own *-50 tint)
palettes.bold;            // white on the soft palette's foregrounds, 13 pairs
palettes.monochromeLight; // one black-on-white pair (every smirk identical color)
palettes.monochromeDark;  // one white-on-black pair (the inverse)
palettes.duotone;         // both of the above — the seed picks
```

### Custom palettes

```ts
import type { Palette } from 'smirks';

// Pre-paired combinations — the shape `palettes.default` uses, and the
// recommended one: every pairing is hand-curated
const BRAND: Palette = {
  pairs: [
    { fg: '#0066ff', bg: '#f0f7ff' },
    { fg: '#ff3366', bg: '#fff0f3' },
  ],
};

// Independent fg/bg picks — more variety, but the seed decides which face
// lands on which background, so check every combination yourself
const MIXED: Palette = {
  fg: ['#000000', '#1f2937', '#374151'],
  bg: ['#ffffff', '#f9fafb', '#f3f4f6'],
};
```

The contrast guarantee covers the shipped palettes as shipped. A custom palette, or an `fg`/`bg` override, opts out of it — including partial overrides: `fg="#ffffff"` alone leaves the seed to pick a near-white background, which lands between 1.03:1 and 1.10:1. Override both, or override one against a palette whose other half you control:

```tsx
<Smirk seed={user.id} palette={palettes.bold} fg="#ffffff" />  // white on saturated
<Smirk seed={user.id} fg="#ffffff" bg="#000000" />             // fully fixed
```

## Accessibility

By default the SVG is `aria-hidden="true"` — correct for a decorative avatar that sits next to a visible name.

It is **not** correct when the avatar is the only content of a link or button, which computes an empty accessible name and fails WCAG 4.1.2. Name it, or name the control:

```tsx
// Avatar beside a visible name — the avatar is decorative, the link is named
<a href={user.href}>
  <Smirk seed={user.id} className="size-8 rounded-full" />
  {user.displayName}
</a>

// Avatar alone — give the control the name
<a href={user.href} aria-label={user.displayName}>
  <Smirk seed={user.id} className="size-8 rounded-full" />
</a>

// Or name the avatar itself: role="img" plus a <title>
<Smirk seed={user.id} title={user.displayName} className="size-8 rounded-full" />
```

Passing `title`, `aria-label` or `aria-labelledby` switches the SVG to `role="img"` and drops `aria-hidden`, so a name you supply is never discarded.

## Shape

The SVG output is **always a 512×512 square** — there's no `shape` prop. Rounding is CSS on the `<svg>` itself, so the same `<Smirk>` works for circular profile pics, rounded cards, and full-bleed squares with no API change.

```tsx
<Smirk seed={user.id} className="size-12" />              // square
<Smirk seed={user.id} className="size-12 rounded-full" /> // circle
<Smirk seed={user.id} className="size-12 rounded-2xl" />  // rounded rectangle

<Smirk
  seed={user.id}
  className="size-12"
  style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
/>
```

An `<svg>` clips to its own viewport, so `border-radius` on it needs no wrapper and no `overflow: hidden`.

## How many faces?

12 eyes × 8 mouths × 13 colour pairs = **1,248** distinct avatars. In a group of 42 there is a 50% chance two people share one, and by 100 it is near certain. `mode: 'currentColor'` and the monochrome palettes drop further, to the 96 distinct shapes.

That ceiling is deliberate. The palette is hue-matched — a face is always on its own hue's tint — which caps colour at 13. Letting the seed pair any face with any background would reach 16,224, but a blue face on a pink ground reads as a rendering bug rather than as variety, so the variety is capped instead.

Avatars identify at a glance; they are not identifiers. Don't use one to tell two accounts apart where that matters, and put a name next to it wherever the distinction carries weight.

## Determinism contract

| Input                                            | Guaranteed                                         |
|--------------------------------------------------|----------------------------------------------------|
| `(seed, palette)`                                | identical SVG bytes forever                        |
| `(seed, palette, fg?, bg?)` — partial overrides  | identical SVG bytes forever; provided colors win   |
| `(seed)` with `mode: 'currentColor'`             | identical color-free SVG bytes; visuals via CSS    |
| `generate(42)` vs `generate('42')`               | identical — a number seed is its decimal string    |

The seed is hashed exactly as given: `'café'` in NFC and NFD are different strings and so different avatars. Normalise before seeding if that matters to you.

Same seed today, same smirk in 2030. No silent visual drift across versions.

## License

MIT
