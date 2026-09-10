---
'smirks': patch
---

The determinism guarantee is now falsifiable. `test/__fixtures__/golden.json` pins the hash values, the per-variant RLE paths and the complete SVG strings for a covering seed set across every mode, regenerated deliberately with `pnpm build:golden`. The suite previously only asserted that `generateSvg(x)` equals `generateSvg(x)`, which is true by construction: changing the FNV-1a prime, which rerolls every avatar ever generated, passed all 36 tests. It now fails three. The fixture is layered so a failure localises — a changed hash fails the hash block, a redrawn variant the paths block, a palette edit only the SVG block — and `test/data.test.ts` re-anchors the invariants `build:data` enforces on the maintainer's machine but CI never re-checked: 32-byte bitmaps, no duplicates, no empty variants, pinned counts.
