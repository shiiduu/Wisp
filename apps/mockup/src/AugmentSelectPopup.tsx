import type { Augment } from '@wisp/data/types';
import { InfoTooltip } from '@wisp/ui';
import { AugmentIcon } from './AugmentIcon';

const RARITY_STYLES: Record<string, string> = {
  silver: 'border-void-600 bg-void-800/60 hover:border-void-500',
  gold: 'border-gold-500/40 bg-gold-500/10 hover:border-gold-500/70',
  prismatic: 'border-wisp-500/40 bg-wisp-500/10 hover:border-wisp-500/70',
  unknown: 'border-void-600 bg-void-800/60 hover:border-void-500',
};

interface AugmentSelectPopupProps {
  choices: Augment[];
  /** apiName of the choice Wisp suggests — highlighted with a badge. */
  recommendedApiName: string;
  onSelect: (augment: Augment) => void;
  onClose: () => void;
}

export function AugmentSelectPopup({
  choices,
  recommendedApiName,
  onSelect,
  onClose,
}: AugmentSelectPopupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl2 border border-void-600 bg-void-900 p-8 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute right-4 top-4">
          <InfoTooltip label="About this popup" side="bottom" align="end">
            Simulates the real ARAM Mayhem in-game augment choice prompt. Augment data is
            static, local JSON generated from Community Dragon — never fetched live.
          </InfoTooltip>
        </div>

        <p className="text-center text-xs font-medium uppercase tracking-wider text-troll-400">
          Choose an augment
        </p>
        <h2 className="mt-1 text-center font-display text-xl font-semibold">
          Prismatic Round
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {choices.map((augment) => {
            const isRecommended = augment.apiName === recommendedApiName;
            return (
              <button
                key={augment.apiName}
                type="button"
                onClick={() => onSelect(augment)}
                className={`relative flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-colors ${RARITY_STYLES[augment.rarity]} ${
                  isRecommended ? 'ring-2 ring-wisp-400 ring-offset-2 ring-offset-void-900' : ''
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full border border-wisp-400 bg-wisp-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-void-950">
                    Wisp pick
                  </span>
                )}
                <AugmentIcon apiName={augment.apiName} alt={augment.name} className="h-12 w-12" />
                <span className="text-sm font-medium text-mist-100">{augment.name}</span>
                <span className="text-xs leading-relaxed text-mist-400">{augment.description}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-6 block text-xs text-mist-500 hover:text-mist-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
