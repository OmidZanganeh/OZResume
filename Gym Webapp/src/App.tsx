import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from './data/exerciseLibrary';
import { BodyMapFigure } from './components/BodyMapFigure';
import { HistoryBackfillPanel } from './components/HistoryBackfillPanel';
import { WorkoutCalendar } from './components/WorkoutCalendar';
import { MuscleTargetPick } from './components/MuscleTargetPick';
import { ExerciseYoutubeLink } from './components/ExerciseYoutubeLink';
import { getExerciseImageMap, type ExerciseImageMeta } from './services/exerciseImages';
import { getPracticeCountsInWindow } from './utils/practiceWindow';
import { isImportedHistorySessionId, isLegacySampleSessionId } from './utils/historySeed';
import {
  defaultGymData,
  loadPersistedGymData,
  savePersistedGymData,
  type PersistedGymData,
  type SavedPlan,
} from './data/gymFlowStorage';
import { resolvePlanExerciseIdsToCatalog, STORAGE_V1 } from './data/migrateStorage';
import {
  type CatalogSortMode,
  collectSortedUnique,
  compareCatalog,
  getEffectiveCategory,
  getEffectiveEquipment,
  labelForFilterValue,
  equipmentToSlug,
} from './utils/catalogSort';
import { commitWorkoutSession } from './utils/commitWorkoutSession';
import {
  candidateMuscleGroupsForExercise,
  getDefaultDraft,
  getDefaultDraftForExercise,
  type ExerciseLogDraft,
} from './utils/workoutLogDraft';

const PRACTICE_WINDOW_DAYS = 10;

function exerciseMatchesGroups(exercise: Exercise, selectedGroups: MuscleGroup[]) {
  if (selectedGroups.length === 0) return true;
  if (selectedGroups.includes(exercise.primaryGroup)) return true;
  return exercise.secondaryGroups?.some((group) => selectedGroups.includes(group)) ?? false;
}

/** Exercise names in template order (valid catalog ids only). */
function orderedNamesForSavedPlan(plan: SavedPlan, allExercises: Exercise[]): string[] {
  const ids = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
  const map = new Map(allExercises.map((e) => [e.id, e.name]));
  return ids.map((id) => map.get(id)).filter((n): n is string => typeof n === 'string');
}

function createExerciseId(name: string) {
  return `custom-${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return 'Never';
  return new Date(dateValue).toLocaleDateString();
}

function buildRoutineRunUrl(planId: string): string {
  const u = new URL(window.location.href);
  u.searchParams.set('routine', planId);
  return u.toString();
}

function openRoutineWorkoutTab(planId: string) {
  window.open(buildRoutineRunUrl(planId), '_blank', 'noopener,noreferrer');
}

export default function App() {
  const [data, setData] = useState<PersistedGymData>(() => loadPersistedGymData());
  const [selectedGroups, setSelectedGroups] = useState<MuscleGroup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleExerciseCount, setVisibleExerciseCount] = useState(24);
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<string[]>([]);
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseLogDraft>>({});
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseGroup, setNewExerciseGroup] = useState<MuscleGroup>('Chest');
  const [message, setMessage] = useState('');
  const [exerciseImages, setExerciseImages] = useState<Record<string, ExerciseImageMeta>>({});
  const [catalogSort, setCatalogSort] = useState<CatalogSortMode>('gym');
  const [filterWrkoutCategory, setFilterWrkoutCategory] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [mainTab, setMainTab] = useState<'plan' | 'activity' | 'library'>('plan');
  const [planStep, setPlanStep] = useState<1 | 2 | 3>(1);
  const [savePlanNameInput, setSavePlanNameInput] = useState('');
  /** Set when you load a saved routine so you know which program you’re following. */
  const [activeRoutineName, setActiveRoutineName] = useState<string | null>(null);
  const [expandedSavedPlanId, setExpandedSavedPlanId] = useState<string | null>(null);
  /** When set, step 2 changes can be written back to this saved routine id. */
  const [editingSavedPlanId, setEditingSavedPlanId] = useState<string | null>(null);

  const allExercises = useMemo(
    () => [...EXERCISE_LIBRARY, ...data.customExercises],
    [data.customExercises],
  );

  const exerciseById = useMemo(() => new Map(allExercises.map((item) => [item.id, item])), [allExercises]);

  const categoryFilterOptions = useMemo(
    () => collectSortedUnique(allExercises.map((e) => getEffectiveCategory(e))),
    [allExercises],
  );
  const equipmentFilterOptions = useMemo(
    () => collectSortedUnique(allExercises.map((e) => getEffectiveEquipment(e))),
    [allExercises],
  );

  const catalogMatches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const timesById: Record<string, number | undefined> = {};
    for (const [id, st] of Object.entries(data.stats)) {
      timesById[id] = st.timesCompleted;
    }

    const list = allExercises
      .filter((exercise) => exerciseMatchesGroups(exercise, selectedGroups))
      .filter((exercise) => (filterWrkoutCategory === 'all' ? true : getEffectiveCategory(exercise) === filterWrkoutCategory))
      .filter((exercise) => {
        if (selectedEquipment.length === 0) return true;
        return selectedEquipment.includes(getEffectiveEquipment(exercise));
      })
      .filter((exercise) => {
        if (term.length === 0) return true;
        return (
          exercise.name.toLowerCase().includes(term) ||
          exercise.primaryGroup.toLowerCase().includes(term) ||
          getEffectiveCategory(exercise).includes(term) ||
          getEffectiveEquipment(exercise).includes(term)
        );
      });

    return list.sort((a, b) => compareCatalog(a, b, catalogSort, timesById));
  }, [allExercises, catalogSort, data.stats, filterWrkoutCategory, selectedEquipment, searchTerm, selectedGroups]);

  const visibleExercises = useMemo(
    () => catalogMatches.slice(0, visibleExerciseCount),
    [catalogMatches, visibleExerciseCount],
  );

  const planExercises = useMemo(
    () => selectedExerciseIds.map((id) => exerciseById.get(id)).filter((item): item is Exercise => !!item),
    [exerciseById, selectedExerciseIds],
  );

  const totalWorkoutCount = data.sessions.length;
  const totalExerciseCompletions = Object.values(data.stats).reduce(
    (total, stat) => total + stat.timesCompleted,
    0,
  );
  const totalTrackedSets = Object.values(data.stats).reduce((total, stat) => total + stat.totalSets, 0);
  const recentSessions = data.sessions.slice(0, 5);
  const practiceCounts = useMemo(
    () => getPracticeCountsInWindow(data.sessions, exerciseById, PRACTICE_WINDOW_DAYS),
    [data.sessions, exerciseById],
  );
  const exercisesToResolveImages = useMemo(() => {
    const names = new Set([...visibleExercises.map((item) => item.name), ...planExercises.map((item) => item.name)]);
    return allExercises.filter((e) => names.has(e.name));
  }, [allExercises, planExercises, visibleExercises]);

  useEffect(() => {
    if (selectedGroups.length === 0) {
      setSelectedEquipment([]);
    }
  }, [selectedGroups.length]);

  useEffect(() => {
    if (selectedExerciseIds.length === 0) setActiveRoutineName(null);
  }, [selectedExerciseIds.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [mainTab, planStep]);

  useEffect(() => {
    let cancelled = false;
    getExerciseImageMap(exercisesToResolveImages)
      .then((result) => {
        if (cancelled) return;
        setExerciseImages((current) => ({ ...current, ...result }));
      })
      .catch(() => {
        if (cancelled) return;
      });

    return () => {
      cancelled = true;
    };
  }, [exercisesToResolveImages]);

  function persist(nextData: PersistedGymData) {
    setData(nextData);
    savePersistedGymData(nextData);
  }

  function toggleGroup(group: MuscleGroup) {
    setSelectedGroups((current) =>
      current.includes(group) ? current.filter((item) => item !== group) : [...current, group],
    );
    setVisibleExerciseCount(24);
  }

  function toggleEquipment(equip: string) {
    setSelectedEquipment((prev) => {
      if (prev.includes(equip)) return prev.filter((e) => e !== equip);
      return [...prev, equip].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
    });
    setVisibleExerciseCount(24);
  }

  function toggleExerciseInPlan(exerciseId: string) {
    const wasInPlan = selectedExerciseIds.includes(exerciseId);

    setSelectedExerciseIds((current) => {
      if (current.includes(exerciseId)) {
        return current.filter((id) => id !== exerciseId);
      }
      return [...current, exerciseId];
    });

    if (wasInPlan) {
      setExerciseDrafts((drafts) => {
        if (!drafts[exerciseId]) return drafts;
        const next = { ...drafts };
        delete next[exerciseId];
        return next;
      });
    } else {
      const ex = exerciseById.get(exerciseId);
      setExerciseDrafts((drafts) => ({
        ...drafts,
        [exerciseId]: drafts[exerciseId] ?? getDefaultDraftForExercise(ex),
      }));
    }
  }

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
        const t = merged.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
        merged.trainedMuscleGroups = t.length > 0 ? t : [...c];
      }
      return { ...current, [exerciseId]: merged };
    });
  }

  function handleAddCustomExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = newExerciseName.trim();
    if (trimmedName.length < 2) {
      setMessage('Use at least 2 letters for a custom exercise name.');
      return;
    }

    const exists = allExercises.some((exercise) => exercise.name.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      setMessage('That exercise already exists in your library.');
      return;
    }

    const nextExercise: Exercise = {
      id: createExerciseId(trimmedName),
      name: trimmedName,
      primaryGroup: newExerciseGroup,
    };
    persist({ ...data, customExercises: [...data.customExercises, nextExercise] });
    setNewExerciseName('');
    setMessage(`Added "${trimmedName}" to your exercise library.`);
  }

  function clearAllUserData() {
    const ok = window.confirm(
      'Remove all data saved in this browser: workouts, stats, custom exercises, saved plan templates, and your current session. The built-in catalog is unchanged. This cannot be undone. Continue?',
    );
    if (!ok) return;

    localStorage.removeItem(STORAGE_V1);
    persist(defaultGymData);
    setSelectedGroups([]);
    setSelectedEquipment([]);
    setSelectedExerciseIds([]);
    setExerciseDrafts({});
    setSearchTerm('');
    setVisibleExerciseCount(24);
    setNewExerciseName('');
    setSavePlanNameInput('');
    setPlanStep(1);
    setMainTab('plan');
    setActiveRoutineName(null);
    setExpandedSavedPlanId(null);
    setEditingSavedPlanId(null);
    setMessage('All your saved data was cleared.');
  }

  function saveCurrentPlanTemplate() {
    const name = savePlanNameInput.trim();
    if (name.length < 2) {
      setMessage('Enter a plan name (at least 2 characters).');
      return;
    }
    const exerciseIds = [...selectedExerciseIds];
    if (exerciseIds.length === 0) {
      setMessage('Add moves on Plan → Moves (tap “Add to today” on each card), then come back here to save.');
      setMainTab('plan');
      setPlanStep(2);
      return;
    }
    const plan: SavedPlan = {
      id: `tpl-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      exerciseIds,
      muscleGroups: [...selectedGroups],
      equipment: [...selectedEquipment],
    };
    persist({ ...data, savedPlans: [plan, ...data.savedPlans] });
    setSavePlanNameInput('');
    setMessage(`Saved routine “${name}” (${plan.exerciseIds.length} moves). Find it under My saved routines.`);
  }

  function loadSavedPlanTemplate(plan: SavedPlan) {
    const validIds = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
    if (validIds.length === 0) {
      setMessage('That template has no moves left in your library (IDs may have changed).');
      return;
    }
    setSelectedGroups([...plan.muscleGroups]);
    setSelectedEquipment([...plan.equipment]);
    setSelectedExerciseIds(validIds);
    const nextDrafts: Record<string, ExerciseLogDraft> = {};
    for (const id of validIds) {
      const ex = exerciseById.get(id);
      const prev = exerciseDrafts[id];
      const merged: ExerciseLogDraft = { ...getDefaultDraftForExercise(ex), ...prev };
      if (ex) {
        const c = candidateMuscleGroupsForExercise(ex);
        const t = merged.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
        merged.trainedMuscleGroups = t.length > 0 ? t : [...c];
      }
      nextDrafts[id] = merged;
    }
    setExerciseDrafts(nextDrafts);
    setVisibleExerciseCount(24);
    setMainTab('plan');
    setPlanStep(3);
    setActiveRoutineName(plan.name);
    setEditingSavedPlanId(null);
    setMessage(
      `Loaded “${plan.name}” — ${validIds.length} moves. Open Use today for the image tab, or log each move below.`,
    );
  }

  function beginEditSavedPlan(plan: SavedPlan) {
    const validIds = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
    if (validIds.length === 0) {
      setMessage('That routine has no moves left in your library.');
      return;
    }
    setSelectedGroups([...plan.muscleGroups]);
    setSelectedEquipment([...plan.equipment]);
    setSelectedExerciseIds(validIds);
    const nextDrafts: Record<string, ExerciseLogDraft> = {};
    for (const id of validIds) {
      const ex = exerciseById.get(id);
      const prev = exerciseDrafts[id];
      const merged: ExerciseLogDraft = { ...getDefaultDraftForExercise(ex), ...prev };
      if (ex) {
        const c = candidateMuscleGroupsForExercise(ex);
        const t = merged.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
        merged.trainedMuscleGroups = t.length > 0 ? t : [...c];
      }
      nextDrafts[id] = merged;
    }
    setExerciseDrafts(nextDrafts);
    setVisibleExerciseCount(24);
    setMainTab('plan');
    setPlanStep(2);
    setEditingSavedPlanId(plan.id);
    setActiveRoutineName(null);
    setMessage(`Editing “${plan.name}” — add or remove moves here, then Update routine.`);
  }

  function updateSavedPlanFromSession() {
    if (!editingSavedPlanId) return;
    const exerciseIds = [...selectedExerciseIds];
    if (exerciseIds.length === 0) {
      setMessage('Add at least one move before updating the saved routine.');
      return;
    }
    const nextPlans = data.savedPlans.map((p) =>
      p.id === editingSavedPlanId
        ? {
            ...p,
            exerciseIds,
            muscleGroups: [...selectedGroups],
            equipment: [...selectedEquipment],
          }
        : p,
    );
    persist({ ...data, savedPlans: nextPlans });
    setEditingSavedPlanId(null);
    setMessage('Saved routine updated with your current move list and filters.');
  }

  function cancelEditSavedPlan() {
    setEditingSavedPlanId(null);
    setMessage('Stopped editing — routine in the list was not changed.');
  }

  function deleteSavedPlanTemplate(id: string) {
    persist({ ...data, savedPlans: data.savedPlans.filter((p) => p.id !== id) });
    if (editingSavedPlanId === id) setEditingSavedPlanId(null);
    setMessage('Routine removed.');
  }

  function saveWorkout() {
    const result = commitWorkoutSession({
      data,
      exerciseOrderIds: selectedExerciseIds,
      exerciseDrafts,
      exerciseById,
      sessionGroupSeed: selectedGroups,
    });
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    persist(result.nextData);
    setSelectedExerciseIds([]);
    setExerciseDrafts({});
    setPlanStep(2);
    setMainTab('activity');
    setActiveRoutineName(null);
    setEditingSavedPlanId(null);
    setMessage(
      `Saved ${result.completedCount} move${result.completedCount === 1 ? '' : 's'}. Your plan was cleared for next time — see Activity for this session.`,
    );
  }

  return (
    <div className="app-layout">
      <a className="skip-link" href="#app-main">
        Skip to main content
      </a>
      <header className="app-header">
        <div className="app-header-inner">
          <div className="app-brand">
            <img
              className="app-brand-mark"
              src={`${import.meta.env.BASE_URL}app-icon.png`}
              width={40}
              height={40}
              alt=""
            />
          </div>
          <div className="app-header-titles">
            <h1 className="app-title">Gym Flow</h1>
            <p className="app-subtitle">Training planner · runs locally in your browser</p>
          </div>
        </div>
      </header>

      <main id="app-main" className="app-shell" aria-label="Gym Flow workout planner">
        {message ? (
          <div className="app-status-banner" role="status">
            {message}
          </div>
        ) : null}

        <nav className="app-tabs" aria-label="Main sections">
          <button
            type="button"
            className={`app-tab ${mainTab === 'plan' ? 'app-tab--active' : ''}`}
            onClick={() => setMainTab('plan')}
            aria-current={mainTab === 'plan' ? 'page' : undefined}
          >
            Plan
          </button>
          <button
            type="button"
            className={`app-tab ${mainTab === 'activity' ? 'app-tab--active' : ''}`}
            onClick={() => setMainTab('activity')}
            aria-current={mainTab === 'activity' ? 'page' : undefined}
          >
            Activity
          </button>
          <button
            type="button"
            className={`app-tab ${mainTab === 'library' ? 'app-tab--active' : ''}`}
            onClick={() => setMainTab('library')}
            aria-current={mainTab === 'library' ? 'page' : undefined}
          >
            Library
          </button>
        </nav>

        {mainTab === 'plan' && (
          <>
            <div className="plan-stepper" role="tablist" aria-label="Plan steps">
              {([
                [1 as const, 'Focus'],
                [2 as const, 'Moves'],
                [3 as const, 'Log & save'],
              ] as const).map(([n, label]) => (
                <button
                  key={n}
                  type="button"
                  role="tab"
                  aria-selected={planStep === n}
                  className={`plan-stepper__btn ${planStep === n ? 'plan-stepper__btn--current' : ''}`}
                  onClick={() => setPlanStep(n)}
                >
                  <span className="plan-stepper__num">{n}</span>
                  <span className="plan-stepper__label">{label}</span>
                </button>
              ))}
            </div>

            {editingSavedPlanId ? (
              <div className="editing-routine-banner panel panel--compact" role="status">
                <p className="editing-routine-banner-text">
                  Editing saved routine{' '}
                  <strong>{data.savedPlans.find((p) => p.id === editingSavedPlanId)?.name ?? ''}</strong> — change moves on
                  step 2, then save.
                </p>
                <div className="editing-routine-banner-actions">
                  <button type="button" className="button button-small" onClick={updateSavedPlanFromSession}>
                    Update routine
                  </button>
                  <button type="button" className="button button-muted button-small" onClick={cancelEditSavedPlan}>
                    Cancel edit
                  </button>
                </div>
              </div>
            ) : null}

            <section className="panel panel--compact saved-routines-hub" aria-label="Saved workout routines">
              <div className="saved-routines-hub-header">
                <h2 className="panel-heading panel-heading--plain">My saved routines</h2>
                <p className="panel-subtle saved-routines-hub-lead">
                  <strong>Use today</strong> opens a <strong>new tab</strong> with move images and order (for the floor).{' '}
                  <strong>Log in planner</strong> loads this list here so you can log sets and save the workout.{' '}
                  <strong>Edit routine</strong> sends you to Moves to add/remove moves, then <strong>Update routine</strong>.{' '}
                  <strong>Review order</strong> expands the names on this page.
                </p>
              </div>
              {activeRoutineName ? (
                <p className="active-routine-banner" role="status">
                  Following routine: <strong>{activeRoutineName}</strong>
                </p>
              ) : null}
              {data.savedPlans.length === 0 ? (
                <p className="empty-text saved-routines-empty">
                  No saved routines yet. After you pick moves on step 2 (or 3), use <strong>Save new routine</strong> below to
                  store this workout for later.
                </p>
              ) : (
                <ul className="saved-routine-quick-list">
                  {data.savedPlans.map((plan) => {
                    const names = orderedNamesForSavedPlan(plan, allExercises);
                    const expanded = expandedSavedPlanId === plan.id;
                    return (
                      <li key={plan.id} className="saved-routine-quick-item">
                        <div className="saved-routine-quick-top">
                          <div className="saved-routine-quick-info">
                            <strong>{plan.name}</strong>
                            <span className="saved-routine-quick-meta">
                              {names.length} moves · saved {formatDate(plan.createdAt)}
                            </span>
                          </div>
                          <div className="saved-routine-quick-actions">
                            <button
                              type="button"
                              className="button button-small"
                              onClick={() => openRoutineWorkoutTab(plan.id)}
                            >
                              Use today
                            </button>
                            <button
                              type="button"
                              className="button button-muted button-small"
                              onClick={() => loadSavedPlanTemplate(plan)}
                            >
                              Log in planner
                            </button>
                            <button
                              type="button"
                              className="button button-muted button-small"
                              onClick={() => beginEditSavedPlan(plan)}
                            >
                              Edit routine
                            </button>
                            <button
                              type="button"
                              className="button button-muted button-small"
                              onClick={() =>
                                setExpandedSavedPlanId(expanded ? null : plan.id)
                              }
                              aria-expanded={expanded}
                            >
                              {expanded ? 'Hide order' : 'Review order'}
                            </button>
                          </div>
                        </div>
                        {expanded && names.length > 0 ? (
                          <ol className="saved-routine-preview-list">
                            {names.map((n) => (
                              <li key={n}>{n}</li>
                            ))}
                          </ol>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {(planStep === 2 || planStep === 3) && selectedExerciseIds.length > 0 ? (
              <section className="panel panel--compact save-routine-inline" aria-label="Save or update routine">
                {editingSavedPlanId ? (
                  <>
                    <h3 className="panel-heading panel-heading--plain">Update this saved routine</h3>
                    <p className="panel-subtle">
                      Your move list and Focus / equipment filters will replace what’s stored for{' '}
                      <strong>{data.savedPlans.find((p) => p.id === editingSavedPlanId)?.name}</strong>. Or cancel from the
                      banner above.
                    </p>
                    <div className="save-routine-inline-actions">
                      <button type="button" className="button" onClick={updateSavedPlanFromSession}>
                        Update routine
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h3 className="panel-heading panel-heading--plain">Save new routine</h3>
                    <p className="panel-subtle">
                      Stores this exact move list and filters so you can reload it from <strong>My saved routines</strong> any
                      day.
                    </p>
                    <form
                      className="saved-plan-form save-routine-inline-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        saveCurrentPlanTemplate();
                      }}
                    >
                      <div className="saved-plan-save-row">
                        <input
                          className="text-input"
                          type="text"
                          placeholder="Name (e.g. Pull B, Leg day)"
                          value={savePlanNameInput}
                          onChange={(e) => setSavePlanNameInput(e.target.value)}
                          aria-label="Name for new routine"
                          autoComplete="off"
                        />
                        <button type="submit" className="button">
                          Save routine
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            ) : null}

            {planStep === 1 && (
              <>
      <section className="panel panel--accent-top body-map-section" aria-label="Body map and plan filter">
        <div className="panel-title-row">
          <h2 className="panel-heading panel-heading--plain">Focus — muscles</h2>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setSelectedGroups([]);
              setSelectedEquipment([]);
            }}
            disabled={selectedGroups.length === 0}
          >
            Clear selection
          </button>
        </div>
        <p className="prose-lead">
          The map uses the last <strong>{PRACTICE_WINDOW_DAYS} days</strong> of saved workouts: <strong>red</strong> = not
          trained yet, <strong>orange</strong> = one logged session touching that area, <strong>green</strong> = two or more.
          Each completed move counts toward the areas you check on that move’s card (defaults to all listed muscles). Tap a
          region to filter the catalog; tap again to
          deselect. With nothing selected, all groups show. Cardio and Mobility are the <strong>squares</strong> beside the
          figure. Narrow by equipment on the <strong>Moves</strong> step. Past workouts: use <strong>Activity → Training history</strong>.
        </p>
        <BodyMapFigure
          practiceCounts={practiceCounts}
          practiceWindowDays={PRACTICE_WINDOW_DAYS}
          selectedGroups={selectedGroups}
          onToggleGroup={toggleGroup}
        />
        <div className="selected-muscles" aria-label="Muscles selected for filter">
          {selectedGroups.length === 0 ? (
            <p className="empty-text" style={{ margin: '0.75rem 0 0' }}>
              No area filter — showing all groups in the move list. Tap the map to narrow (e.g. Chest + Triceps).
            </p>
          ) : (
            <div className="chip-grid chip-grid--selected" style={{ marginTop: '0.75rem' }}>
              {selectedGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  className="chip chip-active"
                  onClick={() => toggleGroup(group)}
                  title="Remove from today’s focus"
                >
                  {group} ✕
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
                <div className="plan-wizard-footer">
                  <span />
                  <button type="button" className="button" onClick={() => setPlanStep(2)}>
                    Next: pick moves
                  </button>
                </div>
              </>
            )}

            {planStep === 2 && (
              <>
      <section className="panel">
        <div className="panel-title-row">
          <h2 className="panel-heading panel-heading--plain">
            Pick moves <span className="panel-heading-meta">({catalogMatches.length} matches)</span>
          </h2>
          <input
            className="search-input"
            type="search"
            placeholder="Search move..."
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setVisibleExerciseCount(24);
            }}
            aria-label="Search exercise catalog"
          />
        </div>
        <div
          className="equipment-pick"
          role="group"
          aria-label="Narrow by equipment, multiple choice"
        >
          <div className="equipment-pick-header">
            <p className="equipment-pick-title">Narrow by equipment</p>
            {selectedEquipment.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSelectedEquipment([]);
                  setVisibleExerciseCount(24);
                }}
              >
                Clear equipment
              </button>
            )}
          </div>
          <p className="equipment-pick-hint">
            Pick any that apply: the list shows moves that use <strong>any</strong> of the selected types. Leave all off to
            include every equipment.
          </p>
          <div className="chip-grid equipment-chip-grid">
            {equipmentFilterOptions.map((eq) => {
              const active = selectedEquipment.includes(eq);
              const slug = equipmentToSlug(eq);
              return (
                <button
                  key={eq}
                  type="button"
                  className={`chip equipment-visual equipment-visual--${slug} ${active ? 'chip-active' : ''}`}
                  aria-pressed={active}
                  onClick={() => toggleEquipment(eq)}
                  title={labelForFilterValue(eq)}
                >
                  <span className="equipment-visual-label">{labelForFilterValue(eq)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="catalog-filters" role="group" aria-label="Sort and move type">
          <label className="filter-field">
            <span className="filter-field-label">Sort</span>
            <select
              className="select-input"
              value={catalogSort}
              onChange={(event) => {
                setCatalogSort(event.target.value as CatalogSortMode);
                setVisibleExerciseCount(24);
              }}
              aria-label="Sort catalog"
            >
              <option value="gym">Common gym first (heuristic)</option>
              <option value="mostUsed">Your most used</option>
              <option value="leastUsed">Your least used</option>
              <option value="a-z">Name A–Z</option>
              <option value="z-a">Name Z–A</option>
            </select>
          </label>
          <label className="filter-field">
            <span className="filter-field-label">Move type</span>
            <select
              className="select-input"
              value={filterWrkoutCategory}
              onChange={(event) => {
                setFilterWrkoutCategory(event.target.value);
                setVisibleExerciseCount(24);
              }}
              aria-label="Filter by move type from dataset"
            >
              <option value="all">All types</option>
              {categoryFilterOptions.map((c) => (
                <option key={c} value={c}>
                  {labelForFilterValue(c)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="exercise-grid">
          {visibleExercises.map((exercise) => {
            const selected = selectedExerciseIds.includes(exercise.id);
            const trainedCount = data.stats[exercise.id]?.timesCompleted ?? 0;
            return (
              <article key={exercise.id} className="exercise-card">
                <ExerciseYoutubeLink
                  exerciseName={exercise.name}
                  className="exercise-youtube exercise-youtube--image"
                >
                  {exerciseImages[exercise.name] ? (
                    <img
                      src={exerciseImages[exercise.name].url}
                      alt={`${exercise.name} demo`}
                      className="exercise-image"
                      loading="lazy"
                    />
                  ) : (
                    <div className="exercise-image-fallback">{exercise.primaryGroup}</div>
                  )}
                </ExerciseYoutubeLink>
                <div>
                  <h3>
                    <ExerciseYoutubeLink
                      exerciseName={exercise.name}
                      className="exercise-youtube exercise-youtube--title"
                    >
                      {exercise.name}
                    </ExerciseYoutubeLink>
                  </h3>
                  <p className="meta">
                    {exercise.primaryGroup}
                    {exercise.secondaryGroups?.length ? ` + ${exercise.secondaryGroups.join(', ')}` : ''}
                  </p>
                  <p className="meta meta--dataset">
                    {labelForFilterValue(getEffectiveCategory(exercise))} · {labelForFilterValue(getEffectiveEquipment(exercise))}
                  </p>
                  <p className="meta">Completed: {trainedCount} times</p>
                  {selected ? (
                    <MuscleTargetPick
                      exercise={exercise}
                      draft={exerciseDrafts[exercise.id]}
                      onPatch={(patch) => updateDraft(exercise.id, patch)}
                    />
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`button ${selected ? 'button-muted' : ''}`}
                  onClick={() => toggleExerciseInPlan(exercise.id)}
                >
                  {selected ? 'Remove' : 'Add to today'}
                </button>
              </article>
            );
          })}
        </div>

        {visibleExerciseCount < catalogMatches.length && (
          <button
            type="button"
            className="button button-block"
            onClick={() => setVisibleExerciseCount((value) => value + 24)}
          >
            Show more moves
          </button>
        )}
      </section>
                <div className="plan-wizard-footer">
                  <button type="button" className="button button-muted" onClick={() => setPlanStep(1)}>
                    Back
                  </button>
                  <button type="button" className="button" onClick={() => setPlanStep(3)}>
                    Next: log &amp; save
                  </button>
                </div>
              </>
            )}

            {planStep === 3 && (
              <>
      <section className="panel panel--accent-top">
        <h2 className="panel-heading panel-heading--plain">
          Today&apos;s plan <span className="panel-heading-meta">({planExercises.length} moves)</span>
        </h2>
        {planExercises.length === 0 ? (
          <div className="plan-empty">
            <p className="empty-text">
              No moves in this plan yet. After you <strong>save a workout</strong>, the list clears so you can build the next
              one.
            </p>
            <button type="button" className="button button-muted" onClick={() => setPlanStep(2)}>
              Go to Moves to add exercises
            </button>
          </div>
        ) : (
          <div className="plan-list">
            {planExercises.map((exercise) => {
              const draft = exerciseDrafts[exercise.id];
              const isCardio = getEffectiveCategory(exercise) === 'cardio';
              return (
                <article key={exercise.id} className="plan-card">
                  <div className="plan-heading">
                    <h3>
                      <ExerciseYoutubeLink
                        exerciseName={exercise.name}
                        className="exercise-youtube exercise-youtube--title"
                      >
                        {exercise.name}
                      </ExerciseYoutubeLink>
                    </h3>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={draft?.completed ?? true}
                        onChange={(event) => updateDraft(exercise.id, { completed: event.target.checked })}
                      />
                      Completed
                    </label>
                  </div>

                  <MuscleTargetPick
                    exercise={exercise}
                    draft={draft}
                    onPatch={(patch) => updateDraft(exercise.id, patch)}
                  />

                  <div className="plan-grid">
                    {isCardio ? (
                      <label className="plan-grid-full">
                        Minutes
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="e.g. 20 or 25–30"
                          value={draft?.reps ?? '20'}
                          onChange={(event) => updateDraft(exercise.id, { reps: event.target.value, sets: 1 })}
                        />
                      </label>
                    ) : (
                      <>
                        <label>
                          Sets
                          <input
                            type="number"
                            min={1}
                            value={draft?.sets ?? 3}
                            onChange={(event) => updateDraft(exercise.id, { sets: Number(event.target.value) || 1 })}
                          />
                        </label>
                        <label>
                          Reps
                          <input
                            type="text"
                            value={draft?.reps ?? '8-12'}
                            onChange={(event) => updateDraft(exercise.id, { reps: event.target.value })}
                          />
                        </label>
                        <label>
                          Weight
                          <input
                            type="text"
                            placeholder="e.g. 35kg"
                            value={draft?.weight ?? ''}
                            onChange={(event) => updateDraft(exercise.id, { weight: event.target.value })}
                          />
                        </label>
                      </>
                    )}
                  </div>

                  <label>
                    Notes
                    <input
                      type="text"
                      placeholder="tempo, rest, machine setup..."
                      value={draft?.notes ?? ''}
                      onChange={(event) => updateDraft(exercise.id, { notes: event.target.value })}
                    />
                  </label>
                  {exerciseImages[exercise.name] && (
                    <p className="image-credit">{exerciseImages[exercise.name].credit}</p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
                <div className="plan-wizard-footer">
                  <button type="button" className="button button-muted" onClick={() => setPlanStep(2)}>
                    Back to moves
                  </button>
                  <span />
                </div>
              </>
            )}
          </>
        )}

      {mainTab === 'plan' && planStep === 3 && planExercises.length > 0 && (
        <section className="sticky-save" aria-label="Save workout">
          <div className="sticky-save-copy">
            <strong>{planExercises.length} moves ready</strong>
            <span>Save when you finish your session</span>
          </div>
          <button type="button" className="button" onClick={saveWorkout}>
            Save workout
          </button>
        </section>
      )}

      {mainTab === 'activity' && (
        <>
      <section className="panel">
        <h2 className="panel-heading panel-heading--plain">Training history</h2>
        <p className="panel-subtle">Add past days or clear imported/sample data.</p>
        <HistoryBackfillPanel
          allExercises={allExercises}
          sessions={data.sessions}
          onPersist={({ sessions: nextSessions, stats: nextStats }) =>
            persist({ ...data, sessions: nextSessions, stats: nextStats })
          }
        />
      </section>

      <section className="panel">
        <h2 className="panel-heading panel-heading--plain">Progress</h2>
        <p className="panel-subtle">Totals since you started logging on this device.</p>
        <div className="stats-grid">
          <article className="stat-card">
            <h3>{totalWorkoutCount}</h3>
            <p>Workouts completed</p>
          </article>
          <article className="stat-card">
            <h3>{totalExerciseCompletions}</h3>
            <p>Total move completions</p>
          </article>
          <article className="stat-card">
            <h3>{totalTrackedSets}</h3>
            <p>Total sets logged</p>
          </article>
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-heading panel-heading--plain">Workout calendar</h2>
        <p className="prose-lead">
          Each day shows a <strong>color stripe</strong> for muscle areas you trained (per move: the muscles you checked when
          logging, or all muscles for older entries).
          Several colors means several areas the same day. Orange border = includes a logged workout; slate dashed = legacy
          sample only. Hover a date for details.
        </p>
        <WorkoutCalendar sessions={data.sessions} allExercises={allExercises} />
      </section>

      <section className="panel panel--compact">
        <h2 className="panel-heading panel-heading--plain">Recent sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="empty-text">No sessions logged yet.</p>
        ) : (
          <div className="small-list">
            {recentSessions.map((session) => (
              <div key={session.id} className="small-list-row">
                <span>
                  {formatDate(session.date)}{' '}
                  <small>
                    {isLegacySampleSessionId(session.id)
                      ? 'sample · '
                      : isImportedHistorySessionId(session.id)
                        ? 'imported · '
                        : ''}
                    {session.entries.length} moves completed
                  </small>
                </span>
                <small>{session.groups.join(', ')}</small>
              </div>
            ))}
          </div>
        )}
      </section>
        </>
      )}

      {mainTab === 'library' && (
        <>
      <section className="panel panel--compact">
        <h2 className="panel-heading panel-heading--plain">Custom moves</h2>
        <p className="panel-subtle">Add unlimited personal exercises to your local library.</p>
        <form className="custom-form" onSubmit={handleAddCustomExercise}>
          <input
            className="text-input"
            type="text"
            placeholder="e.g. Incline Smith Press"
            value={newExerciseName}
            onChange={(event) => setNewExerciseName(event.target.value)}
          />
          <select
            className="select-input"
            value={newExerciseGroup}
            onChange={(event) => setNewExerciseGroup(event.target.value as MuscleGroup)}
          >
            {MUSCLE_GROUPS.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>
          <button type="submit" className="button">
            Add custom move
          </button>
        </form>
      </section>

      <section className="panel" id="custom-plan-section">
        <h2 className="panel-heading panel-heading--plain">Saved routines (same as Plan tab)</h2>
        <p className="panel-subtle">
          Your routines also appear at the top of the <strong>Plan</strong> tab for quick loading and <strong>Review order</strong>{' '}
          between sets. Build moves on <strong>Plan → Moves</strong> (tap <strong>Add to today</strong>), then save here or use{' '}
          <strong>Save new routine</strong> on the Plan tab.
        </p>
        <p className="saved-plan-session-count" role="status">
          Moves in your current plan:{' '}
          <strong>{selectedExerciseIds.length}</strong>
          {selectedExerciseIds.length === 0 ? (
            <span className="saved-plan-session-hint"> — go to Plan → Moves first.</span>
          ) : null}
        </p>
        <div className="saved-plan-create-row">
          <button
            type="button"
            className="button"
            onClick={() => {
              requestAnimationFrame(() => {
                document.getElementById('custom-plan-form-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                document.getElementById('custom-plan-name')?.focus();
              });
            }}
          >
            Create custom plan
          </button>
        </div>
        <div id="custom-plan-form-wrap">
          <form
            className="saved-plan-form"
            onSubmit={(e) => {
              e.preventDefault();
              saveCurrentPlanTemplate();
            }}
          >
            <div className="saved-plan-save-row">
              <input
                id="custom-plan-name"
                className="text-input"
                type="text"
                placeholder="Name this plan (e.g. Push day A)"
                value={savePlanNameInput}
                onChange={(e) => setSavePlanNameInput(e.target.value)}
                aria-label="Name for custom plan"
                autoComplete="off"
              />
              <button type="submit" className="button">
                Save custom plan
              </button>
            </div>
          </form>
        </div>
        {data.savedPlans.length === 0 ? (
          <p className="empty-text" style={{ marginTop: '0.75rem' }}>
            No templates yet. Build a plan on the Plan tab, then save it here.
          </p>
        ) : (
          <ul className="saved-plan-list">
            {data.savedPlans.map((plan) => (
              <li key={plan.id} className="saved-plan-row">
                <div className="saved-plan-row-info">
                  <strong>{plan.name}</strong>
                  <span className="saved-plan-row-meta">
                    {plan.exerciseIds.length} moves · {formatDate(plan.createdAt)}
                  </span>
                </div>
                <div className="saved-plan-row-actions">
                  <button
                    type="button"
                    className="button button-small"
                    onClick={() => openRoutineWorkoutTab(plan.id)}
                  >
                    Use today
                  </button>
                  <button type="button" className="button button-muted button-small" onClick={() => loadSavedPlanTemplate(plan)}>
                    Log in planner
                  </button>
                  <button type="button" className="button button-muted button-small" onClick={() => beginEditSavedPlan(plan)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="button button-muted button-small"
                    onClick={() => {
                      if (window.confirm(`Delete routine “${plan.name}”?`)) deleteSavedPlanTemplate(plan.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel panel--data-reset" aria-label="Reset saved data">
        <h2 className="panel-heading panel-heading--plain">Data</h2>
        <p className="prose-lead">
          Removes workouts, stats, custom exercises, <strong>saved templates</strong>, and your current session. Nothing is
          uploaded — data lives only in this browser.
        </p>
        <button type="button" className="button button-danger" onClick={clearAllUserData}>
          Clear all my data
        </button>
      </section>
        </>
      )}
    </main>
    </div>
  );
}
