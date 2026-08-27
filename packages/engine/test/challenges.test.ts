import { describe, expect, it } from 'vitest';
import type { Challenge, ChallengesFile, Stat } from '@wisp/data/types';
import challengesData from '@wisp/data/challenges.json';
import { BUILD_TAGS } from '../src/types';

/**
 * Validator for the Stage-1 challenge skeleton. challenges.json is NOT yet
 * consumed by buildPlan/apps — this test is the only thing guarding its
 * shape, so keep it strict.
 */

const VALID_STATS: readonly Stat[] = [
  'AP',
  'AD',
  'HP',
  'Armor',
  'MR',
  'AttackSpeed',
  'Crit',
  'AbilityHaste',
  'Lethality',
  'ArmorPen',
  'MagicPen',
  'Mana',
  'MoveSpeed',
];
const VALID_DAMAGE_TYPES = ['AP', 'AD', 'mixed'];

const file = challengesData as ChallengesFile;
const challenges: Challenge[] = file.challenges;

describe('challenges.json — Stage 1 schema skeleton', () => {
  it('has a challenges array', () => {
    expect(Array.isArray(challenges)).toBe(true);
    expect(challenges.length).toBeGreaterThan(0);
  });

  it('covers every BuildTag exactly once via `direction`', () => {
    const directions = challenges.map((c) => c.direction).sort();
    expect(directions).toEqual([...BUILD_TAGS].sort());
    expect(new Set(directions).size).toBe(BUILD_TAGS.length);
  });

  it('has unique ids', () => {
    const ids = challenges.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const c of challenges) {
    describe(`challenge "${c.id}"`, () => {
      it('matches the Challenge shape', () => {
        expect(typeof c.id).toBe('string');
        expect(c.id.length).toBeGreaterThan(0);
        expect(typeof c.direction).toBe('string');
        expect(typeof c.itemStyle).toBe('string');
        expect(c.itemStyle.length).toBeGreaterThan(0);
        expect(VALID_DAMAGE_TYPES).toContain(c.damageType);
        expect(typeof c.subtitle).toBe('string');
        expect(c.subtitle.length).toBeGreaterThan(0);
      });

      it('has a non-empty primaryStatPriority of valid, non-duplicate stats', () => {
        expect(Array.isArray(c.primaryStatPriority)).toBe(true);
        expect(c.primaryStatPriority.length).toBeGreaterThan(0);
        for (const s of c.primaryStatPriority) expect(VALID_STATS).toContain(s);
        expect(new Set(c.primaryStatPriority).size).toBe(c.primaryStatPriority.length);
      });

      it('has a secondaryStatAllowance of valid stats with 0..1 weights, disjoint from primary', () => {
        const entries = Object.entries(c.secondaryStatAllowance);
        for (const [stat, weight] of entries) {
          expect(VALID_STATS).toContain(stat as Stat);
          expect(typeof weight).toBe('number');
          expect(weight).toBeGreaterThan(0);
          expect(weight).toBeLessThanOrEqual(1);
          expect(c.primaryStatPriority).not.toContain(stat as Stat);
        }
      });
    });
  }
});
