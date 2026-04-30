/**
 * FNV-1a 32-bit hash. Deterministic, branch-free, no dependencies.
 * The output is the seed for every variant/palette pick in the library —
 * changing this function is a major version bump.
 */
export function fnv1a(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
