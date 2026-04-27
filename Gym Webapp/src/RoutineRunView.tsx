import { useEffect, useMemo, useState } from 'react';
import { EXERCISE_LIBRARY } from './data/exerciseLibrary';
import type { Exercise } from './data/exerciseLibrary';
import { loadPersistedGymData, type PersistedGymData } from './data/gymFlowStorage';
import { resolvePlanExerciseIdsToCatalog, STORAGE_V2 } from './data/migrateStorage';
import { ExerciseYoutubeLink } from './components/ExerciseYoutubeLink';
import { getExerciseImageMap, type ExerciseImageMeta } from './services/exerciseImages';

type Props = { planId: string };

export function RoutineRunView({ planId }: Props) {
  const [data, setData] = useState<PersistedGymData>(() => loadPersistedGymData());
  const [images, setImages] = useState<Record<string, ExerciseImageMeta>>({});

  const allExercises = useMemo(
    () => [...EXERCISE_LIBRARY, ...data.customExercises],
    [data.customExercises],
  );

  const plan = data.savedPlans.find((p) => p.id === planId);

  const exercises = useMemo((): Exercise[] => {
    if (!plan) return [];
    const ids = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
    const map = new Map(allExercises.map((e) => [e.id, e]));
    return ids.map((id) => map.get(id)).filter((e): e is Exercise => !!e);
  }, [plan, allExercises]);

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
            {exercises.length} moves · reference for your session (images update if you edit the routine elsewhere)
          </p>
        </div>
        <a className="button button-muted routine-run-planner-link" href={plannerHref}>
          Open planner to log
        </a>
      </header>
      <ol className="routine-run-list">
        {exercises.map((ex, index) => (
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
          </li>
        ))}
      </ol>
    </div>
  );
}
