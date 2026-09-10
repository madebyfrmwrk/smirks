import { type ComponentPropsWithoutRef, forwardRef, type JSX } from 'react';
import { resolveParts, VIEWBOX_SIZE } from './render';
import type { SmirkColorOptions } from './types';

export type SmirkProps = SmirkColorOptions &
  Omit<
    ComponentPropsWithoutRef<'svg'>,
    'children' | 'dangerouslySetInnerHTML' | 'mode' | 'title'
  > & {
    seed: string | number;
    /**
     * Accessible label. Rendered as a `<title>` inside the SVG; the SVG carries
     * `role="img"`. Omit for decorative avatars (the SVG gets `aria-hidden="true"`)
     * — but see the Accessibility section of the README: an avatar that is the
     * only content of a link or button needs a name from somewhere.
     */
    title?: string | undefined;
  };

/**
 * Renders the avatar as real SVG elements, with the `<svg>` as the root node.
 *
 * No `'use client'` and no hooks, deliberately. The component is a pure function
 * of its props, so it renders inside a Server Component (emitting markup and no
 * client JS), inside a Client Component, and in a pure-server `renderToString`
 * — a `'use client'` directive would forfeit the third.
 *
 * `className`/`style` land on the `<svg>` itself rather than a wrapper, so
 * `className="size-12 rounded-full"` sizes and clips without any extra CSS: an
 * `<svg>` is a replaced element that honours width/height and clips to its own
 * viewport.
 *
 * Unknown props spread onto the `<svg>`, so `ref`, `onClick`, `id`, `data-*`
 * and `aria-*` all reach the DOM — `asChild` triggers depend on it. The spread
 * sits after `width`/`height` (a caller may override the size) and before the
 * attributes CLAUDE.md pins as the output contract (a caller may not).
 */
export const Smirk = forwardRef<SVGSVGElement, SmirkProps>(function Smirk(
  { seed, mode, palette, fg, bg, title, ...rest },
  ref,
): JSX.Element {
  const parts = resolveParts(seed, mode === 'currentColor' ? { mode } : { mode, palette, fg, bg });

  // An avatar the caller has already named must not also be hidden from the
  // accessibility tree, or the name it was given is silently discarded.
  const labelled =
    title !== undefined ||
    rest['aria-label'] !== undefined ||
    rest['aria-labelledby'] !== undefined;

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <title> and role="img" are emitted together when the avatar has a name, and aria-hidden="true" when it does not; the rule cannot see the conditional.
    <svg
      width="1em"
      height="1em"
      {...rest}
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      shapeRendering="crispEdges"
      role={labelled ? 'img' : undefined}
      aria-hidden={labelled ? undefined : true}
    >
      {/* Exactly one child: `<title>a {b}</title>` renders empty in production. */}
      {title === undefined ? null : <title>{title}</title>}
      <rect width={VIEWBOX_SIZE} height={VIEWBOX_SIZE} fill={parts.bg} />
      <path d={parts.eyePath} fill={parts.fg} />
      <path d={parts.mouthPath} fill={parts.fg} />
    </svg>
  );
});
