import { InfoTooltip } from '@wisp/ui';
import { Panel } from './Panel';

type AbilityKey = 'Q' | 'W' | 'E' | 'R';

const ABILITY_MAX_LEVELS: Record<AbilityKey, number> = { Q: 5, W: 5, E: 5, R: 3 };
const ABILITY_ORDER: AbilityKey[] = ['Q', 'W', 'E', 'R'];

const ABILITY_DOT_CLASS: Record<AbilityKey, string> = {
  Q: 'bg-wisp-500 border-wisp-400 text-void-950',
  W: 'bg-mist-300 border-mist-200 text-void-950',
  E: 'bg-troll-500 border-troll-400 text-void-950',
  R: 'bg-gold-500 border-gold-500 text-void-950',
};

/**
 * Mock recommendation: E carries this build's scaling, so it's maxed
 * first; the ultimate follows the usual 6/11/16 cadence. Static priority
 * order for character levels 1-18 — not a real calculation yet.
 */
const MOCK_LEVEL_PRIORITY: AbilityKey[] = [
  'E', 'Q', 'E', 'W', 'E', 'R', 'E', 'E', 'Q', 'Q', 'R', 'Q', 'Q', 'W', 'W', 'R', 'W', 'W',
];

function computeSkillGrid(): Record<AbilityKey, (number | null)[]> {
  const grid: Record<AbilityKey, (number | null)[]> = {
    Q: Array(ABILITY_MAX_LEVELS.Q).fill(null),
    W: Array(ABILITY_MAX_LEVELS.W).fill(null),
    E: Array(ABILITY_MAX_LEVELS.E).fill(null),
    R: Array(ABILITY_MAX_LEVELS.R).fill(null),
  };
  const counters: Record<AbilityKey, number> = { Q: 0, W: 0, E: 0, R: 0 };

  MOCK_LEVEL_PRIORITY.forEach((ability, idx) => {
    const level = idx + 1;
    grid[ability][counters[ability]] = level;
    counters[ability] += 1;
  });

  return grid;
}

interface SkillOrderProps {
  /** Champion's current level — points beyond this are shown as "not yet reached". */
  currentLevel: number;
}

export function SkillOrder({ currentLevel }: SkillOrderProps) {
  const grid = computeSkillGrid();
  const firstPickAbility = MOCK_LEVEL_PRIORITY[0];

  return (
    <Panel
      title="Skill order"
      info={
        <InfoTooltip label="About skill order">
          This reflects which ability&apos;s scaling (AP or AD) matters most for the current
          build — leveling an off-scaling ability first isn&apos;t optimal.
        </InfoTooltip>
      }
    >
      <div className="space-y-2">
        {ABILITY_ORDER.map((ability) => (
          <div key={ability} className="flex items-center gap-2">
            <span className="w-4 shrink-0 font-display text-xs font-semibold text-mist-400">
              {ability}
            </span>
            <div className="flex gap-1.5">
              {grid[ability].map((level, cellIndex) => {
                const isFirstPick = ability === firstPickAbility && cellIndex === 0;
                const isReached = level !== null && level <= currentLevel;
                return (
                  <div
                    key={cellIndex}
                    className={`flex h-6 w-6 items-center justify-center rounded border text-[10px] font-semibold transition-colors ${
                      isReached
                        ? ABILITY_DOT_CLASS[ability]
                        : 'border-void-600 bg-void-800/60 text-mist-500'
                    } ${isFirstPick ? 'ring-2 ring-wisp-400 ring-offset-2 ring-offset-void-900' : ''}`}
                    title={level ? `Level ${level}` : undefined}
                  >
                    {isReached ? level : ''}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
