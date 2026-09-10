---
'smirks': major
---

**Breaking:** `seed` widens from `string` to `string | number`, and every other type now throws. `fnv1a` loops on `str.length`, so a non-string skipped the loop entirely and returned the FNV offset basis: `generate(42)`, `generate(999)`, `generate({})` and `generate('')` all produced one identical amber face, and `null` threw an unbranded `Cannot read properties of null`. Numbers are accepted and normalised with `String(seed)`, so `generate(42)` and `generate('42')` are the same avatar forever — integer primary keys are what `seed={user.id}` invites. Anything else throws a `smirks:`-prefixed `TypeError`. Shapes and colors are unaffected for string seeds, which is every seed that previously worked.
