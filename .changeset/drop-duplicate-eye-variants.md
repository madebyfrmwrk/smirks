---
'smirks': minor
---

**Breaking:** removed two duplicate eye variants. Three source files were byte-identical exports of the same drawing, so 0.1.0 shipped 12 eye entries but only 10 distinct faces — and the shared face was three times likelier than any other. `EYES` drops from 12 to 10 entries, which shifts `% EYES.length` for most seeds. Mouths and colors are unaffected. `build:data` now fails loud on any two variants that quantize to the same bitmap, so this cannot recur.
