# smirks

## 0.0.2

### Patch Changes

- Verify OIDC trusted publishing pipeline. Releases from 0.0.2 onward are published from CI with cryptographic provenance attestations (the npm "Published with provenance" badge).

## 0.0.1

### Patch Changes

- Initial release. Deterministic pixel-face avatars composed of one of 12 eye variants and one of 9 mouth variants, picked from a 32-bit FNV-1a hash of the seed string. Ships with four palettes (`default` soft, `bold`, `monochrome`, `duotone`), independent `fg` / `bg` overrides, and a `currentColor` mode for Tailwind-native theming.
