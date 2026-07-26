# smirks

## 0.1.0

### Minor Changes

- 81f60aa: **Breaking:** the variant set changed, so a given seed renders a different face than it did in 0.0.2. `MOUTHS` drops from 9 to 7 entries, which shifts `% MOUTHS.length` for most seeds. `EYES` stays at 12, but one variant was retired and a left-eye wink — the horizontal mirror of the existing right-eye wink — was appended, so the last two eye indices resolve to different faces. Colors are unaffected: palette selection reads separate hash bits and the palettes themselves are unchanged.

## 0.0.2

### Patch Changes

- Verify OIDC trusted publishing pipeline. Releases from 0.0.2 onward are published from CI with cryptographic provenance attestations (the npm "Published with provenance" badge).

## 0.0.1

### Patch Changes

- Initial release. Deterministic pixel-face avatars composed of one of 12 eye variants and one of 9 mouth variants, picked from a 32-bit FNV-1a hash of the seed string. Ships with four palettes (`default` soft, `bold`, `monochrome`, `duotone`), independent `fg` / `bg` overrides, and a `currentColor` mode for Tailwind-native theming.
