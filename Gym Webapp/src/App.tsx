import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from './data/exerciseLibrary';
import { BodyMapFigure } from './components/BodyMapFigure';
import { ExerciseYoutubeLink } from './components/ExerciseYoutubeLink';
import { getExerciseImageMap, type ExerciseImageMeta } from './services/exerciseImages';
import { getPracticeCountsInWindow } from './utils/practiceWindow';
import { migrateV1ToV2, STORAGE_V1, STORAGE_V2 } from './data/migrateStorage';
import {
  type CatalogSortMode,
  collectSortedUnique,
  compareCatalog,
  getEffectiveCategory,
  getEffectiveEquipment,
  labelForFilterValue,
  equipmentToSlug,
} from './utils/catalogSort';

const PRACTICE_WINDOW_DAYS = 10;

type ExerciseLogDraft = {
  completed: boolean;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
};

type ExerciseStat = {
  timesCompleted: number;
  totalSets: number;
  lastPerformed: string | null;
};

type WorkoutEntry = {
  exerciseId: string;
  sets: number;
  reps: string;
  weight: string;
  notes: string;
};

type WorkoutSession = {
  id: string;
  date: string;
  groups: MuscleGroup[];
  entries: WorkoutEntry[];
};

type PersistedData = {
  customExercises: Exercise[];
  stats: Record<string, ExerciseStat>;
  sessions: WorkoutSession[];
};

const defaultData: PersistedData = { customExercises: [], stats: {}, sessions: [] };

function loadData(): PersistedData {
  const v2 = localStorage.getItem(STORAGE_V2);
  if (v2) {
    try {
      const parsed = JSON.parse(v2) as PersistedData;
      return {
        customExercises: parsed.customExercises ?? [],
        stats: parsed.stats ?? {},
        sessions: parsed.sessions ?? [],
      };
    } catch {
      return defaultData;
    }
  }
  const v1 = localStorage.getItem(STORAGE_V1);
  if (v1) {
    try {
      const parsed = JSON.parse(v1) as PersistedData;
      const migrated = migrateV1ToV2({
        customExercises: parsed.customExercises ?? [],
        stats: parsed.stats ?? {},
        sessions: parsed.sessions ?? [],
      });
      localStorage.setItem(STORAGE_V2, JSON.stringify(migrated));
      return migrated;
    } catch {
      return defaultData;
    }
  }
  return defaultData;
}

function saveData(data: PersistedData) {
  localStorage.setItem(STORAGE_V2, JSON.stringify(data));
}

function exerciseMatchesGroups(exercise: Exercise, selectedGroups: MuscleGroup[]) {
  if (selectedGroups.length === 0) return true;
  if (selectedGroups.includes(exercise.primaryGroup)) return true;
  return exercise.secondaryGroups?.some((group) => selectedGroups.includes(group)) ?? false;
}

function createExerciseId(name: string) {
  return `custom-${name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;
}

function formatDate(dateValue: string | null) {
  if (!dateValue) return 'Never';
  return new Date(dateValue).toLocaleDateString();
}

function getDefaultDraft(): ExerciseLogDraft {
  return {
    completed: true,
    sets: 3,
    reps: '8-12',
    weight: '',
    notes: '',
  };
}

export default function App() {
  const [data, setData] = useState<PersistedData>(() => loadData());
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

  function persist(nextData: PersistedData) {
    setData(nextData);
    saveData(nextData);
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
    setSelectedExerciseIds((current) => {
      if (current.includes(exerciseId)) return current.filter((id) => id !== exerciseId);

      setExerciseDrafts((drafts) => ({
        ...drafts,
        [exerciseId]: drafts[exerciseId] ?? getDefaultDraft(),
      }));
      return [...current, exerciseId];
    });
  }

  function updateDraft(exerciseId: string, patch: Partial<ExerciseLogDraft>) {
    setExerciseDrafts((current) => ({
      ...current,
      [exerciseId]: {
        ...getDefaultDraft(),
        ...current[exerciseId],
        ...patch,
      },
    }));
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

  function saveWorkout() {
    const completedEntries = selectedExerciseIds
      .map((exerciseId) => ({ exerciseId, draft: exerciseDrafts[exerciseId] }))
      .filter((item) => item.draft?.completed)
      .map(({ exerciseId, draft }) => ({
        exerciseId,
        sets: Math.max(1, Number(draft?.sets ?? 1)),
        reps: draft?.reps.trim() ?? '',
        weight: draft?.weight.trim() ?? '',
        notes: draft?.notes.trim() ?? '',
      }));

    if (completedEntries.length === 0) {
      setMessage('Pick and complete at least one planned move before saving.');
      return;
    }

    const nowIso = new Date().toISOString();
    const autoGroups = new Set<MuscleGroup>(selectedGroups);
    completedEntries.forEach((entry) => {
      const exercise = exerciseById.get(entry.exerciseId);
      if (exercise) {
        autoGroups.add(exercise.primaryGroup);
      }
    });

    const nextStats = { ...data.stats };
    completedEntries.forEach((entry) => {
      const previous = nextStats[entry.exerciseId] ?? {
        timesCompleted: 0,
        totalSets: 0,
        lastPerformed: null,
      };
      nextStats[entry.exerciseId] = {
        timesCompleted: previous.timesCompleted + 1,
        totalSets: previous.totalSets + entry.sets,
        lastPerformed: nowIso,
      };
    });

    const nextSession: WorkoutSession = {
      id: `session-${Date.now()}`,
      date: nowIso,
      groups: Array.from(autoGroups),
      entries: completedEntries,
    };

    persist({
      ...data,
      stats: nextStats,
      sessions: [nextSession, ...data.sessions],
    });

    setSelectedExerciseIds([]);
    setExerciseDrafts({});
    setMessage(`Saved workout with ${completedEntries.length} completed moves.`);
  }

  return (
    <main className="app-shell" aria-label="Gym Flow workout planner">
      <section className="panel body-map-section" aria-label="Body map and plan filter">
        <div className="panel-title-row">
          <h2>1) Choose muscles for today</h2>
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
        <p className="empty-text" style={{ marginBottom: '0.65rem' }}>
          The map highlights <strong>muscle areas you have not hit in the last {PRACTICE_WINDOW_DAYS} days</strong> (red) vs at
          least one logged move there (gray). Each completed plan entry counts toward primary and secondary groups. Tap a region
          to filter the catalog; tap again to deselect. With nothing selected, all groups show in the list. After you pick
          muscles, a color-coded row lets you add one or more equipment filters (e.g. barbell or dumbbell or both).
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
        <div className="off-map-groups">
          <span className="off-map-label">Also filter (not on figure):</span>
          {(['Cardio', 'Mobility'] as const).map((g) => (
            <button
              key={g}
              type="button"
              className={`chip ${selectedGroups.includes(g) ? 'chip-active' : ''}`}
              onClick={() => toggleGroup(g)}
            >
              {g}
            </button>
          ))}
        </div>
        {selectedGroups.length > 0 && (
          <div
            className="equipment-pick"
            role="group"
            aria-label="Narrow by equipment, multiple choice"
          >
            <div className="equipment-pick-header">
              <p className="equipment-pick-title">Then narrow by equipment</p>
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
                    className={`chip equipment-visual equipment-visual--${slug} ${
                      active ? 'chip-active' : ''
                    }`}
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
        )}
      </section>

      <section className="panel">
        <div className="panel-title-row">
          <h2>2) Pick moves ({catalogMatches.length} matches)</h2>
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
        {selectedGroups.length > 0 && (
          <p className="catalog-equipment-remember" role="status">
            Equipment:{' '}
            {selectedEquipment.length === 0
              ? 'all types (step 1), or add chips to narrow'
              : `${selectedEquipment.map((e) => labelForFilterValue(e)).join(' · ')} — tap a chip in step 1 to change`}
          </p>
        )}
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

      <section className="panel">
        <h2>Custom move (unlimited)</h2>
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
        {message && <p className="status-text">{message}</p>}
      </section>

      <section className="panel">
        <h2>3) Today's plan ({planExercises.length} moves)</h2>
        {planExercises.length === 0 ? (
          <p className="empty-text">No moves in today&apos;s plan yet. Add some from the catalog.</p>
        ) : (
          <div className="plan-list">
            {planExercises.map((exercise) => {
              const draft = exerciseDrafts[exercise.id];
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

                  <div className="plan-grid">
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

      {planExercises.length > 0 && (
        <section className="sticky-save">
          <div>
            <strong>{planExercises.length} moves ready</strong>
            <span>Tap save after your session</span>
          </div>
          <button type="button" className="button" onClick={saveWorkout}>
            Save workout
          </button>
        </section>
      )}

      <section className="panel">
        <h2>Progress from day 1</h2>
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
        <h2>Recent sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="empty-text">No sessions logged yet.</p>
        ) : (
          <div className="small-list">
            {recentSessions.map((session) => (
              <div key={session.id} className="small-list-row">
                <span>
                  {formatDate(session.date)} <small>{session.entries.length} moves completed</small>
                </span>
                <small>{session.groups.join(', ')}</small>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
