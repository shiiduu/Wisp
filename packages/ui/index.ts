export { InfoTooltip } from './InfoTooltip';

/**
 * Design tokens are defined as CSS custom properties in `styles.css`
 * (Tailwind v4 `@theme`). This export covers the handful of raw values
 * needed outside Tailwind class contexts (e.g. inline SVG, canvas).
 */
export const tokens = {
  colors: {
    wisp: 'oklch(0.78 0.14 190)',
    troll: 'oklch(0.72 0.19 25)',
    gold: 'oklch(0.80 0.15 85)',
  },
} as const;
