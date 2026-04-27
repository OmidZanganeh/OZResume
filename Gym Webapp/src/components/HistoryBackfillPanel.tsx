import { useMemo, useState } from 'react';
import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import {
  type SeedTier,
  SEED_SESSION_ID_PREFIX,
  buildSeedSessionsFromTiers,
  recomputeStatsFromSessions,
  stripSeedSessions,
} from '../utils/historySeed';

type ExerciseStat = {
  timesCompleted: number;
  totalSets: number;
  lastPerformed: string | null;
};

type WorkoutSession = {
  id: string;
  date: string;
  groups: MuscleGroup[];
  entries: { exerciseId: string; sets: number; reps: string; weight: string; notes: string }[];
};

type Props = {
  practiceWindowDays: number;
  allExercises: Exercise[];
  sessions: WorkoutSession[];
  onPersist: (patch: { sessions: WorkoutSession[]; stats: Record<string, ExerciseStat> }) => void;
};

const TIER_OPTIONS: { value: SeedTier; label: string; hint: string }[] = [
  { value: 0, label: 'None', hint: 'Gray on map' },
  { value: 1, label: 'Once', hint: 'Orange' },
  { value: 2, label: 'Twice+', hint: 'Green' },
];

function tiersRecord(initial: SeedTier): Record<MuscleGroup, SeedTier> {
  return Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, initial])) as Record<MuscleGroup, SeedTier>;
}

export function HistoryBackfillPanel({ practiceWindowDays, allExercises, sessions, onPersist }: Props) {
  const [tiers, setTiers] = useState<Record<MuscleGroup, SeedTier>>(() => tiersRecord(0));
  const [message, setMessage] = useState<string | null>(null);

  const hasAnyTier = useMemo(() => MUSCLE_GROUPS.some((g) => (tiers[g] ?? 0) > 0), [tiers]);
  const seedCount = useMemo(() => sessions.filter((s) => s.id.startsWith(SEED_SESSION_ID_PREFIX)).length, [sessions]);

  function setTier(group: MuscleGroup, value: SeedTier) {
    setTiers((prev) => ({ ...prev, [group]: value }));
    setMessage(null);
  }

  function applySeed() {
    setMessage(null);
    const withoutSeeds = stripSeedSessions(sessions);
    const { sessions: newSeeds, missingGroups } = buildSeedSessionsFromTiers(tiers, allExercises);

    if (newSeeds.length === 0) {
      setMessage('Choose at least one muscle with Once or Twice+.');
      return;
    }

    const merged = [...withoutSeeds, ...newSeeds];
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const stats = recomputeStatsFromSessions(merged);

    onPersist({ sessions: merged, stats });

    const extra =
      missingGroups.length > 0
        ? ` Could not find a library move for: ${missingGroups.join(', ')}.`
        : '';
    setMessage(`Added ${newSeeds.length} sample day(s) across the last ${practiceWindowDays} days.${extra}`);
  }

  function clearSeed() {
    setMessage(null);
    const withoutSeeds = stripSeedSessions(sessions);
    withoutSeeds.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const stats = recomputeStatsFromSessions(withoutSeeds);
    onPersist({ sessions: withoutSeeds, stats });
    setTiers(tiersRecord(0));
    setMessage('Removed sample history and recalculated stats from your real sessions.');
  }

  return (
    <div className="history-backfill">
      <h3 className="history-backfill-title">Body map history (last {practiceWindowDays} days)</h3>
      <p className="history-backfill-intro">
        New here? Roughly how often did you train each area recently — we&apos;ll add <strong>sample log days</strong> so the
        map matches (orange / green). Your real workouts stay separate. Replacing this only updates rows marked as sample
        history.
      </p>

      <div className="history-backfill-grid" role="group" aria-label="Training frequency per muscle">
        {MUSCLE_GROUPS.map((group) => (
          <div key={group} className="history-backfill-row">
            <span className="history-backfill-muscle">{group}</span>
            <div className="history-backfill-tiers">
              {TIER_OPTIONS.map((opt) => (
                <label key={opt.value} className="history-backfill-radio">
                  <input
                    type="radio"
                    name={`tier-${group}`}
                    checked={(tiers[group] ?? 0) === opt.value}
                    onChange={() => setTier(group, opt.value)}
                  />
                  <span>
                    {opt.label}
                    <small>{opt.hint}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="history-backfill-actions">
        <button type="button" className="button" onClick={applySeed} disabled={!hasAnyTier}>
          Apply sample history
        </button>
        <button type="button" className="button button-muted" onClick={clearSeed} disabled={seedCount === 0}>
          Clear sample history
        </button>
      </div>

      {message && <p className="status-text history-backfill-status">{message}</p>}
    </div>
  );
}
