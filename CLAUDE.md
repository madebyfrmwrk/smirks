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
- Adding a variant: drop the SVG into `~/Desktop/smirks-faces/` with the next `eyes-N` / `mouth-N` filename — **do not reuse removed numbers** (current gaps at `eyes-7` and `eyes-13` are intentional and preserve filename → Figma-export provenance). Then run `pnpm build:data`, open `scripts/diff/index.html`, commit the regenerated `src/data/*.ts` plus a changeset.
- Never hand-edit `src/data/eyes.ts` or `src/data/mouths.ts`. They're generated.

### Determinism

Same `(seed, palette, fg?, bg?)` must produce byte-identical SVG output forever, on every runtime. The contract:

| Mode                                  | Deterministic on                                       |
|---------------------------------------|--------------------------------------------------------|
| Palette (default)                     | `(seed, palette) → SVG bytes`                          |
| Palette + partial/full `fg`/`bg`      | `(seed, palette, fg?, bg?) → SVG bytes`                |
| `mode: 'currentColor'`                | `seed → SVG bytes` (color-free; visual depends on CSS) |

Hash bit allocation (FNV-1a 32-bit):

| Bits   | Use                          | Modulo                                              |
|--------|------------------------------|-----------------------------------------------------|
| 0–7    | eye index                    | `% EYES.length` (currently 12)                      |
| 8–15   | mouth index                  | `% MOUTHS.length` (currently 9)                     |
| 16–23  | palette pick                 | pairs mode: `% pairs.length` · arrays mode: fg index |
| 24–31  | bg index (arrays mode only)  | arrays mode: `% bg.length` · pairs mode: ignored    |

Never reorder or remove entries from `EYES` / `MOUTHS` / `palettes.default.pairs` / `palettes.bold.pairs`. Append-only — and even appending shifts `% length` outputs for some seeds, so it's a major version bump.

### Locked palettes

`palettes.default` (soft, Tailwind `*-600`/`*-700` on `*-50`) and `palettes.bold` (white on the soft palette's foregrounds, derived via `.map()`) ship with frozen hex codes in this exact rainbow order: red, orange, amber, yellow, lime, emerald, cyan, blue, violet, purple, fuchsia, rose. Do not edit existing entries.

### SVG output contract

Every emitted SVG must include:
- `xmlns="http://www.w3.org/2000/svg"` (required for non-HTML embedding contexts)
- `viewBox="0 0 512 512"`
- `shape-rendering="crispEdges"` (preserves the pixel feel at any size)
- `fill="currentColor"` paths when `mode: 'currentColor'`

A11y rule (avoids screen-reader double-announce):
- With `title` prop: SVG has `role="img"` and `<title>` as first child. Wrapper `<span>` has no aria.
- Without `title` prop: SVG has `aria-hidden="true"`. Wrapper `<span>` has no aria.

### Bitmap → path RLE is horizontal-only

The encoder in `src/render.ts` merges horizontally adjacent filled cells into one rect command. It must NOT merge vertically — that's a different optimization with different correctness rules. See `test/bitmap.test.ts` for the canonical edge cases (empty bitmap, single cell, full row, multi-row, vertical adjacency, interrupted run).

### Zero runtime dependencies

React is a `peerDependencies` (optional). No new runtime deps without a strong reason.

### Public API is frozen

Anything exported from `src/index.ts` or `src/react.tsx` is a public contract. Adding non-breaking exports is fine; changing or removing existing ones requires a major bump.

## Release pipeline

The package is published on npm as `smirks` and uses **OIDC trusted publisher** for releases — no `NPM_TOKEN`, no static credentials. Trusted publisher entry on npm: `madebyfrmwrk/smirks` repo, workflow filename `release.yml`, no environment.

Hard rules around releases:

- **Do NOT add `NPM_TOKEN` back to `.github/workflows/release.yml` env block.** Changesets prefers `NPM_TOKEN` when present and would silently degrade publishes from cryptographically-attested OIDC to bearer-token auth, dropping the provenance badge on new versions with no warning. The only auth path is OIDC.
- **Release runner must use Node 24+.** npm 10 (Node 22's default) only uses OIDC for provenance signing, not for authenticating publishes — publishes get rejected with a misleading 404. npm 11 (Node 24's default) uses OIDC end-to-end.
- **Bundle size hard cap: 2 KB gzipped per entry.** Enforced by `size-limit` config in `package.json`. CI fails if exceeded.
- **`pnpm pack:check` runs `publint --strict` + `attw --pack --profile esm-only`.** Catches `package.json` exports/types-resolution bugs before publish. Both CI (`ci.yml`) and release (`release.yml`) gate on this.
- **Release flow:** add a changeset (`pnpm changeset`), commit, push to main. Changesets workflow opens a "Version Packages" PR. Merging that PR triggers Changesets to bump the version, regenerate `CHANGELOG.md`, and publish via OIDC. The maintainer never runs `npm publish` directly.
