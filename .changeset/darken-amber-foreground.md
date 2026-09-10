---
'smirks': minor
---

**Breaking:** amber moves from `amber-600` `#d97706` to `amber-700` `#b45309` in the default palette, and so from white-on-`#d97706` to white-on-`#b45309` in bold. Amber was the weakest pair in both: 3.07:1 and APCA Lc 56.0 soft, 3.19:1 and Lc 63.9 bold, against bars of 3:1 and Lc 50. At `*-700` those become 4.84:1 and Lc 71.5, and 5.02:1 and Lc 79.5, which lifts the palette's worst case to orange-600 on orange-50 at 3.35:1 and Lc 58.0. Yellow and lime already used `*-700` for exactly this reason; amber-600 was the outlier. One pair in thirteen changes colour, so roughly one seed in thirteen renders differently; shapes are unaffected. `test/contrast.test.ts` now asserts every pair against both bars, asserts that each foreground sits on its own hue, and pins the measured minima as erosion tripwires.
