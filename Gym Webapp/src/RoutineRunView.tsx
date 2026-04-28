import { useCallback, useEffect, useMemo, useState } from 'react';
import { EXERCISE_LIBRARY } from './data/exerciseLibrary';
import type { Exercise } from './data/exerciseLibrary';
import {
  loadPersistedGymData,
  savePersistedGymData,
  type PersistedGymData,
} from './data/gymFlowStorage';
import { resolvePlanExerciseIdsToCatalog, STORAGE_V2 } from './data/migrateStorage';
import { MuscleTargetPick } from './components/MuscleTargetPick';
import { ExerciseYoutubeLink } from './components/ExerciseYoutubeLink';
import { getExerciseImageMap, type ExerciseImageMeta } from './services/exerciseImages';
import { commitWorkoutSession } from './utils/commitWorkoutSession';
import { isLikelyDuplicateWorkoutSave } from './utils/recentDuplicateSave';
import { getRecentLogsForExercise } from './utils/sessionExerciseHistory';
import { getEffectiveCategory } from './utils/catalogSort';
import {
  candidateMuscleGroupsForExercise,
  getDefaultDraft,
  getDefaultDraftForExercise,
  type ExerciseLogDraft,
} from './utils/workoutLogDraft';
import { buildPresetPlans } from './data/presetPlans';

type Props = { planId: string };

function formatShortDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RoutineRunView({ planId }: Props) {
  const [data, setData] = useState<PersistedGymData>(() => loadPersistedGymData());
  const [images, setImages] = useState<Record<string, ExerciseImageMeta>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseLogDraft>>({});
  const [saveMessage, setSaveMessage] = useState('');

  const allExercises = useMemo(
    () => [...EXERCISE_LIBRARY, ...data.customExercises],
    [data.customExercises],
  );

  const exerciseById = useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);
  const allPresets = useMemo(() => buildPresetPlans(allExercises).flatMap(g => g.plans), [allExercises]);

  const plan = data.savedPlans.find((p) => p.id === planId) || allPresets.find((p) => p.id === planId);

  const exercises = useMemo((): Exercise[] => {
    if (!plan) return [];
    const ids = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
    const map = new Map(allExercises.map((e) => [e.id, e]));
    return ids.map((id) => map.get(id)).filter((e): e is Exercise => !!e);
  }, [plan, allExercises]);

  const exerciseIdsKey = exercises.map((e) => e.id).join(',');

  const persist = useCallback((next: PersistedGymData) => {
    setData(next);
    savePersistedGymData(next);
  }, []);

  /** Add defaults for new ids only; keep in-progress drafts when the routine list changes slightly. */
  useEffect(() => {
    if (exercises.length === 0) return;
    const fresh = loadPersistedGymData();
    setExerciseDrafts((prev) => {
      const next = { ...prev };
      const keep = new Set(exercises.map((e) => e.id));
      for (const id of Object.keys(next)) {
        if (!keep.has(id)) delete next[id];
      }
      for (const ex of exercises) {
        if (next[ex.id]) continue;
        const d = getDefaultDraftForExercise(ex);
        const hist = getRecentLogsForExercise(fresh.sessions, ex.id, 1)[0];
        if (hist) {
          if (hist.weight.trim()) d.weight = hist.weight;
          if (hist.reps.trim()) d.reps = hist.reps;
          d.sets = hist.sets >= 1 ? hist.sets : d.sets;
          if (hist.trainedMuscleGroups?.length) d.trainedMuscleGroups = [...hist.trainedMuscleGroups];
        }
        next[ex.id] = d;
      }
      return next;
    });
    setSaveMessage('');
  }, [exerciseIdsKey]);

  useEffect(() => {
    if (plan) document.title = `${plan.name} · Gym Flow`;
  }, [plan]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_V2 && e.newValue) {
        try {
          setData(JSON.parse(e.newValue) as PersistedGymData);
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (exercises.length === 0) return;
    getExerciseImageMap(exercises)
      .then((result) => {
        if (!cancelled) setImages(result);
      })
      .catch(() => {
        if (!cancelled) setImages({});
      });
    return () => {
      cancelled = true;
    };
  }, [exercises]);

  function updateDraft(exerciseId: string, patch: Partial<ExerciseLogDraft>) {
    setExerciseDrafts((current) => {
      const ex = exerciseById.get(exerciseId);
      const merged: ExerciseLogDraft = {
        ...getDefaultDraft(),
        ...getDefaultDraftForExercise(ex),
        ...current[exerciseId],
        ...patch,
      };
      if (ex) {
        const c = candidateMuscleGroupsForExercise(ex);
        let t = merged.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
        if (c.length === 1 && t.length === 0) t = [...c];
        merged.trainedMuscleGroups = t;
      }
      return { ...current, [exerciseId]: merged };
    });
  }

  function handleSaveWorkout() {
    if (!plan) return;
    const orderIds = exercises.map((e) => e.id);
    const includedIds = orderIds.filter((id) => exerciseDrafts[id]?.completed);
    if (includedIds.length === 0) {
      setSaveMessage('Check "Done" for at least one move.');
      return;
    }
    
    for (const id of includedIds) {
      if (!exerciseDrafts[id]?.trainedMuscleGroups?.length) {
        setSaveMessage(`Select muscles for "${exerciseById.get(id)?.name}".`);
        return;
      }
    }
    if (
      includedIds.length > 0 &&
      isLikelyDuplicateWorkoutSave(data.sessions, includedIds) &&
      !window.confirm(
        'This matches a workout you saved a few minutes ago (same moves). Save again anyway?',
      )
    ) {
      return;
    }
    const result = commitWorkoutSession({
      data,
      exerciseOrderIds: orderIds,
      exerciseDrafts,
      exerciseById,
    });
    if (!result.ok) {
      setSaveMessage(result.error);
      return;
    }
    persist(result.nextData);
    setSaveMessage(
      `Saved ${result.completedCount} move${result.completedCount === 1 ? '' : 's'}. History below will update.`,
    );
    const fresh = result.nextData;
    setExerciseDrafts((prev) => {
      const next: Record<string, ExerciseLogDraft> = { ...prev };
      for (const ex of exercises) {
        const d = getDefaultDraftForExercise(ex);
        const hist = getRecentLogsForExercise(fresh.sessions, ex.id, 1)[0];
        if (hist) {
          if (hist.weight.trim()) d.weight = hist.weight;
          if (hist.reps.trim()) d.reps = hist.reps;
          d.sets = hist.sets >= 1 ? hist.sets : d.sets;
          if (hist.trainedMuscleGroups?.length) d.trainedMuscleGroups = [...hist.trainedMuscleGroups];
        }
        next[ex.id] = d;
      }
      return next;
    });
  }

  const plannerHref = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;

  if (!plan) {
    return (
      <div className="routine-run routine-run--error">
        <p className="routine-run-lead">This routine was not found. It may have been deleted.</p>
        <a className="button" href={plannerHref}>
          Open planner
        </a>
      </div>
    );
  }

  if (exercises.length === 0) {
    return (
      <div className="routine-run routine-run--error">
        <p className="routine-run-lead">
          No moves in this routine match your library anymore. Edit the routine in the planner.
        </p>
        <a className="button" href={plannerHref}>
          Open planner
        </a>
      </div>
    );
  }

  return (
    <div className="routine-run">
      <header className="routine-run-header">
        <div>
          <h1 className="routine-run-title">{plan.name}</h1>
          <p className="routine-run-sub">
            Check <strong>Include when I save</strong> for each move you perform, then enter sets / weight. Everything saves to
            the same history and body map as the Plan tab. Leave moves unchecked if you skip them.
          </p>
        </div>
        <a className="button button-muted routine-run-planner-link" href={plannerHref}>
          Open full planner
        </a>
      </header>

      {saveMessage ? (
        <div className="routine-run-banner" role="status">
          {saveMessage}
        </div>
      ) : null}

      <ol className="routine-run-list">
        {exercises.map((ex, index) => {
          const draft = exerciseDrafts[ex.id];
          const isCardio = getEffectiveCategory(ex) === 'cardio';
          const stat = data.stats[ex.id];
          const history = getRecentLogsForExercise(data.sessions, ex.id, 5);

          return (
            <li key={ex.id} className="routine-run-card">
              <div className="routine-run-card-head">
                <span className="routine-run-num">{index + 1}</span>
                <h2 className="routine-run-move-title">
                  <ExerciseYoutubeLink exerciseName={ex.name} className="exercise-youtube exercise-youtube--title">
                    {ex.name}
                  </ExerciseYoutubeLink>
                </h2>
              </div>
              <div className="routine-run-media">
                {images[ex.name] ? (
                  <img
                    src={images[ex.name].url}
                    alt={`${ex.name} demo`}
                    className="routine-run-image"
                    loading={index < 3 ? 'eager' : 'lazy'}
                  />
                ) : (
                  <div className="routine-run-image-fallback">{ex.primaryGroup}</div>
                )}
              </div>
              <p className="routine-run-meta">
                {ex.primaryGroup}
                {ex.secondaryGroups?.length ? ` · ${ex.secondaryGroups.join(', ')}` : ''}
              </p>
              {images[ex.name]?.credit ? <p className="image-credit">{images[ex.name].credit}</p> : null}

              <div className="routine-run-stat-line">
                Logged <strong>{stat?.timesCompleted ?? 0}</strong>× · Last: {formatShortDate(stat?.lastPerformed ?? null)}
              </div>

              {history.length > 0 ? (
                <div className="routine-run-history">
                  <span className="routine-run-history-label">Recent logs</span>
                  <ul className="routine-run-history-list">
                    {history.map((row, hi) => (
                      <li key={`${row.dateIso}-${hi}`}>
                        <span className="routine-run-history-date">{row.dateLabel}</span>
                        <span className="routine-run-history-detail">
                          {row.sets}×{row.reps || '—'}
                          {row.weight ? ` · ${row.weight}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="routine-run-history-empty">No history yet for this move.</p>
              )}

              <label
                className="routine-run-count-toggle checkbox"
                title="Only checked moves are written when you tap Save workout"
              >
                <input
                  type="checkbox"
                  checked={draft?.completed ?? false}
                  onChange={(e) => updateDraft(ex.id, { completed: e.target.checked })}
                />
                Include when I save
              </label>

              <MuscleTargetPick exercise={ex} draft={draft} onPatch={(patch) => updateDraft(ex.id, patch)} />

              <div className="routine-run-log-grid">
                {isCardio ? (
                  <label className="routine-run-log-field routine-run-log-field--full">
                    Minutes
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 20"
                      value={draft?.reps ?? '20'}
                      onChange={(e) => updateDraft(ex.id, { reps: e.target.value, sets: 1 })}
                    />
                  </label>
                ) : (
                  <>
                    <label className="routine-run-log-field">
                      Sets
                      <input
                        type="number"
                        min={1}
                        value={draft?.sets ?? 3}
                        onChange={(e) => updateDraft(ex.id, { sets: e.target.value === '' ? '' : Number(e.target.value) })}
                      />
                    </label>
                    <label className="routine-run-log-field">
                      Reps
                      <input
                        type="text"
                        value={draft?.reps ?? '8-12'}
                        onChange={(e) => updateDraft(ex.id, { reps: e.target.value })}
                      />
                    </label>
                    <label className="routine-run-log-field routine-run-log-field--wide">
                      Weight (today)
                      <input
                        type="text"
                        placeholder="e.g. 60kg"
                        value={draft?.weight ?? ''}
                        onChange={(e) => updateDraft(ex.id, { weight: e.target.value })}
                      />
                    </label>
                  </>
                )}
                <label className="routine-run-log-field routine-run-log-field--full">
                  Notes
                  <input
                    type="text"
                    placeholder="tempo, machine #…"
                    value={draft?.notes ?? ''}
                    onChange={(e) => updateDraft(ex.id, { notes: e.target.value })}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ol>

      <section className="routine-run-sticky-save" aria-label="Save workout">
        <div className="routine-run-sticky-copy">
          <strong>{plan.name}</strong>
          <span>Saves to Activity &amp; body map like the planner</span>
        </div>
        <button type="button" className="button" onClick={handleSaveWorkout}>
          Save workout
        </button>
      </section>
    </div>
  );
}
