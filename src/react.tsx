import { type CSSProperties, type JSX, memo, useMemo } from 'react';
import { generateSvg } from './render';
import type { SmirkColorOptions } from './types';

export type SmirkProps = SmirkColorOptions & {
  seed: string;
  className?: string;
  style?: CSSProperties;
  /**
   * Accessible label. Rendered as a `<title>` inside the SVG; the SVG carries
   * `role="img"`. Omit for decorative avatars (the SVG gets `aria-hidden="true"`).
   */
  title?: string;
};

function SmirkInner(props: SmirkProps): JSX.Element {
  const html = useMemo(
    () =>
      generateSvg(props.seed, {
        ...(props.mode === 'currentColor'
          ? { mode: 'currentColor' as const }
          : {
              ...(props.palette !== undefined && { palette: props.palette }),
              ...(props.fg !== undefined && { fg: props.fg }),
              ...(props.bg !== undefined && { bg: props.bg }),
            }),
        ...(props.title !== undefined && { title: props.title }),
      }),
    [props.seed, props.mode, props.palette, props.fg, props.bg, props.title],
  );

  return (
    <span
      className={props.className}
      style={props.style}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG is library-generated; seed is hashed before use; fg/bg/title are escaped in render.ts.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export const Smirk = memo(SmirkInner);
