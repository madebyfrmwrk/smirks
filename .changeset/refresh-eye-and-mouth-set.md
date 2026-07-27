---
'smirks': minor
---

**Breaking:** refreshed the variant set. Retired one eye variant and added three new eyes and one new mouth drawn in Figma. `EYES` goes from 10 to 12 entries and `MOUTHS` from 7 to 8, so both `% EYES.length` and `% MOUTHS.length` shift and a given seed renders a different face. The new eyes are half-height counterparts to the existing open, right-wink and left-wink shapes; the new mouth is a smile. That takes the shape space to 96 combinations, all bitmaps distinct. Colors are unaffected.
