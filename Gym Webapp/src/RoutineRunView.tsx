import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  History,
  Layers,
  Library,
} from 'lucide-react';
import { EXERCISE_LIBRARY } from './data/exerciseLibrary';
import type { Exercise } from './data/exerciseLibrary';
import {
  loadPersistedGymData,
  savePersistedGymData,
  loadQuickPlanFromLocalStorage,
  clearQuickPlanFromLocalStorage,
  type PersistedGymData,
  type SavedPlan,
} from './data/gymFlowStorage';
import { resolvePlanExerciseIdsToCatalog } from './data/migrateStorage';
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
  trainedGroupsValidForExercise,
  type ExerciseLogDraft,
} from './utils/workoutLogDraft';
import { buildPresetPlans } from './data/presetPlans';
import { getAlternativeExercises } from './utils/exerciseAlternatives';
import { hydrateFromCloudIfSignedIn } from './utils/cloudSync';

type Props = { planId: string };

const AUTO_ADVANCE_KEY = 'gf-routine-auto-advance';
/** Drafts live in localStorage so they survive a screen-lock / PWA reload. Anything older than 36h is ignored. */
const DRAFT_TTL_MS = 36 * 60 * 60 * 1000;

function routineDraftStorageKey(planId: string) {
  return `gf-routine-draft:${planId}`;
}

function readDraftFromStorage(key: string): string | null {
  for (const store of [localStorage, sessionStorage]) {
    try {
      const raw = store.getItem(key);
      if (!raw) continue;
      // Check TTL wrapper.
      try {
        const outer = JSON.parse(raw) as { savedAt?: number; payload?: string };
        if (typeof outer.savedAt === 'number' && typeof outer.payload === 'string') {
          if (Date.now() - outer.savedAt > DRAFT_TTL_MS) {
            try { store.removeItem(key); } catch { /* ignore */ }
            continue;
          }
          return outer.payload;
        }
      } catch { /* fall through — treat raw as legacy plain JSON */ }
      return raw;
    } catch { /* ignore */ }
  }
  return null;
}

function writeDraftToStorage(key: string, payload: string): void {
  const wrapped = JSON.stringify({ savedAt: Date.now(), payload });
  try {
    localStorage.setItem(key, wrapped);
    // Remove legacy copy from sessionStorage if present.
    try { sessionStorage.removeItem(key); } catch { /* ignore */ }
  } catch {
    // localStorage full / private mode — fall back to sessionStorage.
    try { sessionStorage.setItem(key, payload); } catch { /* ignore */ }
  }
}

function removeDraftFromStorage(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
  try { sessionStorage.removeItem(key); } catch { /* ignore */ }
}

function readAutoAdvancePref(): boolean {
  try {
    const v = sessionStorage.getItem(AUTO_ADVANCE_KEY);
    if (v === null) return true;
    return v === '1' || v === 'true';
  } catch {
    return true;
  }
}

function isStoredRoutineDraft(d: unknown): d is ExerciseLogDraft {
  return typeof d === 'object' && d !== null && 'completed' in d && 'sets' in d && 'reps' in d;
}

function closeOpenRoutineDetails() {
  if (typeof document === 'undefined') return;
  document.querySelectorAll('.routine-run-card details[open]').forEach((el) => {
    el.removeAttribute('open');
  });
}

function formatShortDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RoutineRunView({ planId }: Props) {
  const [data, setData] = useState<PersistedGymData>(() => loadPersistedGymData());
  const dataRef = useRef(data);
  dataRef.current = data;
  const [images, setImages] = useState<Record<string, ExerciseImageMeta>>({});
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseLogDraft>>({});
  const [saveMessage, setSaveMessage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [autoAdvanceOnInclude, setAutoAdvanceOnInclude] = useState(readAutoAdvancePref);
  /** When set, same length as base plan order — replaces catalog order for this session only. */
  const [sessionOrderIds, setSessionOrderIds] = useState<string[] | null>(null);
  /** Browse-all mode in the swap section — show all exercises not just same-muscle. */
  const [swapBrowseAll, setSwapBrowseAll] = useState(false);
  const [swapSearch, setSwapSearch] = useState('');
  const [swapBrowseLimit, setSwapBrowseLimit] = useState(20);
  /** Rest timer state */
  const [restSecondsLeft, setRestSecondsLeft] = useState<number | null>(null);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Inline confirm dialog */
  const [rrConfirmDialog, setRrConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  function rrShowConfirm(msg: string, onConfirm: () => void) {
    setRrConfirmDialog({ message: msg, onConfirm });
  }
  const prevPlanIdForInitRef = useRef<string | null>(null);

  function startRestTimer(seconds: number) {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestSecondsLeft(seconds);
    restIntervalRef.current = setInterval(() => {
      setRestSecondsLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(restIntervalRef.current!);
          restIntervalRef.current = null;
          if (prev === 1) {
            try { navigator.vibrate?.([200, 100, 200]); } catch { /* ignore */ }
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRestTimer() {
    if (restIntervalRef.current) { clearInterval(restIntervalRef.current); restIntervalRef.current = null; }
    setRestSecondsLeft(null);
  }

  const allExercises = useMemo(
    () => [...EXERCISE_LIBRARY, ...data.customExercises],
    [data.customExercises],
  );

  const exerciseById = useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);
  const allPresets = useMemo(() => buildPresetPlans(allExercises).flatMap(g => g.plans), [allExercises]);

  const plan = useMemo(
    () =>
      data.savedPlans.find((p) => p.id === planId)
      || allPresets.find((p) => p.id === planId)
      || (planId === 'gf-quick-active' ? loadQuickPlanFromLocalStorage() : null)
      || undefined,
    // loadQuickPlanFromLocalStorage is stable (reads localStorage) — only re-run when plan list or presets change
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.savedPlans, allPresets, planId],
  );

  const baseResolvedIds = useMemo(() => {
    if (!plan) return [];
    return resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
  }, [plan, allExercises]);

  const effectiveOrderIds = useMemo(() => {
    if (!plan || baseResolvedIds.length === 0) return [];
    if (
      !sessionOrderIds ||
      sessionOrderIds.length !== baseResolvedIds.length ||
      !sessionOrderIds.every((id) => exerciseById.has(id))
    ) {
      return baseResolvedIds;
    }
    return sessionOrderIds;
  }, [plan, baseResolvedIds, sessionOrderIds, exerciseById]);

  const exercises = useMemo((): Exercise[] => {
    const map = new Map(allExercises.map((e) => [e.id, e]));
    return effectiveOrderIds.map((id) => map.get(id)).filter((e): e is Exercise => !!e);
  }, [allExercises, effectiveOrderIds]);

  const exerciseIdsKey = exercises.map((e) => e.id).join(',');

  const isUserSavedPlan = useMemo(() => data.savedPlans.some((p) => p.id === planId), [data.savedPlans, planId]);

  const prevPlanIdForSessionOverrideRef = useRef<string | null>(null);
  useEffect(() => {
    if (!plan) return;
    if (prevPlanIdForSessionOverrideRef.current !== null && prevPlanIdForSessionOverrideRef.current !== plan.id) {
      setSessionOrderIds(null);
    }
    prevPlanIdForSessionOverrideRef.current = plan.id;
  }, [plan?.id]);

  useLayoutEffect(() => {
    if (!plan || baseResolvedIds.length === 0) return;
    try {
      const raw = readDraftFromStorage(routineDraftStorageKey(plan.id));
      if (!raw) return;
      const p = JSON.parse(raw) as {
        sessionOrderIds?: string[];
        exerciseIdsKey?: string;
      };
      if (!Array.isArray(p.sessionOrderIds) || p.sessionOrderIds.length !== baseResolvedIds.length) return;
      const catalog = [...EXERCISE_LIBRARY, ...dataRef.current.customExercises];
      const allowed = new Set(catalog.map((e) => e.id));
      if (!p.sessionOrderIds.every((id) => allowed.has(id))) return;
      if (p.exerciseIdsKey !== p.sessionOrderIds.join(',')) return;
      if (p.sessionOrderIds.join(',') === baseResolvedIds.join(',')) return;
      setSessionOrderIds((prev) => {
        if (prev && prev.join(',') === p.sessionOrderIds!.join(',')) return prev;
        return [...p.sessionOrderIds!];
      });
    } catch {
      /* ignore */
    }
  }, [plan?.id, baseResolvedIds.join(',')]);

  const exerciseAlternatives = useMemo(() => {
    const ex = exercises[currentIndex];
    if (!ex) return [];
    return getAlternativeExercises(ex, allExercises, { limit: 12 });
  }, [currentIndex, exercises, allExercises]);

  /** All exercises sorted by primary group then name, filtered by swapSearch, excluding current. */
  const swapBrowseList = useMemo(() => {
    const cur = exercises[currentIndex];
    const q = swapSearch.trim().toLowerCase();
    return allExercises
      .filter((e) => e.id !== cur?.id)
      .filter((e) => {
        if (!q) return true;
        return (
          e.name.toLowerCase().includes(q) ||
          e.primaryGroup.toLowerCase().includes(q) ||
          (e.secondaryGroups ?? []).some((g) => g.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const pg = a.primaryGroup.localeCompare(b.primaryGroup);
        if (pg !== 0) return pg;
        return a.name.localeCompare(b.name);
      });
  }, [currentIndex, exercises, allExercises, swapSearch]);

  const persist = useCallback((next: PersistedGymData) => {
    setData(next);
    savePersistedGymData(next);
  }, []);

  const cloudHydratedRef = useRef(false);
  useEffect(() => {
    if (cloudHydratedRef.current) return;
    cloudHydratedRef.current = true;
    void hydrateFromCloudIfSignedIn(() => dataRef.current, (merged) => {
      setData(merged);
    });
  }, []);

  /** Init drafts: restore in-progress session from sessionStorage, else plan muscle targets + last history. */
  useEffect(() => {
    if (exercises.length === 0 || !plan) return;
    const fresh = dataRef.current;
    const planChanged = prevPlanIdForInitRef.current !== plan.id;
    prevPlanIdForInitRef.current = plan.id;

    let restoredDrafts: Record<string, ExerciseLogDraft> | null = null;
    let restoredIndex: number | null = null;
    try {
      const raw = readDraftFromStorage(routineDraftStorageKey(plan.id));
      if (raw) {
        const p = JSON.parse(raw) as {
          exerciseIdsKey?: string;
          drafts?: Record<string, ExerciseLogDraft>;
          currentIndex?: number;
        };
        if (p.exerciseIdsKey === exerciseIdsKey && p.drafts && typeof p.drafts === 'object') {
          restoredDrafts = p.drafts;
          if (typeof p.currentIndex === 'number') restoredIndex = p.currentIndex;
        }
      }
    } catch {
      /* ignore */
    }

    setExerciseDrafts((prev) => {
      const next: Record<string, ExerciseLogDraft> = restoredDrafts ? { ...restoredDrafts } : { ...prev };
      const keep = new Set(exercises.map((e) => e.id));
      for (const id of Object.keys(next)) {
        if (!keep.has(id)) delete next[id];
      }
      for (const ex of exercises) {
        if (isStoredRoutineDraft(next[ex.id])) continue;
        const d = getDefaultDraftForExercise(ex, plan.exerciseMuscleTargets?.[ex.id]);
        const hist = getRecentLogsForExercise(fresh.sessions, ex.id, 1)[0];
        if (hist) {
          if (hist.weight.trim()) d.weight = hist.weight;
          if (hist.reps.trim()) d.reps = hist.reps;
          d.sets = hist.sets >= 1 ? hist.sets : d.sets;
          const validM = trainedGroupsValidForExercise(ex, hist.trainedMuscleGroups);
          if (validM.length) d.trainedMuscleGroups = validM;
        }
        next[ex.id] = d;
      }
      return next;
    });
    if (restoredIndex !== null && restoredIndex >= 0 && restoredIndex < exercises.length) {
      setCurrentIndex(restoredIndex);
    } else if (planChanged) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex((i) => Math.min(Math.max(0, i), exercises.length - 1));
    }
    if (planChanged) setSaveMessage('');
  }, [exerciseIdsKey, plan?.id]);

  /** Persist log fields + position while the routine tab is open (debounced). */
  useEffect(() => {
    if (!plan || exercises.length === 0) return;
    const gotAll = exercises.every((e) => exerciseDrafts[e.id] != null);
    if (!gotAll) return;
    const t = window.setTimeout(() => {
      writeDraftToStorage(
        routineDraftStorageKey(plan.id),
        JSON.stringify({
          exerciseIdsKey,
          sessionOrderIds: sessionOrderIds ?? undefined,
          drafts: exerciseDrafts,
          currentIndex,
        }),
      );
    }, 400);
    return () => window.clearTimeout(t);
  }, [plan?.id, exerciseIdsKey, exerciseDrafts, currentIndex, exercises, sessionOrderIds]);

  useEffect(() => {
    const ex = exercises[currentIndex];
    const notes = ex ? exerciseDrafts[ex.id]?.notes : '';
    setShowNotes(!!notes);
  }, [currentIndex, exercises, exerciseDrafts]);

  useEffect(() => {
    setMediaExpanded(false);
    setSwapBrowseAll(false);
    setSwapSearch('');
    setSwapBrowseLimit(20);
  }, [currentIndex]);

  useEffect(() => {
    if (plan) document.title = `${plan.name} · Gym Flow`;
  }, [plan]);

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

  useEffect(() => {
    let cancelled = false;
    if (exerciseAlternatives.length === 0) return;
    getExerciseImageMap(exerciseAlternatives)
      .then((result) => {
        if (!cancelled) setImages((prev) => ({ ...prev, ...result }));
      })
      .catch(() => {
        if (!cancelled) {
          /* keep existing map */
        }
      });
    return () => {
      cancelled = true;
    };
  }, [exerciseAlternatives]);

  function updateDraft(exerciseId: string, patch: Partial<ExerciseLogDraft>) {
    setExerciseDrafts((current) => {
      const ex = exerciseById.get(exerciseId);
      const merged: ExerciseLogDraft = {
        ...getDefaultDraft(),
        ...getDefaultDraftForExercise(ex, plan ? plan.exerciseMuscleTargets?.[exerciseId] : undefined),
        ...current[exerciseId],
        ...patch,
      };
      if (ex) {
        const c = candidateMuscleGroupsForExercise(ex);
        let t = trainedGroupsValidForExercise(ex, merged.trainedMuscleGroups);
        if (c.length === 1 && t.length === 0) t = [...c];
        merged.trainedMuscleGroups = t;
      }
      return { ...current, [exerciseId]: merged };
    });
  }

  function swapExerciseForToday(alt: Exercise) {
    if (!plan || exercises.length === 0) return;
    const cur = exercises[currentIndex];
    if (!cur || cur.id === alt.id) return;
    if (baseResolvedIds.length !== exercises.length) return;
    const row = sessionOrderIds ?? [...baseResolvedIds];
    if (currentIndex < 0 || currentIndex >= row.length) return;
    const oldId = row[currentIndex];
    const nextRow = [...row];
    nextRow[currentIndex] = alt.id;
    closeOpenRoutineDetails();
    setSessionOrderIds(nextRow);
    setMediaExpanded(false);
    setExerciseDrafts((drafts) => {
      const out = { ...drafts };
      delete out[oldId];
      const d = getDefaultDraftForExercise(alt, plan.exerciseMuscleTargets?.[alt.id]);
      const hist = getRecentLogsForExercise(dataRef.current.sessions, alt.id, 1)[0];
      if (hist) {
        if (hist.weight.trim()) d.weight = hist.weight;
        if (hist.reps.trim()) d.reps = hist.reps;
        d.sets = hist.sets >= 1 ? hist.sets : d.sets;
        const validM = trainedGroupsValidForExercise(alt, hist.trainedMuscleGroups);
        if (validM.length) d.trainedMuscleGroups = validM;
      }
      out[alt.id] = d;
      return out;
    });
    setSaveMessage(`This slot is now “${alt.name}” for the rest of this session.`);
  }

  function replaceExerciseInPlanPermanently(alt: Exercise, confirmed = false) {
    if (!plan || exercises.length === 0) return;
    const cur = exercises[currentIndex];
    if (!cur || cur.id === alt.id) return;

    if (isUserSavedPlan) {
      if (!confirmed) {
        rrShowConfirm(
          `Replace “${cur.name}” with “${alt.name}” in “${plan.name}” for all future workouts?`,
          () => replaceExerciseInPlanPermanently(alt, true),
        );
        return;
      }
      const idx = data.savedPlans.findIndex((p) => p.id === planId);
      if (idx < 0) return;
      const saved = data.savedPlans[idx];
      const resolved = resolvePlanExerciseIdsToCatalog(saved.exerciseIds, allExercises);
      if (currentIndex < 0 || currentIndex >= resolved.length) return;
      const oldId = resolved[currentIndex];
      const nextIds = resolvePlanExerciseIdsToCatalog(
        resolved.map((id, i) => (i === currentIndex ? alt.id : id)),
        allExercises,
      );
      const nextTargets = { ...saved.exerciseMuscleTargets };
      delete nextTargets[oldId];
      const cleanedTargets = Object.fromEntries(
        Object.entries(nextTargets).filter(([id]) => nextIds.includes(id)),
      );
      const nextPlans = [...data.savedPlans];
      const updated: SavedPlan = { ...saved, exerciseIds: nextIds };
      if (Object.keys(cleanedTargets).length > 0) {
        updated.exerciseMuscleTargets = cleanedTargets;
      } else {
        delete updated.exerciseMuscleTargets;
      }
      nextPlans[idx] = updated;
      persist({ ...data, savedPlans: nextPlans });
      setSessionOrderIds(null);
      setSaveMessage(`Updated “${plan.name}”: this slot will use “${alt.name}” from now on.`);
      return;
    }

    if (!confirmed) {
      rrShowConfirm(
        `Preset routines cannot be edited in place. Add “${plan.name} · adapted” to My plans with “${alt.name}” instead of “${cur.name}”? You will switch to that new routine.`,
        () => replaceExerciseInPlanPermanently(alt, true),
      );
      return;
    }
    const base = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
    if (currentIndex < 0 || currentIndex >= base.length) return;
    const nextIds = resolvePlanExerciseIdsToCatalog(
      base.map((id, i) => (i === currentIndex ? alt.id : id)),
      allExercises,
    );
    const forkedTargets = { ...plan.exerciseMuscleTargets };
    delete forkedTargets[cur.id];
    const cleanedForkTargets = Object.fromEntries(
      Object.entries(forkedTargets).filter(([id]) => nextIds.includes(id)),
    );
    const newId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newPlan: SavedPlan = {
      id: newId,
      name: `${plan.name} · adapted`,
      createdAt: new Date().toISOString(),
      exerciseIds: nextIds,
      muscleGroups: plan.muscleGroups,
      equipment: plan.equipment,
    };
    if (Object.keys(cleanedForkTargets).length > 0) {
      newPlan.exerciseMuscleTargets = cleanedForkTargets;
    }
    persist({ ...data, savedPlans: [...data.savedPlans, newPlan] });
    removeDraftFromStorage(routineDraftStorageKey(planId));
    const url = new URL(window.location.href);
    url.searchParams.set('routine', newId);
    window.location.replace(`${url.pathname}${url.search}`);
  }

  function handleSaveWorkout(dupConfirmed = false) {
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
    if (includedIds.length > 0 && isLikelyDuplicateWorkoutSave(data.sessions, includedIds) && !dupConfirmed) {
      rrShowConfirm(
        'This matches a workout you saved a few minutes ago (same moves). Save again anyway?',
        () => handleSaveWorkout(true),
      );
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
    removeDraftFromStorage(routineDraftStorageKey(planId));
    if (planId === 'gf-quick-active') clearQuickPlanFromLocalStorage();
    setSaveMessage(
      `Saved ${result.completedCount} move${result.completedCount === 1 ? '' : 's'}. History below will update.`,
    );
    const fresh = result.nextData;
    setExerciseDrafts((prev) => {
      const next: Record<string, ExerciseLogDraft> = { ...prev };
      for (const ex of exercises) {
        const d = getDefaultDraftForExercise(ex, plan.exerciseMuscleTargets?.[ex.id]);
        const hist = getRecentLogsForExercise(fresh.sessions, ex.id, 1)[0];
        if (hist) {
          if (hist.weight.trim()) d.weight = hist.weight;
          if (hist.reps.trim()) d.reps = hist.reps;
          d.sets = hist.sets >= 1 ? hist.sets : d.sets;
          const validM = trainedGroupsValidForExercise(ex, hist.trainedMuscleGroups);
          if (validM.length) d.trainedMuscleGroups = validM;
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
  const canSave = includedCount > 0;

  function setAutoAdvance(next: boolean) {
    setAutoAdvanceOnInclude(next);
    try {
      sessionStorage.setItem(AUTO_ADVANCE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="routine-run">
      <header className="routine-run-topbar">
        <div className="routine-run-topbar__row">
          <a className="routine-run-topbar__back" href={plannerHref}>
            <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
            Planner
          </a>
          <div className="routine-run-topbar__meta">
            <p className="routine-run-topbar__eyebrow">Active workout</p>
            <h1 className="routine-run-topbar__title">{plan.name}</h1>
          </div>
          {canSave ? (
            <button type="button" className="button button-small routine-run-topbar__save" onClick={() => handleSaveWorkout()}>
              Save
            </button>
          ) : (
            <span className="routine-run-topbar__save-spacer" aria-hidden />
          )}
        </div>
        <div className="routine-run-topbar__progress" aria-hidden="true">
          <div className="routine-run-topbar__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="routine-run-topbar__step">
          Exercise <strong>{currentIndex + 1}</strong> of <strong>{exercises.length}</strong>
          <span className="routine-run-topbar__step-dot" aria-hidden>
            ·
          </span>
          <span className="routine-run-topbar__step-included">{includedCount} logged</span>
        </p>
      </header>

      {saveMessage ? (
        <div className="routine-run-banner" role="status">
          {saveMessage}
        </div>
      ) : null}

      {sessionOrderIds ? (
        <p className="routine-run-session-override" role="status">
          Session-only order — swaps apply until you save this workout.
        </p>
      ) : null}

      <div className="routine-run-track" role="tablist" aria-label="Exercises in this workout">
        {exercises.map((e, i) => {
          const done = !!exerciseDrafts[e.id]?.completed;
          const isCurrent = i === currentIndex;
          return (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              aria-label={`${e.name}, ${i + 1} of ${exercises.length}${done ? ', included' : ''}`}
              className={['routine-run-track__seg', isCurrent ? 'is-current' : '', done ? 'is-done' : '']
                .filter(Boolean)
                .join(' ')}
              onClick={() => setCurrentIndex(i)}
            />
          );
        })}
      </div>

      <label className="routine-run-auto-advance routine-run-auto-advance--bar">
        <input
          type="checkbox"
          checked={autoAdvanceOnInclude}
          onChange={(e) => setAutoAdvance(e.target.checked)}
        />
        <span>Auto-advance after logging each exercise</span>
      </label>

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

        return (
          <>
          <div
            className={`routine-run-card routine-run-card--session ${draft?.completed ? 'routine-run-card--included' : ''}`.trim()}
          >
            <header className="routine-run-card-head routine-run-card-head--with-pill">
              <div className="routine-run-card-head-main">
                <span className="routine-run-step-badge" aria-hidden="true">
                  <span className="routine-run-step-badge-num">{String(currentIndex + 1).padStart(2, '0')}</span>
                  <span className="routine-run-step-badge-div">/</span>
                  <span className="routine-run-step-badge-total">{String(exercises.length).padStart(2, '0')}</span>
                </span>
                <div className="routine-run-card-title-block">
                  <h2 className="routine-run-move-title">
                    <ExerciseYoutubeLink exerciseName={ex.name} className="exercise-youtube exercise-youtube--title">
                      {ex.name}
                    </ExerciseYoutubeLink>
                  </h2>
                  <p className="routine-run-meta routine-run-meta--inline">
                    <span className="routine-run-meta-muscles">{muscleMeta}</span>
                    <span className="routine-run-meta-sep" aria-hidden="true">
                      {' · '}
                    </span>
                    Logged <strong>{stat?.timesCompleted ?? 0}</strong>× · Last{' '}
                    {formatShortDate(stat?.lastPerformed ?? null)}
                  </p>
                </div>
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
                {draft?.completed ? (
                  <>
                    <Check className="routine-run-pill-icon" size={18} strokeWidth={2.25} aria-hidden />
                    Logged for today
                  </>
                ) : (
                  'Log this exercise'
                )}
              </button>
            </header>

            <section className="routine-run-card__section" aria-label="Exercise reference">
              <h3 className="routine-run-card__section-label">
                <Dumbbell className="routine-run-card__section-icon" size={14} strokeWidth={2} aria-hidden />
                Form check
              </h3>
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
            </section>

            <section className="routine-run-card__section routine-run-card__section--context" aria-label="History and alternatives">
              <h3 className="routine-run-card__section-label">
                <History className="routine-run-card__section-icon" size={14} strokeWidth={2} aria-hidden />
                History &amp; swaps
              </h3>
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

            <details className="routine-run-alts-details">
              <summary>
                Swap ideas ({swapBrowseAll ? `${swapBrowseList.length} total` : `${exerciseAlternatives.length} same muscles`})
              </summary>

              {/* Mode toggle */}
              <div className="routine-run-alts-mode-bar">
                <button
                  type="button"
                  className={`routine-run-alts-mode-btn ${!swapBrowseAll ? 'is-active' : ''}`}
                  onClick={() => { setSwapBrowseAll(false); setSwapSearch(''); }}
                >
                  Same muscles
                </button>
                <button
                  type="button"
                  className={`routine-run-alts-mode-btn ${swapBrowseAll ? 'is-active' : ''}`}
                  onClick={() => setSwapBrowseAll(true)}
                >
                  All exercises
                </button>
              </div>

              {swapBrowseAll && (
                <input
                  className="routine-run-alts-search"
                  type="text"
                  placeholder="Filter by name or muscle…"
                  value={swapSearch}
                  onChange={(e) => setSwapSearch(e.target.value)}
                />
              )}

              {(() => {
                const rawList = swapBrowseAll ? swapBrowseList : exerciseAlternatives;
                const list = swapBrowseAll ? rawList.slice(0, swapBrowseLimit) : rawList;
                const hasMore = swapBrowseAll && rawList.length > swapBrowseLimit;
                if (list.length === 0) {
                  return <p className="routine-run-history-empty">No matches.</p>;
                }
                return (
                  <>
                  <ul className="routine-run-alts-list">
                    {list.map((alt) => {
                      const altImg = images[alt.name];
                      return (
                        <li key={alt.id} className="routine-run-alt-row">
                          <div className="routine-run-alt-thumb-wrap">
                            {altImg?.url ? (
                              <img
                                src={altImg.url}
                                alt=""
                                className="routine-run-alt-thumb"
                                width={52}
                                height={52}
                                loading="lazy"
                              />
                            ) : (
                              <div className="routine-run-alt-thumb routine-run-alt-thumb--ph" aria-hidden="true">
                                {alt.primaryGroup.slice(0, 2)}
                              </div>
                            )}
                          </div>
                          <div className="routine-run-alt-body">
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
                            <div className="routine-run-alt-actions">
                              <button
                                type="button"
                                className="routine-run-alt-btn routine-run-alt-btn--today"
                                onClick={() => swapExerciseForToday(alt)}
                              >
                                <ArrowRightLeft size={14} strokeWidth={2} aria-hidden />
                                Use today
                              </button>
                              <button
                                type="button"
                                className="routine-run-alt-btn routine-run-alt-btn--plan"
                                onClick={() => replaceExerciseInPlanPermanently(alt)}
                              >
                                <Library size={14} strokeWidth={2} aria-hidden />
                                {isUserSavedPlan ? 'Update plan' : 'Save to My plans'}
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {hasMore && (
                    <button
                      type="button"
                      className="routine-run-load-more"
                      onClick={() => setSwapBrowseLimit((n) => n + 20)}
                    >
                      Load more ({rawList.length - swapBrowseLimit} remaining)
                    </button>
                  )}
                  </>
                );
              })()}

              <p className="routine-run-alts-hint">
                <strong>Use today</strong> replaces only this session&apos;s card.{' '}
                <strong>{isUserSavedPlan ? 'Update plan' : 'Save to My plans'}</strong> changes the routine in your library
                {isUserSavedPlan ? ' (this plan)' : ' (adds an adapted copy; you switch to it)'}.
              </p>
            </details>
            </section>

            {candidateMuscleGroupsForExercise(ex).length > 1 ? (
              <div className="routine-run-card__section routine-run-card__section--targets">
                <h3 className="routine-run-card__section-label">
                  <Layers className="routine-run-card__section-icon" size={14} strokeWidth={2} aria-hidden />
                  Body map
                </h3>
                <MuscleTargetPick
                  key={ex.id}
                  exercise={ex}
                  draft={draft}
                  onPatch={(patch) => updateDraft(ex.id, patch)}
                />
              </div>
            ) : null}

            <section className="routine-run-card__section routine-run-card__section--log" aria-label="Log this set">
              <h3 className="routine-run-card__section-label">Working sets</h3>
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
            </section>

            {/* Rest timer trigger row */}
            <div className="routine-run-rest-row">
              {restSecondsLeft === null ? (
                <div className="routine-run-rest-presets">
                  <span className="routine-run-rest-label">Rest</span>
                  {[30, 60, 90, 120, 180].map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="rest-timer-preset"
                      onClick={() => startRestTimer(s)}
                    >
                      {s < 60 ? `${s}s` : `${s / 60}m`}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="routine-run-rest-active">
                  <span className="routine-run-rest-countdown">
                    {Math.floor(restSecondsLeft / 60)}:{String(restSecondsLeft % 60).padStart(2, '0')}
                  </span>
                  <div className="routine-run-rest-active-presets">
                    {[30, 60, 90, 120, 180].map((s) => (
                      <button key={s} type="button" className="rest-timer-preset rest-timer-preset--sm" onClick={() => startRestTimer(s)}>
                        {s < 60 ? `${s}s` : `${s / 60}m`}
                      </button>
                    ))}
                  </div>
                  <button type="button" className="routine-run-rest-stop" onClick={stopRestTimer}>✕</button>
                </div>
              )}
            </div>

            {isLast ? (
              <p className="routine-run-last-hint">
                Last exercise — save your workout when you are finished.
              </p>
            ) : null}
          </div>

          <nav className="routine-run-footer" aria-label="Exercise navigation">
            <button
              type="button"
              className="routine-run-footer__btn"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
              Previous
            </button>
            {!isLast ? (
              <button
                type="button"
                className="routine-run-footer__btn routine-run-footer__btn--primary"
                onClick={() => setCurrentIndex((i) => Math.min(exercises.length - 1, i + 1))}
              >
                Next exercise
                <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                className="routine-run-footer__btn routine-run-footer__btn--primary"
                onClick={() => handleSaveWorkout()}
                disabled={!canSave}
              >
                Finish &amp; save
              </button>
            )}
          </nav>
          </>
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
          <button type="button" className="button" onClick={() => handleSaveWorkout()}>
            Save workout
          </button>
        </div>
      ) : null}

      {/* Inline confirm dialog */}
      {rrConfirmDialog && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label="Confirm action">
          <div className="confirm-box">
            <p className="confirm-message">{rrConfirmDialog.message}</p>
            <div className="confirm-actions">
              <button type="button" className="confirm-btn confirm-btn--cancel" onClick={() => setRrConfirmDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="confirm-btn confirm-btn--ok"
                onClick={() => { rrConfirmDialog.onConfirm(); setRrConfirmDialog(null); }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
