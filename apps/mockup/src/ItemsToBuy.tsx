import type { DragEvent } from 'react';
import type { Item } from '@wisp/data/types';
import { Panel } from './Panel';
import { ItemIcon } from './ItemIcon';

export interface ShopEntry {
  item: Item;
  recommended?: boolean;
}

interface ItemsToBuyProps {
  entries: ShopEntry[];
  onBuy: (itemId: number) => void;
  disabled?: boolean;
}

export function ItemsToBuy({ entries, onBuy, disabled = false }: ItemsToBuyProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>, itemId: number) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData('text/plain', String(itemId));
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <Panel title="Items to buy">
      <p className="mb-2 text-xs text-mist-500">
        The full recommended build — at most 6 (boots + 5). Buy them to fill your inventory.
      </p>
      {disabled && (
        <p className="mb-2 text-xs text-troll-400">Inventory full — sell or use an item first.</p>
      )}
      {entries.length === 0 ? (
        <p className="text-xs text-mist-500">Whole build purchased — inventory complete.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {entries.map(({ item, recommended }) => (
            <button
              key={item.id}
              type="button"
              draggable={!disabled}
              disabled={disabled}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onClick={() => onBuy(item.id)}
              title={item.description}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors ${
                disabled
                  ? 'cursor-not-allowed border-void-700 bg-void-800/20 opacity-40'
                  : `cursor-grab active:cursor-grabbing ${
                      recommended
                        ? 'border-wisp-500/40 bg-wisp-500/10 hover:border-wisp-500/70'
                        : 'border-void-700 bg-void-800/40 hover:border-void-600'
                    }`
              }`}
            >
              <ItemIcon id={item.id} className="h-9 w-9 border border-white/10" />
              <span className="line-clamp-1 text-[11px] text-mist-200">{item.name}</span>
              <span className="font-mono text-[11px] text-gold-500">{item.price}g</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
