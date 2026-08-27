import type { Item } from '@wisp/data/types';

/**
 * The "archetype" layer (6-stage architecture, Stage 3). This is a SECOND,
 * finer axis on top of the 8 coarse BuildTags — a BuildTag is the
 * direction ("AP"), an ItemStyle is the sub-shape within it ("dot-caster"
 * vs "burst-caster" vs "ap-bruiser"). BuildTags are unchanged.
 *
 * NOT wired into recommendItemsForTag's default path, apps/*, or
 * challenges.json yet — see recommendation.ts for the opt-in scoring hook.
 */

/** Finer item/build sub-archetype. Vocabulary from the 6-stage analysis. */
export type ItemStyle =
  | 'burst-caster'
  | 'dot-caster'
  | 'artillery-caster'
  | 'ap-bruiser'
  | 'on-hit'
  | 'crit-marksman'
  | 'lethality'
  | 'ad-caster'
  | 'bruiser'
  | 'juggernaut'
  | 'warden-tank'
  | 'aura-tank'
  | 'enchanter';

export const ITEM_STYLES: readonly ItemStyle[] = [
  'burst-caster',
  'dot-caster',
  'artillery-caster',
  'ap-bruiser',
  'on-hit',
  'crit-marksman',
  'lethality',
  'ad-caster',
  'bruiser',
  'juggernaut',
  'warden-tank',
  'aura-tank',
  'enchanter',
] as const;

/**
 * "Pure-scaling" / stat-stick items: their value is multiplicative on stats
 * you already have (% total AP, % magic/armor penetration) rather than a
 * flat power block you can rush. They are late-game amplifiers, never a
 * coherent first/second buy or a build's identity item.
 *
 * Verified against packages/data/items.json (patch 16.17.1), all completed,
 * all ARAM-legal:
 *   3089  Rabadon's Deathcap     — +30% total Ability Power
 *   3135  Void Staff             — 40% magic penetration (multiplicative vs MR)
 *   3137  Cryptbloom             — % magic penetration + takedown heal
 *   3036  Lord Dominik's Regards — % armor penetration (anti-tank late pickup)
 *   6694  Serylda's Grudge       — % armor penetration (haste/lethality-flavoured)
 *   3033  Mortal Reminder        — % armor penetration + grievous wounds
 *
 * Same "small hand-curated id list supplementing data signals" pattern as
 * EXPLICIT_SUPPORT_ITEM_IDS in recommendation.ts. FRAGILE POINT: re-verify
 * these ids/names against the current items.json whenever items shift
 * between patches or data-source migrations.
 */
export const PURE_SCALING_ITEM_IDS = new Set<number>([3089, 3135, 3137, 3036, 6694, 3033]);

export function isPureScalingItem(item: Item): boolean {
  return PURE_SCALING_ITEM_IDS.has(item.id);
}

/**
 * Per-item ItemStyle tags for the current ARAM-legal COMPLETED item pool
 * (packages/data/items.json, patch 16.17.1 — ~107 items). Pure-scaling
 * items (above) are intentionally absent; Stage 5 owns them.
 *
 * Seeded by `packages/data/scripts/tag-item-archetypes.ts` (tags +
 * description keyword scan) then hand-reviewed. An item may carry more
 * than one style when it genuinely spans them (e.g. Riftmaker =
 * dot-caster + ap-bruiser). Items with no meaningful style (raw stat
 * sticks, niche actives) are simply omitted — a lookup returns [].
 *
 * FRAGILE POINT: re-verify against items.json on any patch / data-source
 * change; re-run the seed script and re-review rather than editing blind.
 */
export const ITEM_ARCHETYPE_TAGS: Record<number, ItemStyle[]> = {
  // --- AP casters -------------------------------------------------------
  2522: ['burst-caster'], // Actualizer
  3003: ['burst-caster'], // Archangel's Staff
  2503: ['dot-caster', 'burst-caster'], // Blackfire Torch
  3118: ['dot-caster', 'burst-caster'], // Malignance
  6655: ['burst-caster'], // Luden's Echo
  3157: ['burst-caster'], // Zhonya's Hourglass
  3102: ['burst-caster'], // Banshee's Veil
  3152: ['burst-caster', 'ap-bruiser'], // Hextech Rocketbelt
  3146: ['burst-caster'], // Hextech Gunblade (hybrid AD/AP)
  4628: ['artillery-caster', 'burst-caster'], // Horizon Focus
  6653: ['dot-caster', 'ap-bruiser'], // Liandry's Torment
  4633: ['dot-caster', 'ap-bruiser'], // Riftmaker
  4629: ['ap-bruiser'], // Cosmic Drive
  6657: ['ap-bruiser'], // Rod of Ages
  3116: ['dot-caster', 'ap-bruiser'], // Rylai's Crystal Scepter
  3165: ['dot-caster', 'ap-bruiser'], // Morellonomicon
  8010: ['dot-caster', 'ap-bruiser'], // Bloodletter's Curse
  4645: ['burst-caster'], // Shadowflame
  4646: ['burst-caster'], // Stormsurge
  3100: ['burst-caster', 'on-hit'], // Lich Bane
  3115: ['on-hit', 'burst-caster'], // Nashor's Tooth
  2510: ['on-hit', 'ap-bruiser'], // Dusk and Dawn (ARAM hybrid AP/on-hit)
  1056: ['burst-caster'], // Doran's Ring (lane)
  3112: ['burst-caster'], // Guardian's Orb (lane)
  // --- enchanters -----------------------------------------------------
  3504: ['enchanter'], // Ardent Censer
  6621: ['enchanter'], // Dawncore
  6620: ['enchanter', 'ap-bruiser'], // Echoes of Helia
  4005: ['enchanter'], // Imperial Mandate
  3222: ['enchanter'], // Mikael's Blessing
  6617: ['enchanter'], // Moonstone Renewer
  3107: ['enchanter'], // Redemption
  2065: ['enchanter'], // Shurelya's Battlesong
  6616: ['enchanter'], // Staff of Flowing Water
  // --- crit / marksman ----------------------------------------------
  3031: ['crit-marksman'], // Infinity Edge
  6673: ['crit-marksman'], // Immortal Shieldbow
  2523: ['crit-marksman'], // Hexoptics C44
  2512: ['crit-marksman'], // Fiendhunter Bolts
  3046: ['crit-marksman'], // Phantom Dancer
  3094: ['crit-marksman'], // Rapid Firecannon
  6675: ['crit-marksman'], // Navori Flickerblade
  3085: ['crit-marksman', 'on-hit'], // Runaan's Hurricane
  3095: ['crit-marksman'], // Stormrazor
  3032: ['crit-marksman'], // Yun Tal Wildarrows
  3039: ['crit-marksman', 'bruiser'], // Atma's Reckoning
  3508: ['crit-marksman', 'ad-caster'], // Essence Reaver
  6676: ['crit-marksman', 'lethality'], // The Collector
  1086: ['on-hit', 'crit-marksman'], // Doran's Bow (lane)
  3072: ['bruiser', 'crit-marksman'], // Bloodthirster
  // --- on-hit -------------------------------------------------------
  3124: ['on-hit'], // Guinsoo's Rageblade
  3153: ['on-hit'], // Blade of The Ruined King
  6672: ['on-hit'], // Kraken Slayer
  3091: ['on-hit'], // Wit's End
  3302: ['on-hit'], // Terminus
  3087: ['on-hit', 'crit-marksman'], // Statikk Shiv
  3074: ['on-hit', 'bruiser'], // Ravenous Hydra
  3004: ['ad-caster', 'on-hit'], // Manamune
  // --- lethality --------------------------------------------------
  3142: ['lethality'], // Youmuu's Ghostblade
  3814: ['lethality'], // Edge of Night
  6695: ['lethality'], // Serpent's Fang
  3179: ['lethality'], // Umbral Glaive
  6696: ['lethality'], // Axiom Arc
  6698: ['lethality'], // Profane Hydra
  6699: ['lethality'], // Voltaic Cyclosword
  4004: ['lethality'], // Spectral Cutlass
  // --- AD-caster / bruiser --------------------------------------
  3078: ['on-hit', 'ad-caster', 'bruiser'], // Trinity Force
  3161: ['ad-caster', 'bruiser'], // Spear of Shojin
  6692: ['ad-caster', 'bruiser'], // Eclipse
  6333: ['ad-caster', 'bruiser'], // Death's Dance
  3071: ['bruiser', 'ad-caster'], // Black Cleaver
  3053: ['bruiser', 'juggernaut'], // Sterak's Gage
  6631: ['bruiser'], // Stridebreaker
  6610: ['bruiser'], // Sundered Sky
  6609: ['bruiser'], // Chempunk Chainsword
  3073: ['bruiser'], // Experimental Hexplate
  3181: ['bruiser', 'juggernaut'], // Hullbreaker
  2501: ['juggernaut', 'bruiser'], // Overlord's Bloodmail
  3084: ['juggernaut', 'warden-tank'], // Heartsteel
  3748: ['juggernaut', 'bruiser', 'on-hit'], // Titanic Hydra
  3156: ['bruiser', 'ad-caster'], // Maw of Malmortius
  3139: ['bruiser'], // Mercurial Scimitar
  2517: ['bruiser'], // Endless Hunger
  1055: ['bruiser'], // Doran's Blade (lane)
  3184: ['bruiser'], // Guardian's Hammer (lane)
  3177: ['bruiser'], // Guardian's Blade (lane)
  // --- tanks -----------------------------------------------------
  6665: ['warden-tank'], // Jak'Sho, The Protean
  3075: ['warden-tank'], // Thornmail
  3143: ['warden-tank', 'aura-tank'], // Randuin's Omen
  2504: ['warden-tank'], // Kaenic Rookern
  3065: ['warden-tank'], // Spirit Visage
  4401: ['warden-tank'], // Force of Nature
  3083: ['warden-tank'], // Warmog's Armor
  3742: ['warden-tank'], // Dead Man's Plate
  3110: ['warden-tank', 'aura-tank'], // Frozen Heart
  2502: ['warden-tank'], // Unending Despair
  3068: ['warden-tank', 'aura-tank'], // Sunfire Aegis
  6664: ['warden-tank', 'aura-tank'], // Hollow Radiance
  8020: ['warden-tank', 'aura-tank'], // Abyssal Mask
  6662: ['warden-tank', 'on-hit'], // Iceborn Gauntlet
  3119: ['warden-tank'], // Winter's Approach
  2525: ['warden-tank'], // Protoplasm Harness
  1120: ['warden-tank'], // Doran's Helm (lane)
  1054: ['warden-tank'], // Doran's Shield (lane)
  2051: ['warden-tank'], // Guardian's Horn (lane)
  // --- aura / warden hybrids (support-itemization, see recommendation.ts) ---
  3190: ['aura-tank', 'enchanter'], // Locket of the Iron Solari
  3109: ['aura-tank', 'enchanter'], // Knight's Vow
  3050: ['aura-tank', 'enchanter'], // Zeke's Convergence
  2524: ['aura-tank', 'enchanter'], // Bandlepipes
};

/** ItemStyle tags for an item — [] if it carries no meaningful style. */
export function itemStylesOf(item: Item): ItemStyle[] {
  return ITEM_ARCHETYPE_TAGS[item.id] ?? [];
}

/** Does this item match the given ItemStyle? */
export function itemMatchesStyle(item: Item, style: ItemStyle): boolean {
  return itemStylesOf(item).includes(style);
}
