import type { Augment } from '@wisp/data/types';
import { AugmentIcon } from './AugmentIcon';

const RARITY_STYLES: Record<string, string> = {
  silver: 'border-void-600 bg-void-800/60 hover:border-void-500',
  gold: 'border-gold-500/40 bg-gold-500/10 hover:border-gold-500/70',
  prismatic: 'border-wisp-500/40 bg-wisp-500/10 hover:border-wisp-500/70',
  unknown: 'border-void-600 bg-void-800/60 hover:border-void-500',
};

interface AugmentSelectPopupProps {
  choices: Augment[];
  onSelect: (augment: Augment) => void;
  onClose: () => void;
}

export function AugmentSelectPopup({ choices, onSelect, onClose }: AugmentSelectPopupProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl2 border border-void-600 bg-void-900 p-8 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-center text-xs font-medium uppercase tracking-wider text-troll-400">
          Choose an augment
        </p>
        <h2 className="mt-1 text-center font-display text-xl font-semibold">
          Prismatic Round
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {choices.map((augment) => (
            <button
              key={augment.apiName}
              type="button"
              onClick={() => onSelect(augment)}
              className={`flex flex-col items-center gap-3 rounded-lg border p-4 text-center transition-colors ${RARITY_STYLES[augment.rarity]}`}
            >
              <AugmentIcon apiName={augment.apiName} alt={augment.name} className="h-12 w-12" />
              <span className="text-sm font-medium text-mist-100">{augment.name}</span>
              <span className="text-xs leading-relaxed text-mist-400">{augment.description}</span>
            </button>
          ))}
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
