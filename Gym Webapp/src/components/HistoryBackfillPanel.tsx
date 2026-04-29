import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import {
  buildHistoricalSessionForDate,
  createHistorySessionDate,
  isLegacySampleSessionId,
  isImportedHistorySessionId,
  recomputeStatsFromSessions,
  stripImportedSessions,
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
  entries: {
    exerciseId: string;
    sets: number;
    reps: string;
    weight: string;
    notes: string;
    trainedMuscleGroups?: MuscleGroup[];
  }[];
};

import type { SavedPlan } from '../data/gymFlowStorage';
import { candidateMuscleGroupsForExercise } from '../utils/workoutLogDraft';

type Props = {
  allExercises: Exercise[];
  sessions: WorkoutSession[];
  savedPlans: SavedPlan[];
  onPersist: (patch: { sessions: WorkoutSession[]; stats: Record<string, ExerciseStat> }) => void;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function HistoryBackfillPanel({ allExercises, sessions, savedPlans, onPersist }: Props) {
  const [open, setOpen] = useState(false);
  const [dateYmd, setDateYmd] = useState(todayYmd);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selected, setSelected] = useState<Set<MuscleGroup>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setMessage(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const importedCount = useMemo(
    () => sessions.filter((s) => isLegacySampleSessionId(s.id) || isImportedHistorySessionId(s.id)).length,
    [sessions],
  );

  function toggleMuscle(g: MuscleGroup) {
    setSelectedPlanId('');
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
    setMessage(null);
  }

  function addSession() {
    setMessage(null);
    let session;
    let warn = '';

    if (selectedPlanId) {
      const plan = savedPlans.find((p) => p.id === selectedPlanId);
      if (!plan) return;
      session = {
        id: `h-plan-${Date.now()}`,
        date: createHistorySessionDate(dateYmd),
        groups: [...plan.muscleGroups],
        entries: plan.exerciseIds.map((id) => {
          const ex = allExercises.find((e) => e.id === id);
          const c = ex ? candidateMuscleGroupsForExercise(ex) : [];
          return {
            exerciseId: id,
            sets: 3,
            reps: '8-12',
            weight: '',
            notes: '',
            trainedMuscleGroups: c.length === 1 ? [c[0]] : [],
          };
        }),
      };
    } else {
      const groups = MUSCLE_GROUPS.filter((g) => selected.has(g));
      if (groups.length === 0) {
        setMessage('Select a plan or at least one muscle.');
        return;
      }
      const res = buildHistoricalSessionForDate(groups, dateYmd, allExercises);
      session = res.session;
      if (!session) {
        setMessage('Could not build session — check the date.');
        return;
      }
      if (res.missingGroups.length > 0) warn = ` No library move found for: ${res.missingGroups.join(', ')}.`;
    }

    const merged = [session, ...sessions];
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const stats = recomputeStatsFromSessions(merged);
    onPersist({ sessions: merged, stats });

    setMessage(`Saved workout for ${dateYmd} (${session.entries.length} moves).${warn}`);
    setSelected(new Set());
    setSelectedPlanId('');
  }

  function clearImported() {
    setMessage(null);
    const kept = stripImportedSessions(sessions);
    kept.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const stats = recomputeStatsFromSessions(kept);
    onPersist({ sessions: kept, stats });
    setMessage('Removed imported / sample history and recalculated stats.');
  }

  return (
    <>
      <div className="history-backfill-trigger">
        <button type="button" className="button button-muted" onClick={() => setOpen(true)}>
          Add workout…
        </button>
        {importedCount > 0 && (
          <span className="history-backfill-trigger-note">{importedCount} imported / sample session(s)</span>
        )}
      </div>

      {open ? createPortal(
        <div
          className="history-modal-overlay"
          role="presentation"
          onClick={() => {
            setOpen(false);
            setMessage(null);
          }}
        >
          <div
            className="history-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="history-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="history-modal-header">
              <h3 id="history-modal-title" className="history-modal-title">
                Add workout history
              </h3>
              <button
                type="button"
                className="history-modal-close"
                aria-label="Close"
                onClick={() => {
                  setOpen(false);
                  setMessage(null);
                }}
              >
                ×
              </button>
            </div>
            <p className="history-modal-intro">
              Pick the <strong>calendar date</strong> and every muscle you trained that day. We add one library move per
              muscle, chosen so <strong>secondary muscles stay inside your selection</strong> — e.g. Chest alone won&apos;t
              accidentally turn Core green.
            </p>

            <label className="history-modal-field">
              <span className="history-modal-label">Date</span>
              <input
                className="text-input"
                type="date"
                value={dateYmd}
                max={todayYmd()}
                onChange={(e) => setDateYmd(e.target.value)}
              />
            </label>

            <p className="history-modal-label" style={{ margin: '0.65rem 0 0.35rem' }}>
              Choose a saved plan
            </p>
            <select
              className="select-input"
              value={selectedPlanId}
              onChange={(e) => {
                setSelectedPlanId(e.target.value);
                if (e.target.value) setSelected(new Set());
              }}
              style={{ width: '100%', marginBottom: '0.85rem' }}
            >
              <option value="">-- Or select a plan --</option>
              {savedPlans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <p className="history-modal-label" style={{ margin: '0.65rem 0 0.35rem' }}>
              Or quick-pick muscles trained
            </p>
            <div className="history-modal-chips" role="group" aria-label="Muscles for this date">
              {MUSCLE_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`chip ${selected.has(g) && !selectedPlanId ? 'chip-active' : ''}`}
                  onClick={() => toggleMuscle(g)}
                >
                  {g}
                </button>
              ))}
            </div>

            <div className="history-modal-actions">
              <button type="button" className="button" onClick={addSession}>
                Save this day
              </button>
              <button type="button" className="button button-muted" onClick={clearImported} disabled={importedCount === 0}>
                Clear imported &amp; sample history
              </button>
            </div>

            {message && <p className="status-text history-modal-status">{message}</p>}
          </div>
        </div>,
        document.body
      ) : null}
    </>
  );
}
