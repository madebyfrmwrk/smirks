export type ColorPair = { readonly fg: string; readonly bg: string };

export type Palette =
  | { readonly fg: readonly string[]; readonly bg: readonly string[] }
  | { readonly pairs: readonly ColorPair[] };

/**
 * Optionals are declared `| undefined` deliberately. Without it, a consumer who
 * enables `exactOptionalPropertyTypes` cannot write `fg={theme.brandFg}` or
 * `title={user.displayName}` from a nullable source — and TypeScript reports it
 * as a missing `mode` discriminant, which sends people the wrong way entirely.
 */
export type SmirkColorOptions =
  | {
      mode?: 'palette' | undefined;
      palette?: Palette | undefined;
      fg?: string | undefined;
      bg?: string | undefined;
    }
  | {
      mode: 'currentColor';
      palette?: never;
      fg?: never;
      bg?: never;
    };

export type GeneratedSmirk = {
  readonly eye: number;
  readonly mouth: number;
  readonly fg: string;
  readonly bg: string;
};
