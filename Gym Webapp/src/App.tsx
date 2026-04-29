import { Component, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from './data/exerciseLibrary';
import { toPng } from 'html-to-image';
import { BodyMapFigure } from './components/BodyMapFigure';
import { MuscleSpider } from './components/MuscleSpider';
import { HistoryBackfillPanel } from './components/HistoryBackfillPanel';
import { WorkoutCalendar } from './components/WorkoutCalendar';
import { MuscleTargetPick } from './components/MuscleTargetPick';
import { ExerciseYoutubeLink } from './components/ExerciseYoutubeLink';
import { getExerciseImageMap, type ExerciseImageMeta } from './services/exerciseImages';
import { getPracticeCountsInWindow } from './utils/practiceWindow';
import { MUSCLE_GROUP_CALENDAR_COLOR } from './components/calendarMuscleColors';
import { PrintReport } from './components/PrintReport';
import { DayActivityModal } from './components/DayActivityModal';
import {
  computeStreak,
  computeConsistency,
  getPushPullLegsBalance,
  getTopExercises,
  getNeglectedMuscles,
  getMuscleImbalanceWarnings,
  getWeeklyWorkoutCounts,
} from './utils/analysisHelpers';

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
import { buildPresetPlans } from './data/presetPlans';
import { commitWorkoutSession } from './utils/commitWorkoutSession';
import { isLikelyDuplicateWorkoutSave } from './utils/recentDuplicateSave';

import {
  candidateMuscleGroupsForExercise,
  getDefaultDraft,
  getDefaultDraftForExercise,
  type ExerciseLogDraft,
} from './utils/workoutLogDraft';

const DEFAULT_REPORT_DAYS = 10;
const PRESET_CATEGORY_META: Record<string, { description: string }> = {
  'Core Foundations': { description: 'Balanced full-body routines' },
  'Classic Splits': { description: 'Reliable weekly split templates' },
  'Targeted Growth': { description: 'Extra volume for key areas' },
  'Targeted Isolation (Single Muscle)': { description: 'Single-muscle focus days' },
};

type AppView = 'home' | 'create-focus' | 'create-moves' | 'log' | 'activity' | 'library';

class RunnerErrorBoundary extends Component<{ onFail: () => void; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="runner-empty">
          Runner had an issue. Switched to List view.
        </div>
      );
    }
    return this.props.children;
  }
}

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
  const [analysisDays, setAnalysisDays] = useState(10);
  const [reportDays, setReportDays] = useState(DEFAULT_REPORT_DAYS);
  const [reportProfile, setReportProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gf-profile') || '{}'); } catch { return {}; }
  });
  const [exerciseImages, setExerciseImages] = useState<Record<string, ExerciseImageMeta>>({});
  const [catalogSort, setCatalogSort] = useState<CatalogSortMode>('gym');
  const [filterWrkoutCategory, setFilterWrkoutCategory] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [savePlanNameInput, setSavePlanNameInput] = useState('');
  const [activeRoutineName, setActiveRoutineName] = useState<string | null>(null);
  const [editingSavedPlanId, setEditingSavedPlanId] = useState<string | null>(null);
  const [logViewMode, setLogViewMode] = useState<'runner' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 720) return 'runner';
      const stored = window.localStorage.getItem('gf-log-view');
      if (stored === 'runner' || stored === 'list') return stored;
      return 'list';
    }
    return 'runner';
  });
  const [runnerIndex, setRunnerIndex] = useState(0);
  const [timerExerciseId, setTimerExerciseId] = useState<string | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerDuration, setTimerDuration] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const swipeStartXRef = useRef<number | null>(null);
  const swipeStartYRef = useRef<number | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'Core Foundations': true,
    'Classic Splits': true,
    'Targeted Growth': true,
    'Targeted Isolation (Single Muscle)': true
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  const allExercises = useMemo(() => [...EXERCISE_LIBRARY, ...data.customExercises], [data.customExercises]);
  const exerciseById = useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);
  const categoryFilterOptions = useMemo(() => collectSortedUnique(allExercises.map((e) => getEffectiveCategory(e))), [allExercises]);
  const equipmentFilterOptions = useMemo(() => collectSortedUnique(allExercises.map((e) => getEffectiveEquipment(e))), [allExercises]);
  const presetCategories = useMemo(() => buildPresetPlans(allExercises), [allExercises]);

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
  
  const groupedSessions = useMemo(() => {
    const map = new Map<string, { date: string; groups: MuscleGroup[]; entries: number; id: string }>();
    for (const s of data.sessions) {
      const d = new Date(s.date);
      const day = isNaN(d.getTime()) ? s.date.split('T')[0] : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(day)) {
        map.set(day, { date: s.date, groups: [...s.groups], entries: s.entries.length, id: s.id });
      } else {
        const existing = map.get(day)!;
        existing.entries += s.entries.length;
        const combinedGroups = new Set([...existing.groups, ...s.groups]);
        existing.groups = Array.from(combinedGroups);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [data.sessions]);

  const recentSessions = groupedSessions.slice(0, 5);

  const practiceCounts = useMemo(
    () => getPracticeCountsInWindow(data.sessions, exerciseById, reportDays),
    [data.sessions, exerciseById, reportDays],
  );
  const analysisCounts = useMemo(
    () => getPracticeCountsInWindow(data.sessions, exerciseById, analysisDays),
    [data.sessions, exerciseById, analysisDays],
  );

  // ── Advanced analytics ──────────────────────────────────────────────
  const streak = useMemo(() => computeStreak(data.sessions), [data.sessions]);
  const consistency = useMemo(() => computeConsistency(data.sessions, analysisDays), [data.sessions, analysisDays]);
  const pplBalance = useMemo(() => getPushPullLegsBalance(analysisCounts), [analysisCounts]);
  const topExercises = useMemo(() => getTopExercises(data.stats, exerciseById, 8), [data.stats, exerciseById]);
  const neglectedMuscles = useMemo(() => getNeglectedMuscles(analysisCounts, MUSCLE_GROUPS), [analysisCounts]);
  const imbalanceWarnings = useMemo(() => getMuscleImbalanceWarnings(pplBalance), [pplBalance]);
  const weeklyData = useMemo(() => getWeeklyWorkoutCounts(data.sessions, 12), [data.sessions]);
  const pplMax = useMemo(() => Math.max(pplBalance.push, pplBalance.pull, pplBalance.legs, pplBalance.core, 1), [pplBalance]);

  const trainedGroupsCount = useMemo(
    () => MUSCLE_GROUPS.filter((g) => (practiceCounts instanceof Map ? (practiceCounts.get(g) ?? 0) : ((practiceCounts as Record<string, number>)[g] ?? 0)) > 0).length,
    [practiceCounts],
  );
  const trainedGroupsCountAnalysis = useMemo(
    () => MUSCLE_GROUPS.filter((g) => (analysisCounts instanceof Map ? (analysisCounts.get(g) ?? 0) : ((analysisCounts as Record<string, number>)[g] ?? 0)) > 0).length,
    [analysisCounts],
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
    if (view !== 'log') return;
    if (typeof window !== 'undefined' && window.innerWidth < 720) {
      setLogViewMode('runner');
    }
  }, [view]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('gf-log-view', logViewMode);
  }, [logViewMode]);

  useEffect(() => {
    setRunnerIndex(0);
    setTimerExerciseId(null);
    setTimerRunning(false);
    setTimerRemaining(0);
  }, [planExercises.length]);

  useEffect(() => {
    setTimerRunning(false);
  }, [runnerIndex]);

  useEffect(() => {
    if (!timerRunning) return;
    if (timerRemaining <= 0) {
      setTimerRunning(false);
      return;
    }
    const t = setInterval(() => {
      setTimerRemaining((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [timerRemaining, timerRunning]);

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

  function formatTimer(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function goRunnerNext() {
    if (planExercises.length === 0) return;
    setRunnerIndex((i) => Math.min(planExercises.length - 1, i + 1));
  }

  function goRunnerPrev() {
    if (planExercises.length === 0) return;
    setRunnerIndex((i) => Math.max(0, i - 1));
  }

  function moveExerciseItem(index: number, direction: -1 | 1) {
    setSelectedExerciseIds((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const tmp = next[index];
      next[index] = next[target];
      next[target] = tmp;
      return next;
    });
  }

  function updateDraft(exerciseId: string, patch: Partial<ExerciseLogDraft>) {
    setExerciseDrafts((current) => {
      const ex = exerciseById.get(exerciseId);
      const merged: ExerciseLogDraft = { ...getDefaultDraft(), ...getDefaultDraftForExercise(ex), ...current[exerciseId], ...patch };
      if (ex) {
        const c = candidateMuscleGroupsForExercise(ex);
        let t = merged.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
        if (c.length === 1 && t.length === 0) t = [...c];
        merged.trainedMuscleGroups = t;
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

  async function handleDownloadImage() {
    const reportEl = document.getElementById('print-report');
    if (!reportEl) return;

    try {
      document.body.classList.add('screenshot-mode');
      await new Promise(r => setTimeout(r, 150)); // Wait for styles to settle

      const dataUrl = await toPng(reportEl, {
        cacheBust: true,
        width: 1280,
        height: 800,
        pixelRatio: 2, // Double resolution for sharpness
        style: {
          display: 'flex',
          visibility: 'visible',
          position: 'static', // Prevent fixed positioning from cutting it off
          transform: 'none',
        }
      });

      const link = document.createElement('a');
      link.download = `Gym-Flow-Report-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
      alert('Could not generate image. Please use the Print option instead.');
    } finally {
      document.body.classList.remove('screenshot-mode');
    }
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

  function toggleSection(sectionKey: string) {
    setCollapsedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  }

  function handleExportData() {
    const dataStr = JSON.stringify(data);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gymflow-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage('Download started');
  }

  function handleImportData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const d = JSON.parse(event.target?.result as string);
        if (d.savedPlans && d.sessions) {
          if (window.confirm('Restore this backup? Current data will be overwritten.')) {
            persist(d);
            setMessage('Data restored successfully!');
          }
        } else {
          setMessage('Invalid backup file format.');
        }
      } catch (err) {
        setMessage('Error parsing backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function saveCurrentPlanTemplate() {
    const name = savePlanNameInput.trim();
    if (name.length < 2) { setMessage('Enter a plan name.'); return; }
    if (selectedExerciseIds.length === 0) { setMessage('Add at least one exercise.'); return; }

    for (const id of selectedExerciseIds) {
      if (!exerciseDrafts[id]?.trainedMuscleGroups?.length) {
        setMessage(`Select muscles for "${exerciseById.get(id)?.name}".`);
        return;
      }
    }

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
      if (ex) {
        const c = candidateMuscleGroupsForExercise(ex);
        let t = m.trainedMuscleGroups?.filter((g) => c.includes(g)) ?? [];
        if (t.length === 0) t = [...c];
        m.trainedMuscleGroups = t;
      }
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
    if (includedIds.length === 0) { setMessage('Check "Done" for at least one move.'); return; }
    if (isLikelyDuplicateWorkoutSave(data.sessions, includedIds) && !window.confirm('Looks like a duplicate — save anyway?')) return;
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
    <>
    <div className="gf-app-layout">
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
              <div className="home-section-header" onClick={() => toggleSection('my-plans')} style={{ cursor: 'pointer' }}>
                <span className="home-section-label">MY PLANS {collapsedSections['my-plans'] ? '▼' : '▲'}</span>
                <button className="icon-add-btn" onClick={(e) => { e.stopPropagation(); startCreatePlan(); }} aria-label="New plan">+</button>
              </div>

              {!collapsedSections['my-plans'] && (
                <>
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
                </>
              )}
            </section>

            {presetCategories.map((category) => (
              <section key={category.title} className="home-section" aria-label={category.title}>
                <div className="home-section-header" onClick={() => toggleSection(category.title)} style={{ cursor: 'pointer' }}>
                  <div className="home-section-title">
                    <span className="home-section-label">{category.title.toUpperCase()} {collapsedSections[category.title] ? '▼' : '▲'}</span>
                    {PRESET_CATEGORY_META[category.title]?.description && (
                      <span className="home-section-desc">{PRESET_CATEGORY_META[category.title].description}</span>
                    )}
                  </div>
                  <span className="section-count-badge">{category.plans.length} plans</span>
                </div>
                {!collapsedSections[category.title] && (
                  <ul className="plan-card-list">
                    {category.plans.map((plan) => {
                      const entries = orderedPlanEntries(plan, allExercises);
                      return (
                        <li key={plan.id} className="plan-card-home">
                          <div className="plan-card-home-row">
                            <div className="plan-card-home-info">
                              <span className="plan-card-home-name">{plan.name}</span>
                              <span className="plan-card-home-sub">{entries.length} moves</span>
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
                            <button className="btn-start" onClick={() => openRoutineWorkoutTab(plan.id)}>Start</button>
                          </div>
                          <div className="plan-card-home-actions">
                             {/* Only Start available in presets for now */}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}

            {/* 10-DAY REPORT */}
            <section className="home-section" aria-label={`Last ${reportDays} days report`}>
              <div className="home-section-header">
                <span className="home-section-label">LAST {reportDays} DAYS</span>
                <span className="home-section-sub">{trainedGroupsCount}/{MUSCLE_GROUPS.length} groups trained</span>
              </div>
              <div className="home-section-controls" role="group" aria-label="Report period">
                {[7, 10, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`chip chip-compact ${reportDays === d ? 'chip-active' : ''}`}
                    onClick={() => setReportDays(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>
              <div className="report-card">
                <BodyMapFigure
                  practiceCounts={practiceCounts}
                  practiceWindowDays={reportDays}
                  selectedGroups={[]}
                  onToggleGroup={(group) => startCreatePlan([group])}
                />
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
              practiceWindowDays={reportDays}
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

            {selectedExerciseIds.length > 0 && (
              <div className="panel" style={{ marginBottom: '1.25rem', padding: '0.8rem' }}>
                <h2 className="panel-heading panel-heading--plain" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Added Moves Order</h2>
                <div className="small-list small-list--scroll">
                  {selectedExerciseIds.map((id, index) => {
                    const ex = exerciseById.get(id);
                    if (!ex) return null;
                    return (
                      <div key={id} className="small-list-row" style={{ padding: '0.2rem 0' }}>
                        <span style={{ fontSize: '0.85rem' }}>{index + 1}. {ex.name}</span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button type="button" className="button button-small button-muted" onClick={() => moveExerciseItem(index, -1)} disabled={index === 0}>↑</button>
                          <button type="button" className="button button-small button-muted" onClick={() => moveExerciseItem(index, 1)} disabled={index === selectedExerciseIds.length - 1}>↓</button>
                          <button type="button" className="text-button" onClick={() => toggleExerciseInPlan(id)} aria-label="Remove" style={{ marginLeft: '0.25rem', padding: '0.1rem 0.3rem' }}>✕</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
            <div className="view-toggle-row" role="group" aria-label="Log view">
              <div className="view-toggle">
                <button
                  type="button"
                  className={`chip chip-compact ${logViewMode === 'runner' ? 'chip-active' : ''}`}
                  onClick={() => setLogViewMode('runner')}
                  aria-pressed={logViewMode === 'runner'}
                >
                  Runner
                </button>
                <button
                  type="button"
                  className={`chip chip-compact ${logViewMode === 'list' ? 'chip-active' : ''}`}
                  onClick={() => setLogViewMode('list')}
                  aria-pressed={logViewMode === 'list'}
                >
                  List
                </button>
              </div>
            </div>
            {logViewMode === 'runner' ? (
              <RunnerErrorBoundary onFail={() => setLogViewMode('list')}>
                <div
                  className="runner-shell"
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    swipeStartXRef.current = touch?.clientX ?? null;
                    swipeStartYRef.current = touch?.clientY ?? null;
                  }}
                  onTouchEnd={(e) => {
                    const startX = swipeStartXRef.current;
                    const startY = swipeStartYRef.current;
                    swipeStartXRef.current = null;
                    swipeStartYRef.current = null;
                    if (startX === null || startY === null) return;
                    const touch = e.changedTouches[0];
                    if (!touch) return;
                    const dx = touch.clientX - startX;
                    const dy = touch.clientY - startY;
                    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
                    if (dx < 0) goRunnerNext();
                    else goRunnerPrev();
                  }}
                >
                  <div className="runner-progress">
                    <span>Move {planExercises.length === 0 ? 0 : runnerIndex + 1} of {planExercises.length}</span>
                    <span>{planExercises.filter((e) => exerciseDrafts[e.id]?.completed).length} done</span>
                  </div>

                  {planExercises.length === 0 ? (
                    <div className="runner-empty">Add moves before starting a workout.</div>
                  ) : (
                    (() => {
                      const safeIndex = Math.min(runnerIndex, Math.max(planExercises.length - 1, 0));
                      const exercise = planExercises[safeIndex];
                      if (!exercise) return <div className="runner-empty">Loading workout…</div>;
                      const draft = exerciseDrafts[exercise.id];
                      const isCardio = getEffectiveCategory(exercise) === 'cardio';
                      const isActiveTimer = timerExerciseId === exercise.id;
                      const showTimer = isActiveTimer && timerRemaining > 0;
                      return (
                        <article className="runner-card">
                          <div className="runner-card-header">
                            <h2>
                              <ExerciseYoutubeLink exerciseName={exercise.name} className="exercise-youtube exercise-youtube--title">
                                {exercise.name}
                              </ExerciseYoutubeLink>
                            </h2>
                            <label className="checkbox">
                              <input
                                type="checkbox"
                                checked={draft?.completed ?? false}
                                onChange={(e) => updateDraft(exercise.id, { completed: e.target.checked })}
                              />
                              Done
                            </label>
                          </div>

                          <MuscleTargetPick exercise={exercise} draft={draft} onPatch={(p) => updateDraft(exercise.id, p)} />

                          <div className="runner-timer">
                            <div className="runner-timer-row">
                              <span className="runner-timer-label">Set timer</span>
                              <select
                                className="select-input runner-timer-select"
                                value={timerDuration}
                                onChange={(e) => {
                                  const next = Number(e.target.value);
                                  setTimerDuration(next);
                                  if (!timerRunning) setTimerRemaining(next);
                                }}
                              >
                                {[30, 60, 90, 120].map((d) => (
                                  <option key={d} value={d}>{d}s</option>
                                ))}
                              </select>
                            </div>
                            <div className="runner-timer-row">
                              <span className="runner-timer-value">{showTimer ? formatTimer(timerRemaining) : formatTimer(timerDuration)}</span>
                              <div className="runner-timer-actions">
                                <button
                                  type="button"
                                  className="button button-small"
                                  onClick={() => {
                                    setTimerExerciseId(exercise.id);
                                    setTimerRemaining((s) => (s > 0 && isActiveTimer ? s : timerDuration));
                                    setTimerRunning(true);
                                  }}
                                >
                                  {timerRunning && isActiveTimer ? 'Running' : 'Start'}
                                </button>
                                <button
                                  type="button"
                                  className="button button-small button-muted"
                                  onClick={() => {
                                    if (isActiveTimer) setTimerRunning(false);
                                  }}
                                >
                                  Pause
                                </button>
                                <button
                                  type="button"
                                  className="text-button"
                                  onClick={() => {
                                    setTimerExerciseId(exercise.id);
                                    setTimerRemaining(timerDuration);
                                    setTimerRunning(false);
                                  }}
                                >
                                  Reset
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="plan-grid">
                            {isCardio ? (
                              <label className="plan-grid-full">
                                Minutes
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  placeholder="e.g. 20"
                                  value={draft?.reps ?? '20'}
                                  onChange={(e) => updateDraft(exercise.id, { reps: e.target.value, sets: 1 })}
                                />
                              </label>
                            ) : (
                              <>
                                <label>Sets<input type="number" min={1} value={draft?.sets ?? 3} onChange={(e) => updateDraft(exercise.id, { sets: e.target.value === '' ? '' : Number(e.target.value) })} /></label>
                                <label>Reps<input type="text" value={draft?.reps ?? '8-12'} onChange={(e) => updateDraft(exercise.id, { reps: e.target.value })} /></label>
                                <label>Weight<input type="text" placeholder="35kg" value={draft?.weight ?? ''} onChange={(e) => updateDraft(exercise.id, { weight: e.target.value })} /></label>
                              </>
                            )}
                          </div>

                          <label>Notes<input type="text" placeholder="tempo, rest…" value={draft?.notes ?? ''} onChange={(e) => updateDraft(exercise.id, { notes: e.target.value })} /></label>
                          {exerciseImages[exercise.name] && <p className="image-credit">{exerciseImages[exercise.name].credit}</p>}
                        </article>
                      );
                    })()
                  )}

                  <div className="runner-nav">
                    <button
                      type="button"
                      className="button button-muted"
                      onClick={goRunnerPrev}
                      disabled={runnerIndex === 0}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={goRunnerNext}
                      disabled={runnerIndex >= planExercises.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </RunnerErrorBoundary>
            ) : (
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
                            <label>Sets<input type="number" min={1} value={draft?.sets ?? 3} onChange={(e) => updateDraft(exercise.id, { sets: e.target.value === '' ? '' : Number(e.target.value) })} /></label>
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
            )}
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
              <HistoryBackfillPanel allExercises={allExercises} sessions={data.sessions} savedPlans={data.savedPlans} onPersist={({ sessions: s, stats: st }) => persist({ ...data, sessions: s, stats: st })} />
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Overview</h2>
              <div className="stats-grid">
                <article className="stat-card"><h3>{totalWorkoutCount}</h3><p>Workouts</p></article>
                <article className="stat-card"><h3>{totalTrackedSets}</h3><p>Total Sets</p></article>
                <article className="stat-card stat-card--accent"><h3>{streak.current}</h3><p>🔥 Streak</p></article>
                <article className="stat-card"><h3>{streak.longest}</h3><p>Best Streak</p></article>
                <article className="stat-card"><h3>{consistency}%</h3><p>Consistency ({analysisDays}d)</p></article>
                <article className="stat-card"><h3>{trainedGroupsCountAnalysis}</h3><p>Muscles Hit ({analysisDays}d)</p></article>
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Analysis Period</h2>
              <div className="chip-list" style={{ marginTop: '0.4rem' }}>
                {[7, 10, 30, 90, 365].map(d => (
                  <button 
                    key={d} 
                    className={`chip ${analysisDays === d ? 'chip-active' : ''}`}
                    onClick={() => setAnalysisDays(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Muscle Focus Heatmap</h2>
              <p className="panel-subtle">Body-wide training intensity for this period.</p>
              <BodyMapFigure
                practiceCounts={analysisCounts}
                practiceWindowDays={analysisDays}
                selectedGroups={selectedGroups}
                onToggleGroup={(g) => {
                  setSelectedGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
                }}
              />
              {selectedGroups.length > 0 && (
                <div className="active-filters-row" role="status" aria-live="polite">
                  <span className="active-filters-label">Active filters</span>
                  <div className="active-filters-chips">
                    {selectedGroups.map((g) => (
                      <button key={g} type="button" className="chip chip-active" onClick={() => toggleGroup(g)}>
                        {g} ✕
                      </button>
                    ))}
                  </div>
                  <button type="button" className="text-button" onClick={() => { setSelectedGroups([]); setSelectedEquipment([]); }}>
                    Clear all
                  </button>
                </div>
              )}
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Weekly Frequency</h2>
              <p className="panel-subtle">Workouts per week — last 12 weeks</p>
              <div className="weekly-chart">
                {weeklyData.map((w, i) => {
                  const maxC = Math.max(...weeklyData.map(x => x.count), 1);
                  const pct = (w.count / maxC) * 100;
                  return (
                    <div key={i} className="weekly-bar-col">
                      <span className="weekly-bar-count">{w.count > 0 ? w.count : ''}</span>
                      <div className="weekly-bar-track">
                        <div className="weekly-bar-fill" style={{ height: `${Math.max(pct, w.count > 0 ? 4 : 0)}%`, background: w.count === 0 ? 'var(--gf-surface-2)' : 'var(--gf-accent)' }} />
                      </div>
                      <span className="weekly-bar-label">{w.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Push / Pull / Legs / Core</h2>
              <p className="panel-subtle">Movement pattern balance for this period</p>
              <div className="ppl-grid">
                {[ 
                  { label: 'Push', val: pplBalance.push, color: '#ea580c', muscles: 'Chest, Shoulders, Triceps' },
                  { label: 'Pull', val: pplBalance.pull, color: '#2563eb', muscles: 'Back, Biceps, Forearms' },
                  { label: 'Legs', val: pplBalance.legs, color: '#16a34a', muscles: 'Quads, Hamstrings, Glutes, Calves' },
                  { label: 'Core', val: pplBalance.core, color: '#65a30d', muscles: 'Core' },
                ].map(({ label, val, color, muscles }) => (
                  <div key={label} className="ppl-card">
                    <div className="ppl-card-header">
                      <span className="ppl-label" style={{ color }}>{label}</span>
                      <span className="ppl-val">{val}d</span>
                    </div>
                    <div className="ppl-bar-track">
                      <div className="ppl-bar-fill" style={{ width: `${(val / pplMax) * 100}%`, background: color }} />
                    </div>
                    <span className="ppl-muscles">{muscles}</span>
                  </div>
                ))}
              </div>
              {imbalanceWarnings.length > 0 && (
                <div className="imbalance-warnings">
                  {imbalanceWarnings.map((w, i) => (
                    <div key={i} className="imbalance-warning-item">⚠️ {w}</div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Efficiency Radar</h2>
              <p className="panel-subtle">Visual balance of your training for this period.</p>
              <MuscleSpider counts={analysisCounts} />
            </section>


            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Workout Calendar</h2>
              <WorkoutCalendar sessions={data.sessions} allExercises={allExercises} onDayClick={setSelectedCalendarDay} />
            </section>

            <section className="panel">
              <h2 className="panel-heading panel-heading--plain">Volume Analysis</h2>
              <div className="analysis-chart">
                {MUSCLE_GROUPS
                  .map(group => ({
                    group,
                    count: analysisCounts.get(group) ?? 0
                  }))
                  .sort((a, b) => {
                    if (a.count === b.count) return 0;
                    if (a.count === 0) return 1;
                    if (b.count === 0) return -1;
                    return b.count - a.count;
                  })
                  .map(({group, count}) => {
                    const max = Math.max(...analysisCounts.values(), 1);
                    const pct = (count / max) * 100;
                    return (
                      <div key={group} className="analysis-bar-row">
                        <span className="analysis-bar-label" style={{ opacity: count === 0 ? 0.5 : 1 }}>{group}</span>
                        <div className="analysis-bar-track">
                          <div 
                            className="analysis-bar-fill" 
                            style={{ 
                              width: `${pct}%`, 
                              background: count > 0 ? (MUSCLE_GROUP_CALENDAR_COLOR[group] || 'var(--gf-accent)') : 'transparent' 
                            }} 
                          />
                          {count === 0 && <div className="bar-missed-indicator" />}
                        </div>
                        <span className="analysis-bar-value" style={{ opacity: count === 0 ? 0.4 : 1 }}>{count}d</span>
                      </div>
                    );
                  })}
              </div>
            </section>

            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Recent sessions</h2>
              {recentSessions.length === 0 ? (
                <p className="empty-text">No sessions yet.</p>
              ) : (
                <div className="small-list">
                  {recentSessions.map((session) => (
                    <div key={session.date} className="small-list-row">
                      <span>
                        {formatDate(session.date)}{' '}
                        <small>
                          {session.entries} moves
                        </small>
                      </span>
                      <small>{session.groups.join(', ')}</small>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {topExercises.length > 0 && (
              <section className="panel panel--compact">
                <h2 className="panel-heading panel-heading--plain">Top Exercises (All Time)</h2>
                <div className="top-exercises-list">
                  {topExercises.map((ex, i) => (
                    <div key={i} className="top-exercise-row">
                      <span className="top-exercise-rank">#{i + 1}</span>
                      <span className="top-exercise-name">{ex.name}</span>
                      <span className="top-exercise-stats">{ex.count} sessions · {ex.sets} sets</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────── */}
        {view === 'library' && (
          <>
            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Your Profile</h2>
              <p className="panel-subtle">Used for your PDF training report (stored locally).</p>
              <div className="profile-form">
                <label className="profile-field">
                  <span>Name</span>
                  <input className="text-input" type="text" placeholder="e.g. Alex Smith" value={reportProfile.name || ''}
                    onChange={e => { const p = { ...reportProfile, name: e.target.value }; setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p)); }} />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label className="profile-field">
                    <span>Weight</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <input className="text-input" type="text" placeholder="75" style={{ flex: 1 }} value={reportProfile.weight || ''}
                        onChange={e => { const p = { ...reportProfile, weight: e.target.value }; setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p)); }} />
                      <select className="select-input" style={{ width: 56 }} value={reportProfile.weightUnit || 'kg'}
                        onChange={e => { const p = { ...reportProfile, weightUnit: e.target.value }; setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p)); }}>
                        <option>kg</option><option>lbs</option>
                      </select>
                    </div>
                  </label>
                  <label className="profile-field">
                    <span>Height</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {reportProfile.heightUnit === 'ft' ? (
                        <>
                          <input className="text-input" type="number" placeholder="5" style={{ flex: 1 }} 
                            value={(reportProfile.height || '').split("'")[0] || ''}
                            onChange={e => {
                              const i = (reportProfile.height || '').split("'")[1] || '';
                              const p = { ...reportProfile, height: `${e.target.value}'${i}` };
                              setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p));
                            }} />
                          <input className="text-input" type="number" placeholder="11" style={{ flex: 1 }} 
                            value={(reportProfile.height || '').split("'")[1] || ''}
                            onChange={e => {
                              const f = (reportProfile.height || '').split("'")[0] || '';
                              const p = { ...reportProfile, height: `${f}'${e.target.value}` };
                              setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p));
                            }} />
                        </>
                      ) : (
                        <input className="text-input" type="text" placeholder="175" style={{ flex: 1 }} value={reportProfile.height || ''}
                          onChange={e => { const p = { ...reportProfile, height: e.target.value }; setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p)); }} />
                      )}
                      <select className="select-input" style={{ width: 56 }} value={reportProfile.heightUnit || 'cm'}
                        onChange={e => { const p = { ...reportProfile, heightUnit: e.target.value }; setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p)); }}>
                        <option>cm</option><option>ft</option>
                      </select>
                    </div>
                  </label>
                </div>
                <label className="profile-field">
                  <span>Age</span>
                  <input className="text-input" type="text" placeholder="28" value={reportProfile.age || ''}
                    onChange={e => { const p = { ...reportProfile, age: e.target.value }; setReportProfile(p); localStorage.setItem('gf-profile', JSON.stringify(p)); }} />
                </label>
              </div>
            </section>

            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Export Report</h2>
              <p className="panel-subtle">Choose your preferred format. The Image option is best for mobile/iPhone sharing.</p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button type="button" className="button" style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', border: 'none', fontWeight: 700 }}
                  onClick={handleDownloadImage}>
                  🖼️ Save as Image
                </button>
                <button type="button" className="button" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontWeight: 700 }}
                  onClick={() => window.print()}>
                  📄 Print PDF
                </button>
              </div>
            </section>


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

            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Data Backup</h2>
              <p className="panel-subtle">Export or import your workouts and plans.</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                <button type="button" className="button" style={{ flex: 1 }} onClick={handleExportData}>
                  Export File
                </button>
                <label className="button button-muted" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                  Import File
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportData} />
                </label>
              </div>
            </section>

            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">App</h2>
              <p className="panel-subtle">Update to the latest version of Gym Flow.</p>
              <button type="button" className="button button-block" style={{ marginTop: '0.6rem' }} onClick={() => window.location.reload()}>
                Check for updates
              </button>
            </section>

            <section className="panel panel--data-reset" aria-label="Reset data">
              <h2 className="panel-heading panel-heading--plain">Danger Zone</h2>
              <p className="prose-lead">Removes all workouts, stats, custom exercises, and saved plans. This cannot be undone.</p>
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
            <span className="bnav-label">Settings</span>
          </button>
        </nav>
      )}
    </div>

    {/* Hidden print report — shown only via @media print */}
    <PrintReport data={{
      profile: { name: reportProfile.name || '', weight: reportProfile.weight || '', weightUnit: reportProfile.weightUnit || 'kg', height: reportProfile.height || '', heightUnit: reportProfile.heightUnit || 'cm', age: reportProfile.age || '' },
      totalWorkouts: totalWorkoutCount,
      totalSets: totalTrackedSets,
      totalCompletions: totalExerciseCompletions,
      streak,
      consistency,
      analysisDays,
      analysisCounts,
      ppl: pplBalance,
      topExercises,
      neglectedMuscles,
      recentSessions: groupedSessions.slice(0, 12).map(s => ({ date: s.date, groups: s.groups, entries: s.entries })),
      weeklyData,
      warnings: imbalanceWarnings,
    }} selectedGroups={selectedGroups} />

    {selectedCalendarDay && (
      <DayActivityModal
        dateKey={selectedCalendarDay}
        sessions={data.sessions}
        allExercises={allExercises}
        savedPlans={data.savedPlans}
        onClose={() => setSelectedCalendarDay(null)}
        onPersist={({ sessions: s, stats: st }) => persist({ ...data, sessions: s, stats: st })}
      />
    )}
    </>
  );
}
