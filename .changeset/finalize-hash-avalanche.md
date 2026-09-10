---
'smirks': minor
---

**Breaking:** `fnv1a` gains a MurmurHash3 fmix32 finalizer, which changes the avatar for every seed. Plain FNV-1a barely moves its middle bits when only the last character of the input changes, and bits 16-31 are what select the colours — so consecutive sequential seeds shared a foreground 89% of the time against 7.7% at chance, and a user list rendered in id order came out in visible colour bands of about ten. `seed={user.id}` with an integer primary key is the single most common call, so this was the common case, not an edge one. The finalizer takes that to 7.6%, at chance. It does not change how many distinct avatars exist — roughly 4,300 per 5,000 sequential seeds either way — only how evenly neighbouring seeds spread across them, and seeds that were already well distributed, such as UUIDs and email addresses, are statistically unaffected. Four extra operations, about ten bytes minified, no dependency. `src/hash.ts` documents why it must stay.
