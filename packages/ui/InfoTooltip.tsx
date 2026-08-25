import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

interface InfoTooltipProps {
  /** Accessible label for the trigger button, e.g. "About champion data". */
  label: string;
  /** Short (1-3 sentence) explanation shown in the popover. */
  children: ReactNode;
  /** Which side of the trigger the popover opens toward. Default 'top'. */
  side?: 'top' | 'bottom';
  /** Horizontal alignment relative to the trigger. Default 'center'; use
   * 'end' near a right viewport edge so the popover doesn't overflow. */
  align?: 'center' | 'end';
  className?: string;
}

/**
 * A small "?" affordance that reveals a short explanatory popover on hover
 * (desktop) or tap (touch) or keyboard focus. Used to attach data-source
 * footnotes to specific UI zones without cluttering the layout.
 */
export function InfoTooltip({
  label,
  children,
  side = 'top',
  align = 'center',
  className = '',
}: InfoTooltipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={`group/tooltip relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={popoverId}
        onClick={() => setOpen((v: boolean) => !v)}
        className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-void-600 text-mist-400 transition-colors hover:border-wisp-500/60 hover:text-wisp-400 focus-visible:border-wisp-500/60 focus-visible:text-wisp-400 focus-visible:outline-none"
      >
        <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.4v3.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="0.9" fill="currentColor" />
        </svg>
      </button>
      <span
        role="tooltip"
        id={popoverId}
        className={`pointer-events-none absolute z-50 w-56 rounded-lg border border-void-600 bg-void-800 px-3 py-2 text-xs leading-relaxed text-mist-200 shadow-panel transition-opacity duration-150 ${
          side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
        } ${align === 'center' ? 'left-1/2 -translate-x-1/2' : 'right-0'} ${
          open ? 'opacity-100' : 'opacity-0'
        } group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100`}
      >
        {children}
      </span>
    </span>
  );
}
