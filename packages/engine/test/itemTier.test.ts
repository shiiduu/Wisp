import { describe, expect, it } from 'vitest';
import type { Item } from '@wisp/data/types';
import { classifyItemTier } from '../src/itemTier';

function makeItem(overrides: Partial<Item>): Item {
  return {
    id: 1,
    name: 'Test Item',
    description: '',
    price: 1000,
    iconPath: '',
    isCompleted: true,
    tags: [],
    ...overrides,
  };
}

describe('classifyItemTier', () => {
  it('classifies consumables', () => {
    expect(classifyItemTier(makeItem({ tags: ['Consumable'] }))).toBe('consumable');
  });

  it('classifies boots', () => {
    expect(classifyItemTier(makeItem({ tags: ['Boots'], into: [1] }))).toBe('boots');
  });

  it('classifies a basic component with no prerequisites as starter', () => {
    expect(classifyItemTier(makeItem({ tags: ['SpellDamage'], depth: 1, into: [2] }))).toBe('starter');
  });

  it('classifies an item that still has an upgrade as component', () => {
    expect(
      classifyItemTier(makeItem({ tags: ['SpellDamage'], from: [1], depth: 2, into: [3] })),
    ).toBe('component');
  });

  it('classifies a completed, expensive item as core', () => {
    expect(
      classifyItemTier(makeItem({ tags: ['SpellDamage'], from: [1], depth: 2, price: 3500 })),
    ).toBe('core');
  });

  it('classifies a completed penetration item as penetration over core', () => {
    expect(
      classifyItemTier(
        makeItem({ tags: ['Lethality', 'Damage'], from: [1], depth: 3, price: 3200 }),
      ),
    ).toBe('penetration');
  });

  it('classifies a completed cheap item as situational', () => {
    expect(
      classifyItemTier(makeItem({ tags: ['Aura'], from: [1], depth: 2, price: 1500 })),
    ).toBe('situational');
  });
});
