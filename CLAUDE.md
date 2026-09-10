# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`smirks` is a deterministic pixel-face avatar library. Given a seed string, it returns an SVG composed of one eye + one mouth + a color pair (or `currentColor`), all picked deterministically from the seed via a 32-bit FNV-1a hash. Public entries: `smirks` (vanilla) and `smirks/react` (React component).

## Load-bearing constraints

These are not preferences. Changing any of them is a breaking change at minimum and a correctness bug at worst.

### The grid

Source SVGs live at `~/Desktop/smirks-faces/` on the maintainer's machine — **outside the repo by design**. They were drawn freehand in Figma with sub-32px coordinate adjustments. The build pipeline (`scripts/build-data.ts`) snaps every rect edge to the nearest multiple of 32 in a 512×512 viewBox, producing a clean 16×16 grid stored as a 32-byte packed bitmap per variant in `src/data/{eyes,mouths}.ts`.

`pnpm build:data` is **maintainer-only** — it cannot run in CI because the source SVGs aren't available there. The committed `src/data/{eyes,mouths}.ts` files are the source of truth for build/test/publish. Removed variants live in `~/Desktop/smirks-faces/_archive/` (the build script ignores subdirectories).

- New variants must be drawn on a 32px grid in Figma. The build script fails loud if any variant's max edge displacement exceeds 16px (half a cell).
- No two variants in a group may quantize to the same bitmap. The build script fails loud on collisions — duplicates add no variety and skew the seed distribution toward the face they share.
- Adding a variant: drop the SVG into `~/Desktop/smirks-faces/` with the next `eyes-N` / `mouth-N` filename — **do not reuse removed numbers** (retired: `eyes-5`, `eyes-7`, `eyes-8`, `eyes-11`, `eyes-12`, `eyes-13`, `mouth-8`, `mouth-9`, `mouth-10`, `mouth-12` — the gaps are intentional and preserve filename → Figma-export provenance). Then run `pnpm build:data`, open `scripts/diff/index.html`, commit the regenerated `src/data/*.ts` plus a changeset.
- Never hand-edit `src/data/eyes.ts` or `src/data/mouths.ts`. They're generated.

### Determinism

Same `(seed, palette, fg?, bg?)` must produce byte-identical SVG output forever, on every runtime. The contract:

| Mode                                  | Deterministic on                                       |
|---------------------------------------|--------------------------------------------------------|
| Palette (default)                     | `(seed, palette) → SVG bytes`                          |
| Palette + partial/full `fg`/`bg`      | `(seed, palette, fg?, bg?) → SVG bytes`                |
| `mode: 'currentColor'`                | `seed → SVG bytes` (color-free; visual depends on CSS) |

The seed is `string | number`. A number is normalised with `String(seed)`, so
`generate(42) ≡ generate('42')` is now part of the contract and cannot be walked back. Every
other type throws a `smirks:`-prefixed `TypeError` — before that guard `fnv1a` looped on
`str.length`, so any non-string skipped the loop and returned the offset basis, collapsing
every such seed onto one identical face. Strings are hashed exactly as given: NFC and NFD
spellings of the same word are different seeds.

The hash is FNV-1a 32-bit **plus a MurmurHash3 fmix32 finalizer**. The finalizer is not
decoration: plain FNV-1a barely moves its middle bits when only the last character of the input
changes, and bits 16-31 drive the colour picks, so consecutive sequential seeds (`user-0`,
`user-1`, ..., or integer primary keys) shared a foreground 89% of the time against 7.7% at
chance — a user list in id order rendered in visible colour bands of about ten. Do not remove
it, and do not "simplify" `src/hash.ts` back to a bare FNV loop.

Hash bit allocation:

| Bits   | Use                          | Modulo                                              |
|--------|------------------------------|-----------------------------------------------------|
| 0–7    | eye index                    | `% EYES.length` (currently 12)                      |
| 8–15   | mouth index                  | `% MOUTHS.length` (currently 8)                     |
| 16–23  | palette pick                 | pairs mode: `% pairs.length` · arrays mode: fg index |
| 24–31  | bg index (arrays mode only)  | arrays mode: `% bg.length` · pairs mode: ignored    |

Every shipped preset is **pairs mode**, so bits 24–31 are currently unused. Arrays mode stays in
the `Palette` type for custom palettes; it is not what `palettes.default` uses, and switching it
there was tried and rejected — see "Locked palettes".

Never reorder or remove entries from `EYES` / `MOUTHS` / `palettes.default.pairs` / `palettes.bold.pairs`. Append-only — and even appending shifts `% length` outputs for some seeds, so it's a major version bump.

### Golden fixtures

`test/__fixtures__/golden.json` pins the hash values, the per-variant RLE paths, and the
complete SVG strings for a covering seed set across every mode. It is the only thing that
makes the determinism guarantee falsifiable — the rest of the suite asserts `f(x) === f(x)`,
which stays true even if the hash, the bitmaps and the palette all changed at once.

Three layers so a failure localises: a changed hash fails the hash block, a redrawn variant
the paths block, a palette edit only the SVG block.

Regenerate with `pnpm build:golden` — **deliberately**, never to make a red test go green.
Regenerating is how you accept that every avatar every consumer has rendered just moved, so
read the diff before committing it. `scripts/build-golden.ts` hardcodes its seed list so the
diffs stay small: when a variant changes, the seeds stay put and only the values move.

### Locked palettes

`palettes.default` (soft, Tailwind `*-600` on `*-50`, or `*-700` where `*-600` is too light) and
`palettes.bold` (white on the soft palette's foregrounds, derived via `.map()`) ship with frozen
hex codes in this exact order: red, orange, amber, yellow, lime, emerald, cyan, blue, violet,
purple, fuchsia, rose — the twelve chromatic hues in colour-wheel order — then neutral, which has
no spectral position and so sits last. Do not edit existing entries.

**The palette is hue-matched, and that is a design decision, not an accident.** Each foreground
sits only on its own hue's tint. Switching `default` to arrays mode so the seed could pair any
face with any background was built, measured and rejected: it takes the avatar space from 1,248
to 16,224 and 163 of the 169 combinations clear both contrast bars, but a blue face on a pink
ground reads as a rendering bug rather than as variety. Do not reintroduce it. The cost is a hard
ceiling of 1,248 avatars — a 50% chance of a duplicate at 42 users — which the README states
outright rather than hiding.

Amber is `amber-700 #b45309`, not `amber-600`. Amber-600 was the palette's weakest pair at
3.07:1 / Lc 56.0; `*-700` lifts it to 4.84:1 / Lc 71.5, which is the same rule yellow and lime
already followed. `test/contrast.test.ts` asserts every pair, asserts the hue match itself
(foreground and background within 30° of hue, worst actual 22° on amber), and pins the measured
minima (WCAG 3.3526, APCA Lc 57.963, both orange-600 on orange-50) as erosion tripwires.

`palettes` is deep-frozen at module init. It is shared global state, and the two entries each
bundle their own copy, so an unfrozen mutation would make `generateSvg` and `<Smirk>` disagree
about the same seed in the same app.

### SVG output contract

Every emitted SVG must include:
- `xmlns="http://www.w3.org/2000/svg"` (required for non-HTML embedding contexts)
- `width="1em" height="1em"` (without an intrinsic size an unstyled SVG falls back to 300×300; presentation attributes sit at specificity 0, so any CSS still wins)
- `viewBox="0 0 512 512"`
- `shape-rendering="crispEdges"` (preserves the pixel feel at any size)
- `fill="currentColor"` paths when `mode: 'currentColor'`

The output must also be **well-formed XML**, which is the whole point of emitting `xmlns`.
`title` carries user-supplied display names, so `escapeText`/`escapeAttr` strip the characters
XML 1.0 forbids outright — the C0 controls except tab/LF/CR, the two non-characters, and
unpaired surrogates. Those are illegal even as numeric character references, so they can only
be removed, never escaped. Strip before the entity pass, never after.

A11y rule — there is no wrapper element; `className`/`style` and all unknown props land on the
`<svg>` itself:
- Named (a `title` prop, or a caller-supplied `aria-label`/`aria-labelledby`): SVG has `role="img"`, and `title` renders as a `<title>` first child.
- Unnamed: SVG has `aria-hidden="true"` and no `role`.

`<title>` must receive exactly one child. `<title>a {b}</title>` renders empty in production
with only a dev warning.

### The React component is server-safe on purpose

`src/react.tsx` has no `'use client'`, no hooks and no context, so it renders in a React Server
Component (markup, zero client JS), in a Client Component, and in a pure-server
`renderToString` for emails and OG images. Adding `'use client'` forfeits the third and cannot
be walked back; adding `createContext` would force a Phosphor-style second `/ssr` entry.
`test/react.test.tsx` guards this by importing the module under `--conditions=react-server`.

`memo`/`useMemo` are *not* the constraint here — both are exported from React's `react-server`
build and work fine in RSC. They were dropped because `memo`'s shallow compare is defeated by
the inline `style={{…}}` object most consumers pass.

The string builder and the React component both resolve through `resolveParts` in
`src/render.ts` so they cannot drift. They are **not** byte-identical and no test asserts that
they are: React never self-closes SVG elements and escapes `'` and `"` that the string builder
correctly leaves alone. `test/react.test.tsx` compares the two canonically instead — empty
elements collapsed, attributes sorted, entities decoded.

### Bitmap → path RLE is horizontal-only

The encoder in `src/render.ts` merges horizontally adjacent filled cells into one rect command. It must NOT merge vertically — that's a different optimization with different correctness rules. See `test/bitmap.test.ts` for the canonical edge cases (empty bitmap, single cell, full row, multi-row, vertical adjacency, interrupted run).

### Zero runtime dependencies

React is a `peerDependencies` (optional). No new runtime deps without a strong reason.

### Public API is frozen

Anything exported from `src/index.ts` or `src/react.tsx` is a public contract. Adding non-breaking exports is fine; changing or removing existing ones requires a major bump.

The package is **ESM-only, deliberately**. The `exports` map uses a `default` condition rather
than `import` so a CommonJS consumer gets an honest resolution — on Node ≥ 20.19 / ≥ 22.12 that
means `require('smirks')` actually works via `require(esm)`, and on older runtimes it is a
plain ESM error instead of the misleading `No "exports" main defined`. There is a root `types`
field for `node10` type resolution, and `./package.json` is exported. Do not add a `require`
condition or a CJS build without also changing the `attw --profile esm-only` gate — that gate
is what currently makes the ESM-only claim true.

Every public optional is declared `?: T | undefined`. Without it, a consumer who enables
`exactOptionalPropertyTypes` cannot write `title={user.displayName}` or `fg={theme.brandFg}`
from a nullable source, and TypeScript blames a missing `mode` discriminant, which sends people
entirely the wrong way.

## Release pipeline

The package is published on npm as `smirks` and uses **OIDC trusted publisher** for releases — no `NPM_TOKEN`, no static credentials. Trusted publisher entry on npm: `madebyfrmwrk/smirks` repo, workflow filename `release.yml`, no environment.

Hard rules around releases:

- **While the version is `0.x`, breaking changes ship as `minor` changesets, never `major`.**
  A `major` changeset bumps straight to 1.0.0 and spends the stability signal early. Every
  changeset in the repo so far is `minor` and most are labelled `**Breaking:**` — that pairing is
  deliberate, not an oversight. 1.0 waits until the variant set is large enough that the avatar
  space (currently 1,248) is no longer the headline limitation.

- **Do NOT add `NPM_TOKEN` back to `.github/workflows/release.yml` env block.** Changesets prefers `NPM_TOKEN` when present and would silently degrade publishes from cryptographically-attested OIDC to bearer-token auth, dropping the provenance badge on new versions with no warning. The only auth path is OIDC.
- **Release runner must use Node 24+.** npm 10 (Node 22's default) only uses OIDC for provenance signing, not for authenticating publishes — publishes get rejected with a misleading 404. npm 11 (Node 24's default) uses OIDC end-to-end.
- **Bundle size hard cap: 2 KB gzipped per entry.** Enforced by `size-limit` config in `package.json`. CI fails if exceeded.
- **`pnpm pack:check` runs `publint --strict` + `attw --pack --profile esm-only`.** Catches `package.json` exports/types-resolution bugs before publish. Both CI (`ci.yml`) and release (`release.yml`) gate on this.
- **Release flow:** add a changeset (`pnpm changeset`), commit, push to main. Changesets workflow opens a "Version Packages" PR. Merging that PR triggers Changesets to bump the version, regenerate `CHANGELOG.md`, and publish via OIDC. The maintainer never runs `npm publish` directly.
