import { useState } from 'react';
import type { Augment } from '@wisp/data/types';
import { InfoTooltip } from '@wisp/ui';
import augmentsData from '@wisp/data/augments.json';
import itemsData from '@wisp/data/items.json';
import backToBasicsIcon from '@wisp/data/assets/augments/backtobasics.png';

import iconRabadon from '@wisp/data/assets/items/3089.png';
import iconVoidStaff from '@wisp/data/assets/items/3135.png';
import iconLiandry from '@wisp/data/assets/items/6653.png';
import iconZhonya from '@wisp/data/assets/items/3157.png';
import iconRylai from '@wisp/data/assets/items/3116.png';
import iconSorcShoes from '@wisp/data/assets/items/3020.png';
import iconShadowflame from '@wisp/data/assets/items/4645.png';
import iconMorellonomicon from '@wisp/data/assets/items/3165.png';
import iconLichBane from '@wisp/data/assets/items/3100.png';
import iconControlWard from '@wisp/data/assets/items/2055.png';
import iconHealthPotion from '@wisp/data/assets/items/2003.png';
import iconDoranRing from '@wisp/data/assets/items/1056.png';

import { Panel } from './Panel';
import { CharacterPanel } from './CharacterPanel';
import { ItemsToBuy, type ShopEntry } from './ItemsToBuy';
import { SkillOrder } from './SkillOrder';
import { AugmentSelectPopup } from './AugmentSelectPopup';
import Companion, { type ReactionKind } from './Companion';
import { useNoGoZones } from './useNoGoZones';

const CHAMPION_LEVEL = 14;

// NullAugment is an internal placeholder entry in Community Dragon's data
// (used for empty slots), not a real offerable augment — exclude it.
const AUGMENTS = (augmentsData.augments as Augment[]).filter((a) => a.apiName !== 'NullAugment');
const FEATURED_AUGMENT = AUGMENTS.find((a) => a.apiName === 'BacktoBasics')!;
const OTHER_AUGMENT_CHOICES = ['Firebrand', 'Cannon Fodder'];

const RARITY_STYLES: Record<string, string> = {
  silver: 'border-void-600 bg-void-800/60 text-mist-300',
  gold: 'border-gold-500/40 bg-gold-500/10 text-gold-500',
  prismatic: 'border-wisp-500/40 bg-wisp-500/10 text-wisp-400',
  unknown: 'border-void-600 bg-void-800/60 text-mist-300',
};

function findItem(id: number) {
  const item = itemsData.items.find((i) => i.id === id);
  if (!item) throw new Error(`Missing item ${id} in items.json — re-run "pnpm fetch:items"?`);
  return item;
}

/** Items to buy must be top-tier (no further upgrade) — assert it, don't just assume it. */
function findCompletedItem(id: number) {
  const item = findItem(id);
  if (!item.isCompleted) {
    throw new Error(`Item ${id} (${item.name}) is a component, not a completed item`);
  }
  return item;
}

// Pre-seeded starting mock data for the character panel's "purchased
// items" area — the same list, and the same area, an actual buy action
// appends to.
const INITIAL_PURCHASED_ITEMS: ShopEntry[] = [
  { item: findItem(3089), icon: iconRabadon },
  { item: findItem(3135), icon: iconVoidStaff },
  { item: findItem(6653), icon: iconLiandry },
  { item: findItem(3157), icon: iconZhonya },
  { item: findItem(3116), icon: iconRylai },
  { item: findItem(3020), icon: iconSorcShoes },
];

const INITIAL_SHOP_ITEMS: ShopEntry[] = [
  { item: findCompletedItem(4645), icon: iconShadowflame, recommended: true },
  { item: findCompletedItem(3165), icon: iconMorellonomicon, recommended: true },
  { item: findCompletedItem(3100), icon: iconLichBane, recommended: false },
  { item: findCompletedItem(2055), icon: iconControlWard, recommended: false },
  { item: findCompletedItem(2003), icon: iconHealthPotion, recommended: false },
  { item: findCompletedItem(1056), icon: iconDoranRing, recommended: false },
];

function sampleRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function ChallengeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path
        d="M11 2 13.4 8.2 20 9l-5 4.6L16.4 20 11 16.3 5.6 20 7 13.6 2 9l6.6-.8L11 2Z"
        fill="var(--color-troll-500)"
      />
    </svg>
  );
}

export default function App() {
  const [reaction, setReaction] = useState<ReactionKind>(null);
  const [gold] = useState(4269);
  const [cs] = useState(187);

  const [shopEntries, setShopEntries] = useState<ShopEntry[]>(INITIAL_SHOP_ITEMS);
  const [purchased, setPurchased] = useState<ShopEntry[]>(INITIAL_PURCHASED_ITEMS);
  const [selectedAugments, setSelectedAugments] = useState<Augment[]>([]);
  const [popupChoices, setPopupChoices] = useState<Augment[] | null>(null);

  const noGoZones = useNoGoZones([
    shopEntries.length,
    purchased.length,
    selectedAugments.length,
  ]);

  function buyItem(itemId: number) {
    setShopEntries((prev) => {
      const entry = prev.find((e) => e.item.id === itemId);
      if (!entry) return prev;
      setPurchased((p) => (p.some((e) => e.item.id === itemId) ? p : [...p, entry]));
      return prev.filter((e) => e.item.id !== itemId);
    });
  }

  function openAugmentPopup() {
    setPopupChoices(sampleRandom(AUGMENTS, 3));
  }

  function selectAugment(augment: Augment) {
    setSelectedAugments((prev) =>
      prev.some((a) => a.apiName === augment.apiName) ? prev : [...prev, augment],
    );
    setPopupChoices(null);
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-void-950 font-body text-mist-100">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-32 left-1/3 h-96 w-96 rounded-full bg-wisp-500/8 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-troll-500/10 blur-3xl" />
      </div>

      <div className="relative z-20 flex h-full w-full flex-col gap-5 p-6">
        <Panel
          title="Tonight's troll challenge"
          info={
            <InfoTooltip label="About the challenge">
              This challenge is Wisp&apos;s own logic — a locally defined pick, not data from
              Riot or Community Dragon.
            </InfoTooltip>
          }
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ChallengeIcon />
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">AP Mundo</h1>
              <p className="text-sm text-mist-400">Full magic damage, zero shame</p>
            </div>
          </div>
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-wisp-500/30 bg-wisp-500/10 px-4 py-1.5 text-sm font-medium text-wisp-400">
              <span className="h-1.5 w-1.5 rounded-full bg-wisp-500" />
              On track
            </div>
            <InfoTooltip label="Data & privacy" side="bottom" align="end">
              Live match data comes only from the Overwolf Game Events Provider (GameID 5426) —
              no other channel. No memory reading, OCR, input injection, or fog-of-war access.
              Wisp is read-only and display-only.
            </InfoTooltip>
          </div>
        </Panel>

        <div className="flex min-h-0 flex-1 gap-6">
          <CharacterPanel
            gold={gold}
            cs={cs}
            purchased={purchased}
            purchasedInfo={
              <InfoTooltip label="About item data">
                Item data is static, local JSON generated from Riot Data Dragon — never fetched
                live.
              </InfoTooltip>
            }
            selectedAugments={selectedAugments}
            onDropItem={buyItem}
          />

          <div className="flex min-h-0 flex-1 flex-col">
            {/* Open space above — this is where the mascot mostly wanders. */}
            <div className="flex-1" />

            <ItemsToBuy entries={shopEntries} onBuy={buyItem} />
          </div>

          <div className="flex w-80 shrink-0 flex-col gap-5">
            <Panel
              title="Augment pick"
              info={
                <InfoTooltip label="About augment data">
                  Augment name, icon and description are static, local JSON generated from
                  Community Dragon&apos;s Arena augment data — never fetched live.
                </InfoTooltip>
              }
            >
              <div className="space-y-3">
                <div
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${RARITY_STYLES[FEATURED_AUGMENT.rarity]}`}
                >
                  <img
                    src={backToBasicsIcon}
                    alt=""
                    className="mt-0.5 h-8 w-8 shrink-0 rounded-md border border-white/10"
                  />
                  <div>
                    <p className="text-sm font-medium">{FEATURED_AUGMENT.name}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-mist-400">
                      {FEATURED_AUGMENT.description}
                    </p>
                  </div>
                </div>
                {OTHER_AUGMENT_CHOICES.map((name) => (
                  <div key={name} className="rounded-lg border border-void-700 px-3 py-2.5">
                    <p className="text-sm text-mist-300">{name}</p>
                  </div>
                ))}
              </div>
            </Panel>

            <SkillOrder currentLevel={CHAMPION_LEVEL} />
          </div>
        </div>
      </div>

      <Companion
        reaction={reaction}
        onReactionEnd={() => setReaction(null)}
        noGoZones={noGoZones}
      />

      <div className="absolute bottom-4 right-4 z-40 rounded-xl2 border border-troll-500/40 bg-void-900/90 p-3 shadow-panel">
        <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-troll-400">
          <span className="h-1.5 w-1.5 rounded-full bg-troll-500" />
          Dev
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setReaction('kill')}
            className="rounded-lg border border-void-600 bg-void-800 px-3 py-1.5 text-xs font-medium text-mist-200 transition-colors hover:border-troll-500/50 hover:text-troll-400"
          >
            Trigger kill
          </button>
          <button
            type="button"
            onClick={() => setReaction('funny-number')}
            className="rounded-lg border border-void-600 bg-void-800 px-3 py-1.5 text-xs font-medium text-mist-200 transition-colors hover:border-gold-500/50 hover:text-gold-500"
          >
            Trigger funny number
          </button>
          <button
            type="button"
            onClick={openAugmentPopup}
            className="rounded-lg border border-void-600 bg-void-800 px-3 py-1.5 text-xs font-medium text-mist-200 transition-colors hover:border-wisp-500/50 hover:text-wisp-400"
          >
            Simulate augment pick
          </button>
        </div>
      </div>

      {popupChoices && (
        <AugmentSelectPopup
          choices={popupChoices}
          onSelect={selectAugment}
          onClose={() => setPopupChoices(null)}
        />
      )}
    </div>
  );
}
