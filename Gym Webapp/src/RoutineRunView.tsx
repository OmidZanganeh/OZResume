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
import { getAlternativeExercises } from './utils/exerciseAlternatives';

type Props = { planId: string };

const AUTO_ADVANCE_KEY = 'gf-routine-auto-advance';

function readAutoAdvancePref(): boolean {
  try {
    const v = localStorage.getItem(AUTO_ADVANCE_KEY);
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

function formatShortDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RoutineRunView({ planId }: Props) {
  const [data, setData] = useState<PersistedGymData>(() => loadPersistedGymData());
  const [images, setImages] = useState<Record<string, ExerciseImageMeta>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseLogDraft>>({});
  const [saveMessage, setSaveMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [autoAdvanceOnInclude, setAutoAdvanceOnInclude] = useState(readAutoAdvancePref);

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
    setCurrentIndex(0);
  }, [exerciseIdsKey]);

  useEffect(() => {
    const ex = exercises[currentIndex];
    const notes = ex ? exerciseDrafts[ex.id]?.notes : '';
    setShowNotes(!!notes);
  }, [currentIndex, exercises, exerciseDrafts]);

  useEffect(() => {
    setMediaExpanded(false);
  }, [currentIndex]);

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
      setSaveMessage('Turn on Include for at least one move.');
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
      sourcePlanId: planId,
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

  const currentExercise = exercises[currentIndex];
  const progressPct = exercises.length > 0 ? Math.round(((currentIndex + 1) / exercises.length) * 100) : 0;
  const includedCount = exercises.filter((e) => exerciseDrafts[e.id]?.completed).length;
  const remainingNotIncluded = exercises.length - includedCount;
  const cardsLeftInRoutine = exercises.length - currentIndex - 1;
  const canSave = includedCount > 0;

  function setAutoAdvance(next: boolean) {
    setAutoAdvanceOnInclude(next);
    try {
      localStorage.setItem(AUTO_ADVANCE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="routine-run">
      <header className="routine-run-header">
        <div>
          <h1 className="routine-run-title">{plan.name}</h1>
          <p className="routine-run-sub">
            One move at a time. Use <strong>Include</strong> for moves you log today, then <strong>Save workout</strong>.
            Same history and body map as the Plan tab.
          </p>
        </div>
        <div className="routine-run-header-actions">
          {canSave ? (
            <button type="button" className="button" onClick={handleSaveWorkout}>
              Save workout
            </button>
          ) : null}
          <a className="button button-muted routine-run-planner-link" href={plannerHref}>
            Open full planner
          </a>
        </div>
      </header>

      {saveMessage ? (
        <div className="routine-run-banner" role="status">
          {saveMessage}
        </div>
      ) : null}

      <div className="routine-run-progress" role="group" aria-label="Workout progress">
        <span className="routine-run-progress-label">Move {currentIndex + 1} of {exercises.length}</span>
        <span className="routine-run-progress-meta">
          <strong>
            {includedCount}/{exercises.length} included
          </strong>
          {' · '}
          {remainingNotIncluded} not in save yet
          {' · '}
          {cardsLeftInRoutine} left in routine
        </span>
        <div className="routine-run-progress-bar" aria-hidden="true">
          <div className="routine-run-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <label className="routine-run-auto-advance">
          <input
            type="checkbox"
            checked={autoAdvanceOnInclude}
            onChange={(e) => setAutoAdvance(e.target.checked)}
          />
          <span>Auto-advance after Include</span>
        </label>
        <div className="routine-run-progress-actions">
          <button
            type="button"
            className="button button-muted"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            ← Back
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setCurrentIndex((i) => Math.min(exercises.length - 1, i + 1))}
            disabled={currentIndex === exercises.length - 1}
          >
            Next →
          </button>
        </div>
      </div>

      {currentExercise ? (() => {
        const ex = currentExercise;
        const draft = exerciseDrafts[ex.id];
        const isCardio = getEffectiveCategory(ex) === 'cardio';
        const stat = data.stats[ex.id];
        const history = getRecentLogsForExercise(data.sessions, ex.id, 5);
        const lastLog = history[0];
        const isLast = currentIndex === exercises.length - 1;
        const muscleMeta = [ex.primaryGroup, ...(ex.secondaryGroups ?? [])].join(' · ');
        const imgMeta = images[ex.name];
        const alternatives = getAlternativeExercises(ex, allExercises, { limit: 10 });

        return (
          <div className="routine-run-card">
            <div className="routine-run-card-head routine-run-card-head--with-pill">
              <span className="routine-run-num">{currentIndex + 1}</span>
              <div className="routine-run-card-title-block">
                <h2 className="routine-run-move-title">
                  <ExerciseYoutubeLink exerciseName={ex.name} className="exercise-youtube exercise-youtube--title">
                    {ex.name}
                  </ExerciseYoutubeLink>
                </h2>
                <p className="routine-run-meta routine-run-meta--inline">
                  {muscleMeta}
                  <span className="routine-run-meta-sep" aria-hidden="true">
                    {' · '}
                  </span>
                  Logged <strong>{stat?.timesCompleted ?? 0}</strong>× · Last {formatShortDate(stat?.lastPerformed ?? null)}
                </p>
              </div>
              <button
                type="button"
                className={`routine-run-pill routine-run-pill--head ${draft?.completed ? 'routine-run-pill--active' : ''}`.trim()}
                aria-pressed={draft?.completed ?? false}
                onClick={() => {
                  const nextCompleted = !(draft?.completed ?? false);
                  updateDraft(ex.id, { completed: nextCompleted });
                  if (autoAdvanceOnInclude && nextCompleted && currentIndex < exercises.length - 1) {
                    setCurrentIndex((i) => Math.min(exercises.length - 1, i + 1));
                  }
                }}
              >
                {draft?.completed ? 'Included' : 'Include'}
              </button>
            </div>

            <div className={`routine-run-media-wrap ${mediaExpanded ? 'routine-run-media-wrap--expanded' : ''}`.trim()}>
              {imgMeta ? (
                <>
                  <button
                    type="button"
                    className="routine-run-media-expand"
                    onClick={() => setMediaExpanded((v) => !v)}
                    aria-expanded={mediaExpanded}
                  >
                    {!mediaExpanded ? (
                      <>
                        <img
                          src={imgMeta.url}
                          alt=""
                          className="routine-run-thumb"
                          width={56}
                          height={56}
                          loading="lazy"
                        />
                        <span className="routine-run-media-expand-label">Show demo</span>
                      </>
                    ) : (
                      <span className="routine-run-media-expand-label">Hide demo</span>
                    )}
                  </button>
                  {mediaExpanded ? (
                    <div className="routine-run-media routine-run-media--compact">
                      <img
                        src={imgMeta.url}
                        alt={`${ex.name} demo`}
                        className="routine-run-image"
                        loading="eager"
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="routine-run-media-fallback-inline">
                  <span className="routine-run-media-fallback-text">{ex.primaryGroup}</span>
                </div>
              )}
            </div>
            {imgMeta?.credit && mediaExpanded ? <p className="image-credit">{imgMeta.credit}</p> : null}

            {history.length > 0 ? (
              <details className="routine-run-history-details">
                <summary>Recent sessions ({history.length})</summary>
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
              </details>
            ) : (
              <p className="routine-run-history-empty">No history yet for this move.</p>
            )}

            {alternatives.length > 0 ? (
              <details className="routine-run-alts-details">
                <summary>
                  Swap ideas — same muscles ({alternatives.length})
                </summary>
                <ul className="routine-run-alts-list">
                  {alternatives.map((alt) => (
                    <li key={alt.id}>
                      <ExerciseYoutubeLink
                        exerciseName={alt.name}
                        className="routine-run-alt-link exercise-youtube"
                      >
                        {alt.name}
                      </ExerciseYoutubeLink>
                      <span className="routine-run-alt-meta">
                        {alt.primaryGroup}
                        {alt.secondaryGroups?.length ? ` · ${alt.secondaryGroups.join(', ')}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="routine-run-alts-hint">
                  For this routine, log the move you actually do under this card — the plan order stays the same.
                </p>
              </details>
            ) : null}

            {!isLast ? (
              <div className="routine-run-card-actions routine-run-card-actions--skip-only">
                <button
                  type="button"
                  className="routine-run-skip"
                  onClick={() => setCurrentIndex((i) => Math.min(exercises.length - 1, i + 1))}
                >
                  Skip → next move
                </button>
              </div>
            ) : null}

            <MuscleTargetPick exercise={ex} draft={draft} onPatch={(patch) => updateDraft(ex.id, patch)} />

            {lastLog ? (
              <p className="routine-run-last-session" role="status">
                <span className="routine-run-last-session-label">Last session</span>
                {isCardio ? (
                  <>
                    {' '}
                    <strong>{lastLog.reps?.trim() || '—'}</strong> min · {lastLog.dateLabel}
                  </>
                ) : (
                  <>
                    {' '}
                    <strong>{lastLog.sets}×{lastLog.reps?.trim() || '—'}</strong>
                    {lastLog.weight?.trim() ? (
                      <>
                        {' · '}
                        <strong>{lastLog.weight.trim()}</strong>
                      </>
                    ) : null}
                    {' · '}
                    {lastLog.dateLabel}
                  </>
                )}
              </p>
            ) : null}

            <div className={`routine-run-log-grid ${!isCardio ? 'routine-run-log-grid--triple' : ''}`.trim()}>
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
                  <label className="routine-run-log-field">
                    Weight
                    <input
                      type="text"
                      placeholder="e.g. 60kg"
                      value={draft?.weight ?? ''}
                      onChange={(e) => updateDraft(ex.id, { weight: e.target.value })}
                    />
                  </label>
                </>
              )}
              <div className="routine-run-note-row routine-run-log-field--full">
                <button
                  type="button"
                  className="routine-run-note-toggle"
                  onClick={() => setShowNotes((prev) => !prev)}
                >
                  {showNotes ? 'Hide note' : 'Add note'}
                </button>
              </div>
              {showNotes && (
                <label className="routine-run-log-field routine-run-log-field--full">
                  Notes
                  <input
                    type="text"
                    placeholder="tempo, machine #…"
                    value={draft?.notes ?? ''}
                    onChange={(e) => updateDraft(ex.id, { notes: e.target.value })}
                  />
                </label>
              )}
            </div>
            {isLast ? (
              <p className="routine-run-last-hint">
                Last move — tap <strong>Save workout</strong> in the header or in the bar at the bottom when you are done.
              </p>
            ) : null}
          </div>
        );
      })() : null}

      {canSave ? (
        <div className="routine-run-sticky-save">
          <div className="routine-run-sticky-copy">
            <strong>Finish workout</strong>
            <span>
              {includedCount} included · Saves to Activity &amp; body map
            </span>
          </div>
          <button type="button" className="button" onClick={handleSaveWorkout}>
            Save workout
          </button>
        </div>
      ) : null}
    </div>
  );
}
