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

} from './utils/catalogSort';
import { commitWorkoutSession } from './utils/commitWorkoutSession';
import { isLikelyDuplicateWorkoutSave } from './utils/recentDuplicateSave';
import {
  candidateMuscleGroupsForExercise,
  getDefaultDraft,
  getDefaultDraftForExercise,
  type ExerciseLogDraft,
} from './utils/workoutLogDraft';

const PRACTICE_WINDOW_DAYS = 10;

type AppView = 'home' | 'create-focus' | 'create-moves' | 'log' | 'activity' | 'library';

function exerciseMatchesGroups(exercise: Exercise, selectedGroups: MuscleGroup[]) {
  if (selectedGroups.length === 0) return true;
  if (selectedGroups.includes(exercise.primaryGroup)) return true;
  return exercise.secondaryGroups?.some((g) => selectedGroups.includes(g)) ?? false;
}

function orderedPlanEntries(plan: SavedPlan, allExercises: Exercise[]): { id: string; name: string }[] {
  const ids = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
  const map = new Map(allExercises.map((e) => [e.id, e]));
  return ids.map((id) => { const ex = map.get(id); return ex ? { id, name: ex.name } : null; })
    .filter((x): x is { id: string; name: string } => x !== null);
}

function createExerciseId(name: string) {
  return `custom-${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
}

function formatDate(d: string | null) {
  if (!d) return 'Never';
  return new Date(d).toLocaleDateString();
}

function daysAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return `${diff}d ago`;
}

function getLastUsedForPlan(plan: SavedPlan, stats: PersistedGymData['stats']): string | null {
  const dates = plan.exerciseIds.map((id) => stats[id]?.lastPerformed).filter((d): d is string => !!d);
  if (!dates.length) return null;
  return [...dates].sort().at(-1) ?? null;
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
  const [view, setView] = useState<AppView>('home');
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
  const [savePlanNameInput, setSavePlanNameInput] = useState('');
  const [activeRoutineName, setActiveRoutineName] = useState<string | null>(null);
  const [editingSavedPlanId, setEditingSavedPlanId] = useState<string | null>(null);

  const allExercises = useMemo(() => [...EXERCISE_LIBRARY, ...data.customExercises], [data.customExercises]);
  const exerciseById = useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);
  const categoryFilterOptions = useMemo(() => collectSortedUnique(allExercises.map((e) => getEffectiveCategory(e))), [allExercises]);
  const equipmentFilterOptions = useMemo(() => collectSortedUnique(allExercises.map((e) => getEffectiveEquipment(e))), [allExercises]);

  const catalogMatches = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const timesById: Record<string, number | undefined> = {};
    for (const [id, st] of Object.entries(data.stats)) timesById[id] = st.timesCompleted;
    return allExercises
      .filter((e) => exerciseMatchesGroups(e, selectedGroups))
      .filter((e) => filterWrkoutCategory === 'all' || getEffectiveCategory(e) === filterWrkoutCategory)
      .filter((e) => selectedEquipment.length === 0 || selectedEquipment.includes(getEffectiveEquipment(e)))
      .filter((e) => !term || e.name.toLowerCase().includes(term) || e.primaryGroup.toLowerCase().includes(term))
      .sort((a, b) => compareCatalog(a, b, catalogSort, timesById));
  }, [allExercises, catalogSort, data.stats, filterWrkoutCategory, selectedEquipment, searchTerm, selectedGroups]);

  const visibleExercises = useMemo(() => catalogMatches.slice(0, visibleExerciseCount), [catalogMatches, visibleExerciseCount]);
  const planExercises = useMemo(
    () => selectedExerciseIds.map((id) => exerciseById.get(id)).filter((e): e is Exercise => !!e),
    [exerciseById, selectedExerciseIds],
  );

  const totalWorkoutCount = data.sessions.length;
  const totalExerciseCompletions = Object.values(data.stats).reduce((t, s) => t + s.timesCompleted, 0);
  const totalTrackedSets = Object.values(data.stats).reduce((t, s) => t + s.totalSets, 0);
  const recentSessions = data.sessions.slice(0, 5);

  const practiceCounts = useMemo(
    () => getPracticeCountsInWindow(data.sessions, exerciseById, PRACTICE_WINDOW_DAYS),
    [data.sessions, exerciseById],
  );
  const trainedGroupsCount = useMemo(
    () => MUSCLE_GROUPS.filter((g) => (practiceCounts instanceof Map ? (practiceCounts.get(g) ?? 0) : ((practiceCounts as Record<string, number>)[g] ?? 0)) > 0).length,
    [practiceCounts],
  );

  const exercisesToResolveImages = useMemo(() => {
    const names = new Set([...visibleExercises.map((e) => e.name), ...planExercises.map((e) => e.name)]);
    return allExercises.filter((e) => names.has(e.name));
  }, [allExercises, planExercises, visibleExercises]);

  // Auto-dismiss toast after 4s
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(t);
  }, [message]);

  useEffect(() => {
    if (selectedGroups.length === 0) setSelectedEquipment([]);
  }, [selectedGroups.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  useEffect(() => {
    let cancelled = false;
    getExerciseImageMap(exercisesToResolveImages)
      .then((r) => { if (!cancelled) setExerciseImages((c) => ({ ...c, ...r })); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [exercisesToResolveImages]);

  function persist(next: PersistedGymData) {
    setData(next);
    savePersistedGymData(next);
  }

  function toggleGroup(group: MuscleGroup) {
    setSelectedGroups((c) => c.includes(group) ? c.filter((g) => g !== group) : [...c, group]);
    setVisibleExerciseCount(24);
  }

  function toggleEquipment(equip: string) {
    setSelectedEquipment((prev) =>
      prev.includes(equip)
        ? prev.filter((e) => e !== equip)
        : [...prev, equip].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    );
    setVisibleExerciseCount(24);
  }

  function toggleExerciseInPlan(exerciseId: string) {
    const wasIn = selectedExerciseIds.includes(exerciseId);
    setSelectedExerciseIds((c) => wasIn ? c.filter((id) => id !== exerciseId) : [...c, exerciseId]);
    if (wasIn) {
      setExerciseDrafts((d) => { const n = { ...d }; delete n[exerciseId]; return n; });
    } else {
      const ex = exerciseById.get(exerciseId);
      setExerciseDrafts((d) => ({ ...d, [exerciseId]: d[exerciseId] ?? getDefaultDraftForExercise(ex) }));
    }
  }

  function updateDraft(exerciseId: string, patch: Partial<ExerciseLogDraft>) {
    setExerciseDrafts((current) => {
      const ex = exerciseById.get(exerciseId);
      const merged: ExerciseLogDraft = { ...getDefaultDraft(), ...getDefaultDraftForExercise(ex), ...current[exerciseId], ...patch };
      if (ex) {
        const c = candidateMuscleGroupsForExercise(ex);
        const t = merged.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
        merged.trainedMuscleGroups = t.length > 0 ? t : [...c];
      }
      return { ...current, [exerciseId]: merged };
    });
  }

  function startCreatePlan(initialGroups: MuscleGroup[] = []) {
    setSelectedGroups(initialGroups);
    setSelectedEquipment([]);
    setSelectedExerciseIds([]);
    setExerciseDrafts({});
    setEditingSavedPlanId(null);
    setSavePlanNameInput('');
    setSearchTerm('');
    setVisibleExerciseCount(24);
    setView('create-focus');
  }

  function handleAddCustomExercise(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = newExerciseName.trim();
    if (name.length < 2) { setMessage('Name needs at least 2 characters.'); return; }
    if (allExercises.some((ex) => ex.name.toLowerCase() === name.toLowerCase())) { setMessage('Already in your library.'); return; }
    persist({ ...data, customExercises: [...data.customExercises, { id: createExerciseId(name), name, primaryGroup: newExerciseGroup }] });
    setNewExerciseName('');
    setMessage(`"${name}" added.`);
  }

  function clearAllUserData() {
    if (!window.confirm('Remove all workouts, stats, custom exercises, and saved plans? This cannot be undone.')) return;
    localStorage.removeItem(STORAGE_V1);
    persist(defaultGymData);
    setSelectedGroups([]); setSelectedEquipment([]); setSelectedExerciseIds([]); setExerciseDrafts({});
    setSearchTerm(''); setVisibleExerciseCount(24); setNewExerciseName(''); setSavePlanNameInput('');
    setView('home'); setActiveRoutineName(null); setEditingSavedPlanId(null);
    setMessage('All data cleared.');
  }

  function saveCurrentPlanTemplate() {
    const name = savePlanNameInput.trim();
    if (name.length < 2) { setMessage('Enter a plan name.'); return; }
    if (selectedExerciseIds.length === 0) { setMessage('Add at least one exercise.'); return; }

    if (editingSavedPlanId) {
      persist({
        ...data,
        savedPlans: data.savedPlans.map((p) =>
          p.id === editingSavedPlanId
            ? { ...p, exerciseIds: [...selectedExerciseIds], muscleGroups: [...selectedGroups], equipment: [...selectedEquipment] }
            : p,
        ),
      });
      setMessage(`"${name}" updated.`);
    } else {
      const plan: SavedPlan = {
        id: `tpl-${Date.now()}`, name, createdAt: new Date().toISOString(),
        exerciseIds: [...selectedExerciseIds], muscleGroups: [...selectedGroups], equipment: [...selectedEquipment],
      };
      persist({ ...data, savedPlans: [plan, ...data.savedPlans] });
      setMessage(`"${name}" saved.`);
    }
    setSavePlanNameInput(''); setSelectedExerciseIds([]); setExerciseDrafts({});
    setEditingSavedPlanId(null);
    setView('home');
  }

  function loadPlanForLog(plan: SavedPlan) {
    const validIds = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
    if (!validIds.length) { setMessage('No valid moves in this plan.'); return; }
    setSelectedGroups([...plan.muscleGroups]);
    setSelectedEquipment([...plan.equipment]);
    setSelectedExerciseIds(validIds);
    const drafts: Record<string, ExerciseLogDraft> = {};
    for (const id of validIds) {
      const ex = exerciseById.get(id);
      const m: ExerciseLogDraft = { ...getDefaultDraftForExercise(ex), ...exerciseDrafts[id] };
      if (ex) { const c = candidateMuscleGroupsForExercise(ex); const t = m.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? []; m.trainedMuscleGroups = t.length ? t : [...c]; }
      drafts[id] = m;
    }
    setExerciseDrafts(drafts);
    setActiveRoutineName(plan.name);
    setEditingSavedPlanId(null);
    setView('log');
  }

  function beginEditSavedPlan(plan: SavedPlan) {
    const validIds = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
    if (!validIds.length) { setMessage('No valid moves in this plan.'); return; }
    setSelectedGroups([...plan.muscleGroups]);
    setSelectedEquipment([...plan.equipment]);
    setSelectedExerciseIds(validIds);
    const drafts: Record<string, ExerciseLogDraft> = {};
    for (const id of validIds) {
      const ex = exerciseById.get(id);
      const m: ExerciseLogDraft = { ...getDefaultDraftForExercise(ex), ...exerciseDrafts[id] };
      if (ex) { const c = candidateMuscleGroupsForExercise(ex); const t = m.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? []; m.trainedMuscleGroups = t.length ? t : [...c]; }
      drafts[id] = m;
    }
    setExerciseDrafts(drafts);
    setEditingSavedPlanId(plan.id);
    setSavePlanNameInput(plan.name);
    setSearchTerm('');
    setVisibleExerciseCount(24);
    setActiveRoutineName(null);
    setView('create-moves');
  }

  function deleteSavedPlanTemplate(id: string) {
    persist({ ...data, savedPlans: data.savedPlans.filter((p) => p.id !== id) });
    if (editingSavedPlanId === id) setEditingSavedPlanId(null);
    setMessage('Plan deleted.');
  }

  function saveWorkout() {
    const includedIds = selectedExerciseIds.filter((id) => exerciseDrafts[id]?.completed);
    if (includedIds.length > 0 && isLikelyDuplicateWorkoutSave(data.sessions, includedIds) && !window.confirm('Looks like a duplicate — save anyway?')) return;
    const result = commitWorkoutSession({ data, exerciseOrderIds: selectedExerciseIds, exerciseDrafts, exerciseById });
    if (!result.ok) { setMessage(result.error); return; }
    persist(result.nextData);
    setSelectedExerciseIds([]); setExerciseDrafts({});
    setView('activity');
    setActiveRoutineName(null); setEditingSavedPlanId(null);
    setMessage(`${result.completedCount} move${result.completedCount === 1 ? '' : 's'} saved.`);
  }

  const isMainView = view === 'home' || view === 'activity' || view === 'library';

  return (
    <div className="app-layout">
      <a className="skip-link" href="#app-main">Skip to content</a>

      {/* Toast notification */}
      {message && (
        <div className="toast" role="status" onClick={() => setMessage('')}>
          {message}
        </div>
      )}

      <main id="app-main" className="app-shell">

        {/* ── HOME ──────────────────────────────────────────────────── */}
        {view === 'home' && (
          <div className="home-view">
            <div className="home-wordmark">Gym Flow</div>

            {/* MY PLANS */}
            <section className="home-section" aria-label="My Plans">
              <div className="home-section-header">
                <span className="home-section-label">MY PLANS</span>
                <button className="icon-add-btn" onClick={() => startCreatePlan()} aria-label="New plan">+</button>
              </div>

              {data.savedPlans.length === 0 ? (
                <button className="create-plan-empty" onClick={() => startCreatePlan()}>
                  <span className="create-plan-empty-icon">+</span>
                  <span>Create your first plan</span>
                </button>
              ) : (
                <ul className="plan-card-list">
                  {data.savedPlans.map((plan) => {
                    const entries = orderedPlanEntries(plan, allExercises);
                    const lastUsed = getLastUsedForPlan(plan, data.stats);
                    return (
                      <li key={plan.id} className="plan-card-home">
                        <div className="plan-card-home-row">
                          <div className="plan-card-home-info">
                            <span className="plan-card-home-name">{plan.name}</span>
                            <span className="plan-card-home-sub">
                              {entries.length} moves{lastUsed ? ` · ${daysAgo(lastUsed)}` : ''}
                            </span>
                            {plan.muscleGroups.length > 0 && (
                              <div className="plan-card-home-muscles">
                                {plan.muscleGroups.slice(0, 4).map((g) => (
                                  <span key={g} className="muscle-chip-sm">{g}</span>
                                ))}
                                {plan.muscleGroups.length > 4 && (
                                  <span className="muscle-chip-sm muscle-chip-sm--more">+{plan.muscleGroups.length - 4}</span>
                                )}
                              </div>
                            )}
                          </div>
                          <button className="btn-start" onClick={() => openRoutineWorkoutTab(plan.id)}>
                            Start
                          </button>
                        </div>
                        <div className="plan-card-home-actions">
                          <button className="plan-action-btn" onClick={() => loadPlanForLog(plan)}>Quick log</button>
                          <button className="plan-action-btn" onClick={() => beginEditSavedPlan(plan)}>Edit</button>
                          <button
                            className="plan-action-btn plan-action-btn--danger"
                            onClick={() => { if (window.confirm(`Delete "${plan.name}"?`)) deleteSavedPlanTemplate(plan.id); }}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* 10-DAY REPORT */}
            <section className="home-section" aria-label="10-day training report">
              <div className="home-section-header">
                <span className="home-section-label">10-DAY REPORT</span>
                <span className="home-section-sub">{trainedGroupsCount}/{MUSCLE_GROUPS.length} groups trained</span>
              </div>
              <div className="report-card">
                <BodyMapFigure
                  practiceCounts={practiceCounts}
                  practiceWindowDays={PRACTICE_WINDOW_DAYS}
                  selectedGroups={[]}
                  onToggleGroup={(group) => startCreatePlan([group])}
                />
                <div className="report-footer">
                  <div className="report-legend-row">
                    <span className="legend-item"><span className="legend-dot legend-dot--red" />Needs work</span>
                    <span className="legend-item"><span className="legend-dot legend-dot--orange" />Once</span>
                    <span className="legend-item"><span className="legend-dot legend-dot--green" />2+ sessions</span>
                  </div>
                  <p className="report-hint">Tap a region to plan that muscle group</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── CREATE: FOCUS ─────────────────────────────────────────── */}
        {view === 'create-focus' && (
          <div className="subview">
            <div className="view-header">
              <button className="view-back" onClick={() => { setSelectedGroups([]); setSelectedEquipment([]); setView('home'); }}>← Back</button>
              <h1 className="view-title">{editingSavedPlanId ? 'Edit Plan' : 'New Plan'}</h1>
              <button className="view-next" onClick={() => setView('create-moves')}>Next →</button>
            </div>
            <p className="view-hint">Tap a muscle to focus the exercise list, or skip.</p>
            <BodyMapFigure
              practiceCounts={practiceCounts}
              practiceWindowDays={PRACTICE_WINDOW_DAYS}
              selectedGroups={selectedGroups}
              onToggleGroup={toggleGroup}
            />
            {selectedGroups.length > 0 && (
              <div className="selected-chips-row">
                {selectedGroups.map((g) => (
                  <button key={g} type="button" className="chip chip-active" onClick={() => toggleGroup(g)}>
                    {g} ✕
                  </button>
                ))}
                <button type="button" className="text-button" onClick={() => { setSelectedGroups([]); setSelectedEquipment([]); }}>
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CREATE: MOVES ─────────────────────────────────────────── */}
        {view === 'create-moves' && (
          <div className="subview">
            <div className="view-header">
              <button className="view-back" onClick={() => setView('create-focus')}>← Back</button>
              <h1 className="view-title">Pick Moves</h1>
              <span className="view-badge">{selectedExerciseIds.length} added</span>
            </div>

            <div className="moves-toolbar">
              <input
                className="search-input"
                type="search"
                placeholder="Search exercises…"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setVisibleExerciseCount(24); }}
                aria-label="Search exercise catalog"
              />
              <div className="equipment-scroll" role="group" aria-label="Filter by equipment">
                {equipmentFilterOptions.map((eq) => {
                  const active = selectedEquipment.includes(eq);
                  return (
                    <button
                      key={eq}
                      type="button"
                      className={`chip ${active ? 'chip-active' : ''}`}
                      aria-pressed={active}
                      onClick={() => toggleEquipment(eq)}
                    >
                      {labelForFilterValue(eq)}
                    </button>
                  );
                })}
              </div>
              <div className="catalog-filters-row">
                <select className="select-input" value={catalogSort} onChange={(e) => { setCatalogSort(e.target.value as CatalogSortMode); setVisibleExerciseCount(24); }}>
                  <option value="gym">Common first</option>
                  <option value="mostUsed">Most used</option>
                  <option value="leastUsed">Least used</option>
                  <option value="a-z">A–Z</option>
                  <option value="z-a">Z–A</option>
                </select>
                <select className="select-input" value={filterWrkoutCategory} onChange={(e) => { setFilterWrkoutCategory(e.target.value); setVisibleExerciseCount(24); }}>
                  <option value="all">All types</option>
                  {categoryFilterOptions.map((c) => <option key={c} value={c}>{labelForFilterValue(c)}</option>)}
                </select>
              </div>
            </div>

            <div className="exercise-grid">
              {visibleExercises.map((exercise) => {
                const selected = selectedExerciseIds.includes(exercise.id);
                const trainedCount = data.stats[exercise.id]?.timesCompleted ?? 0;
                return (
                  <article key={exercise.id} className="exercise-card">
                    <ExerciseYoutubeLink exerciseName={exercise.name} className="exercise-youtube exercise-youtube--image">
                      {exerciseImages[exercise.name] ? (
                        <img src={exerciseImages[exercise.name].url} alt={`${exercise.name} demo`} className="exercise-image" loading="lazy" />
                      ) : (
                        <div className="exercise-image-fallback">{exercise.primaryGroup}</div>
                      )}
                    </ExerciseYoutubeLink>
                    <div>
                      <h3>
                        <ExerciseYoutubeLink exerciseName={exercise.name} className="exercise-youtube exercise-youtube--title">
                          {exercise.name}
                        </ExerciseYoutubeLink>
                      </h3>
                      <p className="meta">{exercise.primaryGroup}{exercise.secondaryGroups?.length ? ` + ${exercise.secondaryGroups.join(', ')}` : ''}</p>
                      <p className="meta meta--dataset">{labelForFilterValue(getEffectiveCategory(exercise))} · {labelForFilterValue(getEffectiveEquipment(exercise))}</p>
                      <p className="meta">Done: {trainedCount}×</p>
                      {selected && <MuscleTargetPick exercise={exercise} draft={exerciseDrafts[exercise.id]} onPatch={(p) => updateDraft(exercise.id, p)} />}
                    </div>
                    <button type="button" className={`button ${selected ? 'button-muted' : ''}`} onClick={() => toggleExerciseInPlan(exercise.id)}>
                      {selected ? 'Remove' : 'Add'}
                    </button>
                  </article>
                );
              })}
            </div>

            {visibleExerciseCount < catalogMatches.length && (
              <button type="button" className="button button-block" style={{ margin: '0 1rem 1rem' }} onClick={() => setVisibleExerciseCount((v) => v + 24)}>
                Show more
              </button>
            )}

            {/* Save plan bar — sticky bottom */}
            {selectedExerciseIds.length > 0 && (
              <div className="save-plan-bar">
                <input
                  className="text-input plan-name-input"
                  type="text"
                  placeholder="Plan name…"
                  value={savePlanNameInput}
                  onChange={(e) => setSavePlanNameInput(e.target.value)}
                  aria-label="Plan name"
                  autoComplete="off"
                />
                <button type="button" className="button" onClick={saveCurrentPlanTemplate}>
                  {editingSavedPlanId ? 'Update' : 'Save plan'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── LOG ───────────────────────────────────────────────────── */}
        {view === 'log' && (
          <div className="subview">
            <div className="view-header">
              <button className="view-back" onClick={() => { setSelectedExerciseIds([]); setExerciseDrafts({}); setActiveRoutineName(null); setView('home'); }}>← Back</button>
              <h1 className="view-title">{activeRoutineName ?? 'Quick Log'}</h1>
            </div>
            <p className="view-hint">Check the moves you complete, then save.</p>
            <div className="plan-list">
              {planExercises.map((exercise) => {
                const draft = exerciseDrafts[exercise.id];
                const isCardio = getEffectiveCategory(exercise) === 'cardio';
                return (
                  <article key={exercise.id} className="plan-card">
                    <div className="plan-heading">
                      <h3>
                        <ExerciseYoutubeLink exerciseName={exercise.name} className="exercise-youtube exercise-youtube--title">
                          {exercise.name}
                        </ExerciseYoutubeLink>
                      </h3>
                      <label className="checkbox">
                        <input type="checkbox" checked={draft?.completed ?? false} onChange={(e) => updateDraft(exercise.id, { completed: e.target.checked })} />
                        Done
                      </label>
                    </div>
                    <MuscleTargetPick exercise={exercise} draft={draft} onPatch={(p) => updateDraft(exercise.id, p)} />
                    <div className="plan-grid">
                      {isCardio ? (
                        <label className="plan-grid-full">
                          Minutes
                          <input type="text" inputMode="numeric" placeholder="e.g. 20" value={draft?.reps ?? '20'} onChange={(e) => updateDraft(exercise.id, { reps: e.target.value, sets: 1 })} />
                        </label>
                      ) : (
                        <>
                          <label>Sets<input type="number" min={1} value={draft?.sets ?? 3} onChange={(e) => updateDraft(exercise.id, { sets: Number(e.target.value) || 1 })} /></label>
                          <label>Reps<input type="text" value={draft?.reps ?? '8-12'} onChange={(e) => updateDraft(exercise.id, { reps: e.target.value })} /></label>
                          <label>Weight<input type="text" placeholder="35kg" value={draft?.weight ?? ''} onChange={(e) => updateDraft(exercise.id, { weight: e.target.value })} /></label>
                        </>
                      )}
                    </div>
                    <label>Notes<input type="text" placeholder="tempo, rest…" value={draft?.notes ?? ''} onChange={(e) => updateDraft(exercise.id, { notes: e.target.value })} /></label>
                    {exerciseImages[exercise.name] && <p className="image-credit">{exerciseImages[exercise.name].credit}</p>}
                  </article>
                );
              })}
            </div>
            {planExercises.length > 0 && (
              <section className="sticky-save" aria-label="Save workout">
                <div className="sticky-save-copy">
                  <strong>{planExercises.length} moves</strong>
                  <span>Save when done</span>
                </div>
                <button type="button" className="button" onClick={saveWorkout}>Save workout</button>
              </section>
            )}
          </div>
        )}

        {/* ── ACTIVITY ──────────────────────────────────────────────── */}
        {view === 'activity' && (
          <>
            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Training history</h2>
              <HistoryBackfillPanel allExercises={allExercises} sessions={data.sessions} onPersist={({ sessions: s, stats: st }) => persist({ ...data, sessions: s, stats: st })} />
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Progress</h2>
              <div className="stats-grid">
                <article className="stat-card"><h3>{totalWorkoutCount}</h3><p>Workouts</p></article>
                <article className="stat-card"><h3>{totalExerciseCompletions}</h3><p>Completions</p></article>
                <article className="stat-card"><h3>{totalTrackedSets}</h3><p>Sets</p></article>
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Calendar</h2>
              <WorkoutCalendar sessions={data.sessions} allExercises={allExercises} />
            </section>

            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Recent sessions</h2>
              {recentSessions.length === 0 ? (
                <p className="empty-text">No sessions yet.</p>
              ) : (
                <div className="small-list">
                  {recentSessions.map((session) => (
                    <div key={session.id} className="small-list-row">
                      <span>
                        {formatDate(session.date)}{' '}
                        <small>
                          {isLegacySampleSessionId(session.id) ? 'sample · ' : isImportedHistorySessionId(session.id) ? 'imported · ' : ''}
                          {session.entries.length} moves
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

        {/* ── LIBRARY ───────────────────────────────────────────────── */}
        {view === 'library' && (
          <>
            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Custom moves</h2>
              <p className="panel-subtle">Add personal exercises to your library.</p>
              <form className="custom-form" onSubmit={handleAddCustomExercise}>
                <input className="text-input" type="text" placeholder="e.g. Incline Smith Press" value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} />
                <select className="select-input" value={newExerciseGroup} onChange={(e) => setNewExerciseGroup(e.target.value as MuscleGroup)}>
                  {MUSCLE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <button type="submit" className="button">Add</button>
              </form>
              {data.customExercises.length > 0 && (
                <ul className="custom-exercise-list">
                  {data.customExercises.map((ex) => (
                    <li key={ex.id} className="custom-exercise-item">
                      <span>{ex.name}</span>
                      <span className="saved-routine-quick-meta">{ex.primaryGroup}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel panel--data-reset" aria-label="Reset data">
              <h2 className="panel-heading panel-heading--plain">Data</h2>
              <p className="prose-lead">Removes all workouts, stats, custom exercises, and saved plans. Lives only in this browser.</p>
              <button type="button" className="button button-danger" onClick={clearAllUserData}>Clear all my data</button>
            </section>
          </>
        )}

      </main>

      {/* ── BOTTOM NAV (main views only) ─────────────────────────── */}
      {isMainView && (
        <nav className="bottom-nav" aria-label="Main navigation">
          <button className={`bnav-btn ${view === 'home' ? 'bnav-btn--active' : ''}`} onClick={() => setView('home')}>
            <span className="bnav-icon">🏋️</span>
            <span className="bnav-label">Plans</span>
          </button>
          <button className={`bnav-btn ${view === 'activity' ? 'bnav-btn--active' : ''}`} onClick={() => setView('activity')}>
            <span className="bnav-icon">📊</span>
            <span className="bnav-label">Activity</span>
          </button>
          <button className={`bnav-btn ${view === 'library' ? 'bnav-btn--active' : ''}`} onClick={() => setView('library')}>
            <span className="bnav-icon">⚙️</span>
            <span className="bnav-label">Library</span>
          </button>
        </nav>
      )}
    </div>
  );
}
