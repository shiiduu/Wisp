import type { DragEvent, ReactNode } from 'react';
import type { Augment } from '@wisp/data/types';
import { AugmentIcon } from './AugmentIcon';
import type { ShopEntry } from './ItemsToBuy';

export const MAX_PURCHASED_ITEMS = 6;
export const MAX_SELECTED_AUGMENTS = 5;

interface CharacterPanelProps {
  gold: number;
  cs: number;
  championInfo?: ReactNode;
  purchased: ShopEntry[];
  purchasedInfo?: ReactNode;
  selectedAugments: Augment[];
  onDropItem: (itemId: number) => void;
  onRemoveItem: (itemId: number) => void;
  onRemoveAugment: (apiName: string) => void;
}

export function CharacterPanel({
  gold,
  cs,
  championInfo,
  purchased,
  purchasedInfo,
  selectedAugments,
  onDropItem,
  onRemoveItem,
  onRemoveAugment,
}: CharacterPanelProps) {
  const isInventoryFull = purchased.length >= MAX_PURCHASED_ITEMS;

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (isInventoryFull) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isInventoryFull) return;
    const itemId = Number(event.dataTransfer.getData('text/plain'));
    if (!Number.isNaN(itemId)) onDropItem(itemId);
  }

  return (
    <section
      data-nogo="true"
      className="z-20 flex w-72 shrink-0 flex-col overflow-y-auto rounded-xl2 border border-void-700 bg-void-900/70 p-5 shadow-panel backdrop-blur-sm"
    >
      <div className="mb-3 flex items-center gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-mist-400">Champion</p>
        {championInfo}
      </div>
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
          <span className="ml-auto font-mono text-[11px] text-mist-500">
            {purchased.length}/{MAX_PURCHASED_ITEMS}
          </span>
        </div>
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`min-h-[3.5rem] rounded-lg border border-dashed p-2 ${
            isInventoryFull ? 'border-troll-500/40 bg-troll-500/5' : 'border-void-700'
          }`}
        >
          {purchased.length === 0 ? (
            <p className="py-2 text-center text-[11px] text-mist-500">
              Drag or click a shop item to buy it
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-1.5">
              {purchased.map(({ item, icon }) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onRemoveItem(item.id)}
                  title={`${item.name} — ${item.price}g (click to remove)`}
                  className="group relative h-9 w-9 shrink-0 rounded-md border border-void-600 bg-void-800"
                >
                  <img src={icon} alt={item.name} className="h-full w-full rounded-md" />
                  <span className="absolute inset-0 flex items-center justify-center rounded-md bg-void-950/70 text-troll-400 opacity-0 transition-opacity group-hover:opacity-100">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M3 3l8 8M11 3l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          )}
          {isInventoryFull && (
            <p className="mt-1.5 text-center text-[11px] text-troll-400">Inventory full</p>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center gap-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-mist-400">
            Selected augments
          </p>
          <span className="ml-auto font-mono text-[11px] text-mist-500">
            {selectedAugments.length}/{MAX_SELECTED_AUGMENTS}
          </span>
        </div>
        {selectedAugments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-void-700 py-2 text-center text-[11px] text-mist-500">
            No augments picked yet
          </p>
        ) : (
          <div className="space-y-2">
            {selectedAugments.map((aug) => (
              <button
                key={aug.apiName}
                type="button"
                onClick={() => onRemoveAugment(aug.apiName)}
                title={`${aug.name} (click to remove)`}
                className="group flex w-full items-center gap-2 rounded-lg border border-void-700 px-2 py-1.5 text-left transition-colors hover:border-troll-500/50"
              >
                <AugmentIcon apiName={aug.apiName} alt={aug.name} className="h-7 w-7" />
                <span className="flex-1 text-xs text-mist-200">{aug.name}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                  className="shrink-0 text-mist-500 opacity-0 transition-opacity group-hover:opacity-100 group-hover:text-troll-400"
                >
                  <path
                    d="M3 3l8 8M11 3l-8 8"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
