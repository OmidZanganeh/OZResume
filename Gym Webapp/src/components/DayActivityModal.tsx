import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import type { SavedPlan } from '../data/gymFlowStorage';
import {
  buildHistoricalSessionForDate,
  createHistorySessionDate,
  recomputeStatsFromSessions,
} from '../utils/historySeed';
import { candidateMuscleGroupsForExercise } from '../utils/workoutLogDraft';
import { MUSCLE_GROUP_CALENDAR_COLOR } from './calendarMuscleColors';

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

type Props = {
  dateKey: string;
  sessions: WorkoutSession[];
  allExercises: Exercise[];
  savedPlans: SavedPlan[];
  onClose: () => void;
  onPersist: (patch: { sessions: WorkoutSession[]; stats: Record<string, ExerciseStat> }) => void;
};

export function DayActivityModal({ dateKey, sessions, allExercises, savedPlans, onClose, onPersist }: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedMuscles, setSelectedMuscles] = useState<Set<MuscleGroup>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Find sessions for this date
  const daySessions = useMemo(() => {
    return sessions.filter((s) => {
      const d = new Date(s.date);
      if (Number.isNaN(d.getTime())) return s.date.startsWith(dateKey);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}` === dateKey;
    });
  }, [sessions, dateKey]);

  function toggleMuscle(g: MuscleGroup) {
    setSelectedPlanId('');
    setSelectedMuscles((prev) => {
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
        date: createHistorySessionDate(dateKey),
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
      const groups = MUSCLE_GROUPS.filter((g) => selectedMuscles.has(g));
      if (groups.length === 0) {
        setMessage('Select a plan or at least one muscle.');
        return;
      }
      const res = buildHistoricalSessionForDate(groups, dateKey, allExercises);
      session = res.session;
      if (!session) {
        setMessage('Could not build session.');
        return;
      }
      if (res.missingGroups.length > 0) warn = ` No library move found for: ${res.missingGroups.join(', ')}.`;
    }

    const merged = [session, ...sessions];
    merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const stats = recomputeStatsFromSessions(merged);
    onPersist({ sessions: merged, stats });

    setMessage(`Saved workout (${session.entries.length} moves).${warn}`);
    setSelectedMuscles(new Set());
    setSelectedPlanId('');
  }

  function deleteSession(id: string) {
    if (!window.confirm('Delete this workout session?')) return;
    const kept = sessions.filter(s => s.id !== id);
    const stats = recomputeStatsFromSessions(kept);
    onPersist({ sessions: kept, stats });
    setMessage('Workout deleted.');
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateKey + 'T12:00:00'));

  const content = (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content day-modal-content">
        <header className="modal-header">
          <h2 className="modal-title">{dateLabel}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </header>

        <div className="modal-body">
          {message && <div className="flash-message">{message}</div>}

          <div className="day-modal-section">
            <h3 className="panel-heading panel-heading--plain" style={{ marginBottom: '1rem' }}>Logged Workouts</h3>
            {daySessions.length === 0 ? (
              <p className="panel-subtle">No workouts logged on this day.</p>
            ) : (
              <div className="day-modal-sessions">
                {daySessions.map(s => (
                  <div key={s.id} className="day-modal-session-card">
                    <div className="day-modal-session-info">
                      <div className="day-modal-session-groups">
                        {s.groups.length > 0 ? s.groups.map(g => (
                          <span key={g} className="chip" style={{ borderColor: MUSCLE_GROUP_CALENDAR_COLOR[g], color: MUSCLE_GROUP_CALENDAR_COLOR[g] }}>
                            {g}
                          </span>
                        )) : <span className="chip">Mixed</span>}
                      </div>
                      <div className="day-modal-session-meta">
                        {s.entries.length} exercise{s.entries.length === 1 ? '' : 's'}
                      </div>
                    </div>
                    <button type="button" className="button button-danger button--small" onClick={() => deleteSession(s.id)}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="day-modal-section" style={{ marginTop: '2rem' }}>
            <h3 className="panel-heading panel-heading--plain" style={{ marginBottom: '1rem' }}>Add Workout to this Day</h3>
            <div className="form-group">
              <label className="form-label">From Saved Plan</label>
              <select
                className="input"
                value={selectedPlanId}
                onChange={(e) => {
                  setSelectedPlanId(e.target.value);
                  setSelectedMuscles(new Set());
                  setMessage(null);
                }}
              >
                <option value="">-- Choose a plan --</option>
                {savedPlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.muscleGroups.join(', ') || 'Mixed'})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label">Or Pick Muscle Groups (auto-generates exercises)</label>
              <div className="chip-list">
                {MUSCLE_GROUPS.filter((g) => g !== 'Cardio' && g !== 'Mobility').map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`chip ${selectedMuscles.has(g) ? 'chip-active' : ''}`}
                    onClick={() => toggleMuscle(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
               <button
                  type="button"
                  className="button button-primary"
                  disabled={!selectedPlanId && selectedMuscles.size === 0}
                  onClick={addSession}
                >
                  + Add to Day
                </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
