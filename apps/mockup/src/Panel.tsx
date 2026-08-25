import type { ReactNode } from 'react';

/**
 * Shared panel chrome. Every Panel instance is real UI the mascot must
 * never wander over, hence the built-in `data-nogo` marker consumed by
 * useNoGoZones.
 */
export function Panel({
  title,
  info,
  children,
  className = '',
}: {
  title: string;
  info?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      data-nogo="true"
      className={`z-20 rounded-xl2 border border-void-700 bg-void-900/70 p-5 shadow-panel backdrop-blur-sm ${className}`}
    >
      <div className="mb-3 flex items-center gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-mist-400">{title}</p>
        {info}
      </div>
      {children}
    </section>
  );
}
