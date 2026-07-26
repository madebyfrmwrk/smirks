---
'smirks': minor
---

**Breaking:** added a neutral pair to the default and bold palettes. `palettes.default` gains `neutral-600` on `neutral-50` as a thirteenth pair, and `palettes.bold` picks it up automatically since it is derived from the same array. Twelve chromatic hues stay in colour-wheel order and neutral sits last, the only slot the append-only rule allows. `pairs.length` goes from 12 to 13, which shifts `% pairs.length` for most seeds — colors change, shapes do not. The new pair clears the documented accessibility floor with room to spare: WCAG 7.49:1 and APCA Lc 84.2 soft, 7.81:1 and Lc 91.9 bold, against a previous worst case of 3.07:1 and Lc 56.0.
