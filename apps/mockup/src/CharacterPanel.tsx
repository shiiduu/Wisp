import type { DragEvent, ReactNode } from 'react';
import type { Augment } from '@wisp/data/types';
import { AugmentIcon } from './AugmentIcon';
import type { ShopEntry } from './ItemsToBuy';

interface CharacterPanelProps {
  gold: number;
  cs: number;
  purchased: ShopEntry[];
  purchasedInfo?: ReactNode;
  selectedAugments: Augment[];
  onDropItem: (itemId: number) => void;
}

export function CharacterPanel({
  gold,
  cs,
  purchased,
  purchasedInfo,
  selectedAugments,
  onDropItem,
}: CharacterPanelProps) {
  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const itemId = Number(event.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(itemId)) onDropItem(itemId);
  }

  return (
    <section
      data-nogo="true"
      className="z-20 flex w-72 shrink-0 flex-col overflow-y-auto rounded-xl2 border border-void-700 bg-void-900/70 p-5 shadow-panel backdrop-blur-sm"
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-mist-400">Champion</p>
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-void-600 bg-void-800 font-display text-2xl">
          DM
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold">Dr. Mundo</h2>
          <p className="text-sm text-mist-400">Level 14 · Top</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border border-void-700 px-3 py-2">
          <p className="text-mist-400">Gold</p>
          <p className="font-mono text-mist-100">{gold.toLocaleString()}</p>
        </div>
        <div className="rounded-lg border border-void-700 px-3 py-2">
          <p className="text-mist-400">CS</p>
          <p className="font-mono text-mist-100">{cs}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-mist-400">
            Purchased items
          </p>
          {purchasedInfo}
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="min-h-[3.5rem] rounded-lg border border-dashed border-void-700 p-2"
        >
          {purchased.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-mist-500">
              Drag or click a shop item to buy it
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {purchased.map(({ item, icon }) => (
                <img
                  key={item.id}
                  src={icon}
                  alt={item.name}
                  title={`${item.name} — ${item.price}g`}
                  className="h-9 w-9 rounded-md border border-void-600 bg-void-800"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-mist-400">
          Selected augments
        </p>
        {selectedAugments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-void-700 py-2 text-center text-[11px] text-mist-500">
            No augments picked yet
          </p>
        ) : (
          <div className="space-y-2">
            {selectedAugments.map((aug) => (
              <div
                key={aug.apiName}
                className="flex items-center gap-2 rounded-lg border border-void-700 px-2 py-1.5"
              >
                <AugmentIcon apiName={aug.apiName} alt={aug.name} className="h-7 w-7" />
                <span className="text-xs text-mist-200">{aug.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
