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

- **Deterministic.** Same seed produces the exact same SVG bytes on every runtime, every version.
- **Tiny.** Under 2 KB gzipped. Zero runtime dependencies.
- **Themeable.** Built-in palettes, custom palettes, fixed colors, or `currentColor` for full Tailwind control.
- **Accessible.** Default and bold palette pairs meet WCAG 2.1 non-text contrast (3:1) and APCA Lc ≥ 50 — accessible for decorative content at small sizes without sacrificing the soft-pastel aesthetic.
- **Universal.** Works in React, vanilla JS, Node, Bun, Deno, Cloudflare Workers, Vercel Edge — anywhere.
- **Type-safe.** Strict TypeScript, discriminated unions for color modes, autocomplete on every option.

## Usage

### React

```tsx
import { Smirk } from 'smirks/react';
import { palettes } from 'smirks';

// Default palette (soft pastel pairs)
<Smirk seed={user.id} />

// Bold palette (white on saturated)
<Smirk seed={user.id} palette={palettes.bold} />

// Override one color, let the other vary by seed
<Smirk seed={user.id} fg="#ffffff" />
<Smirk seed={user.id} bg="#000000" />

// Fully fixed colors (shape still varies by seed)
<Smirk seed={user.id} fg="#ffffff" bg="#000000" />

// Tailwind-native: currentColor follows your CSS
<Smirk
  seed={user.id}
  mode="currentColor"
  className="text-white bg-black rounded-full"
/>

// Accessible label
<Smirk seed={user.id} title={user.displayName} />

// Sizing is CSS — no size prop
<Smirk seed={user.id} className="w-12 h-12 rounded-full" />
```

### Vanilla / SSR / Workers

```ts
import { generateSvg } from 'smirks';

const svg = generateSvg('alice');                   // string starting with <svg…>
const svg = generateSvg('alice', { palette: MY });  // custom palette
```

### Built-in palettes

```ts
import { palettes } from 'smirks';

palettes.default;     // soft: Tailwind *-600/700 on *-50, 12 pairs
palettes.bold;        // white on the soft palette's foregrounds, 12 pairs
palettes.monochrome;  // one black-on-white pair (every smirk identical color)
palettes.duotone;     // black-on-white + white-on-black
```

### Custom palettes

```ts
import type { Palette } from 'smirks';

// Pre-paired combinations (recommended — every pair is hand-curated)
const BRAND: Palette = {
  pairs: [
    { fg: '#0066ff', bg: '#f0f7ff' },
    { fg: '#ff3366', bg: '#fff0f3' },
  ],
};

// Independent fg/bg picks (more variety, less control)
const MIXED: Palette = {
  fg: ['#000000', '#1f2937', '#374151'],
  bg: ['#ffffff', '#f9fafb', '#f3f4f6'],
};
```

### Shape

The SVG output is **always a 512×512 square** — there's no `shape` prop. Rounding (circle, squircle, rounded rectangle, organic blob, hexagon clip-path, …) is handled by CSS on the wrapper, so the same `<Smirk>` works for circular profile pics, rounded cards, and full-bleed squares with no API change.

```tsx
// Square (raw output — no rounding)
<Smirk seed={user.id} className="w-12 h-12" />

// Circle (the most common avatar shape)
<Smirk seed={user.id} className="w-12 h-12 rounded-full" />

// Rounded rectangle
<Smirk seed={user.id} className="w-12 h-12 rounded-2xl" />

// Custom shape — anything CSS supports
<Smirk
  seed={user.id}
  className="w-12 h-12"
  style={{ borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%' }}
/>
```

Plain CSS works the same way — wrap the SVG (or the React component) in any element and apply `border-radius` / `clip-path` / `mask` to the wrapper.

## Determinism contract

| Input                                            | Guaranteed                                         |
|--------------------------------------------------|----------------------------------------------------|
| `(seed, palette)`                                | identical SVG bytes forever                        |
| `(seed, palette, fg?, bg?)` — partial overrides  | identical SVG bytes forever; provided colors win   |
| `(seed)` with `mode: 'currentColor'`             | identical color-free SVG bytes; visuals via CSS    |

Same seed today, same smirk in 2030. No silent visual drift across versions.

## License

MIT
