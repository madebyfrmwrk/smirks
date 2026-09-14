---
'smirks': minor
---

**Breaking:** the default `viewBox` crops two cells of margin from each edge, from `0 0 512 512` to `64 64 384 384`. Every variant is drawn inside cells 5–10 of the 16-cell grid, so the full-grid viewBox showed the face at 37% of the box and it stopped reading below about 32px, which is where badge and list avatars live. At 50% of the box a 20px avatar has 2.5px cells instead of 1.25px. Only the `viewBox` attribute in the output changes: the hash, the variant indices, the palettes, the RLE paths and the background rect are byte-identical, and `test/__fixtures__/golden.json` moves in its `svg` block alone. The frame is now an invariant: `scripts/build-data.ts` and `test/data.test.ts` both fail loud on a variant that sets a cell outside cells 2–13, so a future drawing cannot be silently clipped.
