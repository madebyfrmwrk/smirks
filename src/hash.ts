/**
 * FNV-1a 32-bit hash with a MurmurHash3 fmix32 finalizer. Deterministic,
 * branch-free, no dependencies.
 *
 * The output is the seed for every variant/palette pick in the library —
 * changing this function is a major version bump.
 *
 * The finalizer is load-bearing, not decoration. Plain FNV-1a barely moves its
 * middle bits when only the last character of the input changes, and bits 16-31
 * drive the colour picks: consecutive sequential seeds (`user-0`, `user-1`, ...,
 * or integer primary keys) shared a foreground 89% of the time against 7.7% at
 * chance, so a user list in id order rendered in visible colour bands of about
 * ten. fmix32 takes that to 7.6%. It does not change how many distinct avatars
 * exist — roughly 4,300 per 5,000 sequential seeds either way — only how evenly
 * neighbouring seeds are spread across them.
 */
export function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 16;
  return h >>> 0;
}
