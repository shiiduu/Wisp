/* eslint-disable react-refresh/only-export-components -- icons + data table, not a component module */
import type { FC, SVGProps } from 'react';
import type { BuildTag } from '@wisp/engine';

/**
 * Visual identity per BuildTag for the roll carousel — a distinct icon +
 * accent colour so a fast spin reads as shapes/colours rather than a blur
 * of text. No prior per-tag colour association existed in the UI, so this
 * palette is defined here: OKLCH values in the same lightness/chroma range
 * as the shared design tokens (see packages/ui/styles.css), hues spread
 * around the wheel for separation. `label` is the compact carousel-cell
 * caption; the full tag name is used in the final reveal.
 */

type Icon = FC<SVGProps<SVGSVGElement>>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const SwordIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <path d="M14.5 3.5 20 9l-9.5 9.5-3.5 1 1-3.5L14.5 3.5Z" />
    <path d="M6 18l-2 2M8.5 15.5 6 18" />
  </svg>
);

const SparkIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2.5 14 10l7.5 2-7.5 2-2 7.5-2-7.5L2.5 12 10 10l2-7.5Z" />
  </svg>
);

const ShieldIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
  </svg>
);

const AnvilIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <path d="M4 8h13a4 4 0 0 1-4 4H9a5 5 0 0 1-5-4ZM9 12v4M15 12v4M7 20h10M8 8V6h7" />
  </svg>
);

const BoltIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <path d="M13 2 4 14h7l-2 8 9-12h-7l2-8Z" />
  </svg>
);

const CrosshairIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="7" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

const PlusIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SkullIcon: Icon = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3a7 7 0 0 0-5 11.9V17a2 2 0 0 0 2 2h.5v2h5v-2H15a2 2 0 0 0 2-2v-2.1A7 7 0 0 0 12 3Z" />
    <path d="M9.5 12h.01M14.5 12h.01M12 15.5v1.5" />
  </svg>
);

export interface TagVisual {
  /** Compact carousel-cell caption. */
  label: string;
  /** Accent colour (OKLCH). */
  color: string;
  Icon: Icon;
}

export const TAG_VISUALS: Record<BuildTag, TagVisual> = {
  AD: { label: 'AD', color: 'oklch(0.72 0.17 32)', Icon: SwordIcon },
  AP: { label: 'AP', color: 'oklch(0.72 0.15 280)', Icon: SparkIcon },
  Tank: { label: 'Tank', color: 'oklch(0.72 0.06 235)', Icon: ShieldIcon },
  Bruiser: { label: 'Bruiser', color: 'oklch(0.73 0.12 55)', Icon: AnvilIcon },
  AttackSpeed: { label: 'AS', color: 'oklch(0.85 0.17 128)', Icon: BoltIcon },
  Crit: { label: 'Crit', color: 'oklch(0.83 0.15 88)', Icon: CrosshairIcon },
  Support: { label: 'Support', color: 'oklch(0.79 0.14 158)', Icon: PlusIcon },
  Lethality: { label: 'Lethality', color: 'oklch(0.65 0.16 332)', Icon: SkullIcon },
};
