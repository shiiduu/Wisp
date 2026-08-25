import { describe, expect, it } from 'vitest';
import { pickSkillPriority } from '../src/skillOrder';
import { makeChampion } from './fixtures';

describe('pickSkillPriority', () => {
  it('prioritizes the ability matching the tag scaling', () => {
    const champion = makeChampion({
      abilities: {
        passive: { name: 'p', description: '', scaling: ['none'] },
        Q: { id: 'Q', name: 'Q', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['none'] },
        W: { id: 'W', name: 'W', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['magic'] },
        E: { id: 'E', name: 'E', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['none'] },
        R: { id: 'R', name: 'R', description: '', maxRank: 3, cooldown: [], cost: [], scaling: ['none'] },
      },
    });
    expect(pickSkillPriority(champion, 'AP')[0]).toBe('W');
  });

  it('falls back to a generic order when the tag has no ability-scaling signal', () => {
    const champion = makeChampion();
    expect(pickSkillPriority(champion, 'AttackSpeed')).toEqual(['Q', 'E', 'W']);
  });

  it('falls back to a generic order when no ability matches the tag at all', () => {
    const champion = makeChampion({
      abilities: {
        passive: { name: 'p', description: '', scaling: ['none'] },
        Q: { id: 'Q', name: 'Q', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['magic'] },
        W: { id: 'W', name: 'W', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['magic'] },
        E: { id: 'E', name: 'E', description: '', maxRank: 5, cooldown: [], cost: [], scaling: ['magic'] },
        R: { id: 'R', name: 'R', description: '', maxRank: 3, cooldown: [], cost: [], scaling: ['magic'] },
      },
    });
    expect(pickSkillPriority(champion, 'Support')).toEqual(['Q', 'E', 'W']);
  });
});
