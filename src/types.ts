export type ColorPair = { readonly fg: string; readonly bg: string };

export type Palette =
  | { readonly fg: readonly string[]; readonly bg: readonly string[] }
  | { readonly pairs: readonly ColorPair[] };

export type SmirkColorOptions =
  | {
      mode?: 'palette';
      palette?: Palette;
      fg?: string;
      bg?: string;
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
