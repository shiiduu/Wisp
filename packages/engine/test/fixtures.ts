import type { Ability, Champion } from '@wisp/data/types';

function makeAbility(overrides: Partial<Ability> = {}): Ability {
  return {
    id: 'Test',
    name: 'Test',
    description: '',
    maxRank: 5,
    cooldown: [1, 1, 1, 1, 1],
    cost: [0, 0, 0, 0, 0],
    scaling: ['none'],
    ...overrides,
  };
}

export function makeChampion(overrides: Partial<Champion> = {}): Champion {
  return {
    id: 'Test',
    key: 1,
    name: 'Test Champion',
    title: 'the Fixture',
    tags: [],
    partype: 'Mana',
    info: { attack: 5, defense: 5, magic: 5, difficulty: 5 },
    stats: {
      hp: 600,
      hpperlevel: 90,
      mp: 300,
      mpperlevel: 40,
      armor: 30,
      armorperlevel: 4,
      spellblock: 30,
      spellblockperlevel: 2,
      attackdamage: 60,
      attackdamageperlevel: 3,
      attackspeed: 0.65,
      attackspeedperlevel: 2,
    },
    abilities: {
      passive: { name: 'Passive', description: '', scaling: ['none'] },
      Q: makeAbility({ id: 'Q' }),
      W: makeAbility({ id: 'W' }),
      E: makeAbility({ id: 'E' }),
      R: makeAbility({ id: 'R' }),
    },
    iconPath: '',
    ...overrides,
  };
}
