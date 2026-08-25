import type { DragEvent } from 'react';
import type { Item } from '@wisp/data/types';
import { Panel } from './Panel';

export interface ShopEntry {
  item: Item;
  icon: string;
  recommended?: boolean;
}

interface ItemsToBuyProps {
  entries: ShopEntry[];
  onBuy: (itemId: number) => void;
}

export function ItemsToBuy({ entries, onBuy }: ItemsToBuyProps) {
  function handleDragStart(event: DragEvent<HTMLButtonElement>, itemId: number) {
    event.dataTransfer.setData('text/plain', String(itemId));
    event.dataTransfer.effectAllowed = 'move';
  }

  return (
    <Panel title="Items to buy">
      {entries.length === 0 ? (
        <p className="text-xs text-mist-500">All stocked items purchased.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {entries.map(({ item, icon, recommended }) => (
            <button
              key={item.id}
              type="button"
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onClick={() => onBuy(item.id)}
              title={item.description}
              className={`flex cursor-grab flex-col items-center gap-1 rounded-lg border px-2 py-2 text-center transition-colors active:cursor-grabbing ${
                recommended
                  ? 'border-wisp-500/40 bg-wisp-500/10 hover:border-wisp-500/70'
                  : 'border-void-700 bg-void-800/40 hover:border-void-600'
              }`}
            >
              <img src={icon} alt="" className="h-9 w-9 rounded-md border border-white/10" />
              <span className="line-clamp-1 text-[11px] text-mist-200">{item.name}</span>
              <span className="font-mono text-[11px] text-gold-500">{item.price}g</span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
