import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { EXERCISE_LIBRARY, MUSCLE_GROUPS, type Exercise, type MuscleGroup } from './data/exerciseLibrary';
import { toJpeg } from 'html-to-image';
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
  TodayConcentricGoalRings,
  TodayMealEnergyRows,
  WeekNutrientStrips,
} from './components/NutritionDashboard';
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
  type CustomFood,
  type PersistedGymData,
  type NutritionGoals,
  type NutritionLog,
  type SavedPlan,
  type UserProfile,
} from './data/gymFlowStorage';
import { resolvePlanExerciseIdsToCatalog } from './data/migrateStorage';
import {
  type CatalogSortMode,
  collectSortedUnique,
  compareCatalog,
  getEffectiveCategory,
  getEffectiveEquipment,
  labelForFilterValue,
} from './utils/catalogSort';
import { buildPresetPlans } from './data/presetPlans';
import { hydrateFromCloudIfSignedIn, fetchAuthSession, resetCloudHydrationCursor, saveUserProfileCloud } from './utils/cloudSync';
import { GYM_FLOW_OAUTH_SUCCESS, getGymFlowSignInPopupUrl, isTrustedGymFlowOAuthOrigin, openGymFlowSignIn } from './utils/googleSignInPopup';
import { commitWorkoutSession } from './utils/commitWorkoutSession';
import { isLikelyDuplicateWorkoutSave } from './utils/recentDuplicateSave';
import { computeSuggestedNutritionGoals, lastNDayKeysEnding, localTodayDateKey, nutritionLogDateKey } from './utils/nutritionGoalsFromProfile';
import { portionMacrosToPer100g } from './utils/nutritionServing';

import {
  candidateMuscleGroupsForExercise,
  getDefaultDraft,
  getDefaultDraftForExercise,
  type ExerciseLogDraft,
} from './utils/workoutLogDraft';

const DEFAULT_REPORT_DAYS = 10;
const DEFAULT_NUTRITION_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 150,
  carbs: 200,
  fat: 70,
  fiber: 28,
};
const PRESET_CATEGORY_META: Record<string, { description: string }> = {
  'Core Foundations': { description: 'Balanced full-body routines' },
  'Classic Splits': { description: 'Reliable weekly split templates' },
  'Targeted Growth': { description: 'Extra volume for key areas' },
  'Targeted Isolation (Single Muscle)': { description: 'Single-muscle focus days' },
};

type AppView = 'home' | 'create-focus' | 'create-moves' | 'log' | 'activity' | 'nutrition' | 'library';

type NutritionSearchItem = {
  code: string;
  name: string;
  brands?: string;
  quantity?: string;
  servingSize?: string;
  image?: string;
};

type NutritionItemDetail = NutritionSearchItem & {
  per100g: NutritionGoals;
  suggestedServingGrams?: number | null;
};

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
  return `${diff} days ago`;
}

function formatPlanLastDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getLastPlanSessionDate(planId: string, sessions: PersistedGymData['sessions']): string | null {
  for (const s of sessions) {
    if (s.sourcePlanId === planId) return s.date;
  }
  return null;
}

/** Sort key: oldest / never-used first (next up), most-recent session last (e.g. done today → end of row). */
function sortKeyLastPlanSession(planId: string, sessions: PersistedGymData['sessions']): number {
  const iso = getLastPlanSessionDate(planId, sessions);
  if (!iso) return Number.NEGATIVE_INFINITY;
  return new Date(iso).getTime();
}

function comparePlansByLastUsed(
  a: SavedPlan,
  b: SavedPlan,
  sessions: PersistedGymData['sessions'],
): number {
  const da = sortKeyLastPlanSession(a.id, sessions);
  const db = sortKeyLastPlanSession(b.id, sessions);
  if (da !== db) return da - db;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

/** Subline for home plan cards: move count + last save from this plan (session source only). */
function planCardActivitySubline(entriesLength: number, lastUsed: string | null): string {
  if (!lastUsed) return `${entriesLength} moves · Not saved from this plan yet`;
  return `${entriesLength} moves · Last ${formatPlanLastDate(lastUsed)} · ${daysAgo(lastUsed)}`;
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
  const dataRef = useRef(data);
  dataRef.current = data;
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
  const [reportProfile, setReportProfile] = useState<UserProfile>(() => ({}));
  const [exerciseImages, setExerciseImages] = useState<Record<string, ExerciseImageMeta>>({});
  const [catalogSort, setCatalogSort] = useState<CatalogSortMode>('gym');
  const [filterWrkoutCategory, setFilterWrkoutCategory] = useState('all');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [savePlanNameInput, setSavePlanNameInput] = useState('');
  const [activeRoutineName, setActiveRoutineName] = useState<string | null>(null);
  const [editingSavedPlanId, setEditingSavedPlanId] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    'Core Foundations': true,
    'Classic Splits': true,
    'Targeted Growth': true,
    'Targeted Isolation (Single Muscle)': true,
    'nutrition-my-foods': true,
    'nutrition-logged-foods': true,
    'nutrition-goals': true,
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);
  const [cloudSignedIn, setCloudSignedIn] = useState(false);
  const [profileCloudBusy, setProfileCloudBusy] = useState(false);
  const [profileCloudError, setProfileCloudError] = useState<string | null>(null);
  const [nutritionDate, setNutritionDate] = useState(() => localTodayDateKey());
  /** Rolling window for nutrition trend charts (same idea as Activity analysis window). */
  const [nutritionTrendDays, setNutritionTrendDays] = useState(1);
  const [nutritionQuery, setNutritionQuery] = useState('');
  const [nutritionResults, setNutritionResults] = useState<NutritionSearchItem[]>([]);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<NutritionSearchItem | null>(null);
  const [servingGrams, setServingGrams] = useState('100');
  const [nutritionBusy, setNutritionBusy] = useState(false);
  const [newMyFoodName, setNewMyFoodName] = useState('');
  const [newMyFoodCals, setNewMyFoodCals] = useState('200');
  const [newMyFoodP, setNewMyFoodP] = useState('10');
  const [newMyFoodC, setNewMyFoodC] = useState('20');
  const [newMyFoodF, setNewMyFoodF] = useState('5');
  const [newMyFoodFiber, setNewMyFoodFiber] = useState('0');
  const [myFoodEntryMode, setMyFoodEntryMode] = useState<'per100g' | 'portion'>('portion');
  const [newMyPortionGrams, setNewMyPortionGrams] = useState('200');
  const [newMyUsualGrams, setNewMyUsualGrams] = useState('');
  const [servingHint, setServingHint] = useState<string | null>(null);
  const [offNutritionLookup, setOffNutritionLookup] = useState<NutritionItemDetail | null>(null);
  const nutritionSearchAbortRef = useRef<AbortController | null>(null);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingGrams, setEditingGrams] = useState('');

  const allExercises = useMemo(() => [...EXERCISE_LIBRARY, ...data.customExercises], [data.customExercises]);
  const exerciseById = useMemo(() => new Map(allExercises.map((e) => [e.id, e])), [allExercises]);
  const categoryFilterOptions = useMemo(() => collectSortedUnique(allExercises.map((e) => getEffectiveCategory(e))), [allExercises]);
  const equipmentFilterOptions = useMemo(() => collectSortedUnique(allExercises.map((e) => getEffectiveEquipment(e))), [allExercises]);
  const presetCategories = useMemo(() => buildPresetPlans(allExercises), [allExercises]);

  const sortedSavedPlans = useMemo(
    () => [...data.savedPlans].sort((a, b) => comparePlansByLastUsed(a, b, data.sessions)),
    [data.savedPlans, data.sessions],
  );

  const presetCategoriesSorted = useMemo(
    () =>
      presetCategories.map((cat) => ({
        ...cat,
        plans: [...cat.plans].sort((a, b) => comparePlansByLastUsed(a, b, data.sessions)),
      })),
    [presetCategories, data.sessions],
  );

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
  const nutritionLogs = data.nutritionLogs ?? [];
  const nutritionGoals = { ...DEFAULT_NUTRITION_GOALS, ...data.nutritionGoals };
  const customFoods = data.customFoods ?? [];

  const suggestedNutritionGoals = useMemo(
    () => computeSuggestedNutritionGoals(reportProfile),
    [reportProfile.weight, reportProfile.weightUnit, reportProfile.height, reportProfile.heightUnit, reportProfile.age, reportProfile.sex],
  );

  const mealDayKeys = useMemo(() => {
    const s = new Set<string>();
    for (const l of nutritionLogs) {
      s.add(nutritionLogDateKey(l.date));
    }
    return s;
  }, [nutritionLogs]);

  const nutritionWindowByDay = useMemo(() => {
    const keys = lastNDayKeysEnding(nutritionDate, nutritionTrendDays);
    const map = new Map<string, NutritionGoals>();
    for (const k of keys) {
      map.set(k, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });
    }
    for (const log of nutritionLogs) {
      const dk = nutritionLogDateKey(log.date);
      const cur = map.get(dk);
      if (!cur) continue;
      map.set(dk, {
        calories: cur.calories + log.calories,
        protein: cur.protein + log.protein,
        carbs: cur.carbs + log.carbs,
        fat: cur.fat + log.fat,
        fiber: cur.fiber + (log.fiber ?? 0),
      });
    }
    return keys.map((k) => ({ dateKey: k, ...map.get(k)! }));
  }, [nutritionLogs, nutritionTrendDays, nutritionDate]);

  const nutritionWindowAverages = useMemo(() => {
    const n = nutritionWindowByDay.length || nutritionTrendDays;
    const sum = nutritionWindowByDay.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        protein: acc.protein + d.protein,
        carbs: acc.carbs + d.carbs,
        fat: acc.fat + d.fat,
        fiber: acc.fiber + d.fiber,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
    return {
      calories: sum.calories / n,
      protein: sum.protein / n,
      carbs: sum.carbs / n,
      fat: sum.fat / n,
      fiber: sum.fiber / n,
    };
  }, [nutritionWindowByDay, nutritionTrendDays]);

  const printReportNutrition = useMemo(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayKey = `${y}-${mo}-${day}`;
    const today = nutritionLogs
      .filter((l) => nutritionLogDateKey(l.date) === todayKey)
      .reduce(
        (acc, log) => ({
          calories: acc.calories + log.calories,
          protein: acc.protein + log.protein,
          carbs: acc.carbs + log.carbs,
          fat: acc.fat + log.fat,
          fiber: acc.fiber + (log.fiber ?? 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      );
    return {
      dateKey: todayKey,
      today,
      goals: nutritionGoals,
      windowDays: nutritionTrendDays,
      averages: nutritionWindowAverages,
    };
  }, [nutritionLogs, nutritionGoals, nutritionTrendDays, nutritionWindowAverages]);

  const customFoodSearchMatches = useMemo((): NutritionSearchItem[] => {
    const q = nutritionQuery.trim().toLowerCase();
    const base = [...customFoods].sort((a, b) => a.name.localeCompare(b.name));
    const filtered = q.length < 1 ? base.slice(0, 24) : base.filter((f) => f.name.toLowerCase().includes(q));
    return filtered.map((f) => ({
      code: `custom:${f.id}`,
      name: f.name,
      brands: 'My food',
    }));
  }, [nutritionQuery, customFoods]);

  const displayNutritionResults = useMemo(() => {
    const fromApi = cloudSignedIn && nutritionQuery.trim().length >= 2 ? nutritionResults : [];
    const codes = new Set(customFoodSearchMatches.map((i) => i.code));
    return [...customFoodSearchMatches, ...fromApi.filter((i) => !codes.has(i.code))];
  }, [customFoodSearchMatches, nutritionResults, cloudSignedIn, nutritionQuery]);

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

  const dailyNutritionLogs = useMemo(
    () => nutritionLogs.filter((l) => nutritionLogDateKey(l.date) === nutritionDate),
    [nutritionDate, nutritionLogs],
  );

  const nutritionTotals = useMemo(() => {
    return dailyNutritionLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat,
        fiber: acc.fiber + (log.fiber ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
  }, [dailyNutritionLogs]);

  const nutritionConcentricTotals = useMemo(
    () => (nutritionTrendDays === 1 ? nutritionTotals : nutritionWindowAverages),
    [nutritionTrendDays, nutritionTotals, nutritionWindowAverages],
  );

  const todayMealShares = useMemo(
    () => dailyNutritionLogs.map((l) => ({ id: l.id, name: l.name, calories: l.calories })),
    [dailyNutritionLogs],
  );

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
    nutritionSearchAbortRef.current?.abort();
    nutritionSearchAbortRef.current = null;
    setNutritionResults([]);
    setNutritionError(null);
    setNutritionLoading(false);
  }, [nutritionQuery]);

  useEffect(() => {
    if (!cloudSignedIn) {
      nutritionSearchAbortRef.current?.abort();
      nutritionSearchAbortRef.current = null;
      setNutritionResults([]);
      setNutritionLoading(false);
      setNutritionError(null);
    }
  }, [cloudSignedIn]);

  /** Only when this string changes should custom-food defaults reset grams (not on every customFoods []). */
  const nutritionCustomServingKey = useMemo(() => {
    if (!selectedFood?.code?.startsWith('custom:')) return '';
    const id = selectedFood.code.slice('custom:'.length);
    const f = customFoods.find((x) => x.id === id);
    return `${id}:${f?.defaultServingGrams ?? 'na'}:${f?.fiberPer100g ?? 'na'}`;
  }, [selectedFood?.code, customFoods]);

  useEffect(() => {
    setOffNutritionLookup(null);
    setServingHint(null);
    if (!selectedFood) return;
    if (selectedFood.code.startsWith('custom:')) return;

    setServingGrams('100');
    setServingHint(
      selectedFood.servingSize ? `Package note: ${selectedFood.servingSize}` : null,
    );
    if (!cloudSignedIn) return;

    let cancelled = false;
    void (async () => {
      const item = await fetchNutritionItem(selectedFood.code, true);
      if (cancelled || !item) return;
      setOffNutritionLookup(item);
      const sug = item.suggestedServingGrams;
      if (typeof sug === 'number' && sug > 0 && sug <= 2000) {
        setServingGrams(String(Math.round(sug)));
        setServingHint(
          item.servingSize
            ? selectedFood.code.startsWith('usda:')
              ? `Prefilled ${Math.round(sug)} g from USDA serving data (${item.servingSize}). Adjust if needed.`
              : `Prefilled ${Math.round(sug)} g from the label (“${item.servingSize}”). Change if your portion differs.`
            : `Prefilled ${Math.round(sug)} g from product data — verify on the package.`,
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFood?.code, cloudSignedIn]);

  useEffect(() => {
    if (!selectedFood?.code?.startsWith('custom:')) return;
    setOffNutritionLookup(null);
    const id = selectedFood.code.slice('custom:'.length);
    const f = customFoods.find((x) => x.id === id);
    const def = f?.defaultServingGrams ?? 100;
    setServingGrams(String(def));
    setServingHint(
      f?.defaultServingGrams
        ? `Default is your usual ${def} g — tap a quick amount or type any weight.`
        : 'Everything is stored per 100 g (like nutrition labels); type how much you actually ate.',
    );
  }, [nutritionCustomServingKey]);

  useEffect(() => {
    let cancelled = false;
    getExerciseImageMap(exercisesToResolveImages)
      .then((r) => { if (!cancelled) setExerciseImages((c) => ({ ...c, ...r })); })
      .catch(() => { /* silent */ });
    return () => { cancelled = true; };
  }, [exercisesToResolveImages]);

  function createNutritionLogId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return `food-${crypto.randomUUID()}`;
    }
    return `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function formatMacro(value: number) {
    return Math.round(value * 10) / 10;
  }

  function formatNutritionApiError(json: any, fallback: string): string {
    if (!json) return fallback;
    const base = typeof json.error === 'string' ? json.error : fallback;
    const status = typeof json.status === 'number' ? ` (status ${json.status})` : '';
    const details = typeof json.details === 'string' && json.details.trim()
      ? ` — ${json.details.trim()}`
      : '';
    return `${base}${status}${details}`.trim();
  }

  function runNutritionSearch() {
    if (!cloudSignedIn) {
      setMessage('Sign in to search USDA and Open Food Facts.');
      return;
    }
    const term = nutritionQuery.trim();
    if (term.length < 2) {
      setMessage('Enter at least 2 characters, then click Search (or press Enter).');
      return;
    }
    nutritionSearchAbortRef.current?.abort();
    const controller = new AbortController();
    nutritionSearchAbortRef.current = controller;
    setNutritionLoading(true);
    setNutritionError(null);
    fetch(`/api/gym-flow/nutrition/search?query=${encodeURIComponent(term)}`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(async (r) => {
        let json: unknown = {};
        try {
          json = await r.json();
        } catch {
          json = {};
        }
        return { ok: r.ok, json };
      })
      .then(({ ok, json }) => {
        if (!ok) {
          setNutritionError(formatNutritionApiError(json, 'Search failed'));
          setNutritionResults([]);
          return;
        }
        const payload = json as { items?: NutritionSearchItem[] };
        setNutritionResults(Array.isArray(payload.items) ? payload.items : []);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setNutritionError('Search failed');
      })
      .finally(() => {
        if (nutritionSearchAbortRef.current === controller) {
          nutritionSearchAbortRef.current = null;
        }
        setNutritionLoading(false);
      });
  }

  function computeMacros(per100g: NutritionGoals, grams: number) {
    const factor = grams / 100;
    return {
      calories: formatMacro(per100g.calories * factor),
      protein: formatMacro(per100g.protein * factor),
      carbs: formatMacro(per100g.carbs * factor),
      fat: formatMacro(per100g.fat * factor),
      fiber: formatMacro((per100g.fiber ?? 0) * factor),
    };
  }

  function persist(next: PersistedGymData) {
    setData(next);
    savePersistedGymData(next);
  }

  async function fetchNutritionItem(code: string, silent = false): Promise<NutritionItemDetail | null> {
    const res = await fetch(`/api/gym-flow/nutrition/item?code=${encodeURIComponent(code)}`, {
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = formatNutritionApiError(json, 'Could not load nutrition data');
      if (!silent) {
        setMessage(err);
        setNutritionError(err);
      }
      return null;
    }
    return (json?.item as NutritionItemDetail) ?? null;
  }

  async function addNutritionLog() {
    if (!selectedFood) {
      setMessage('Select a food first.');
      return;
    }
    const grams = Number.parseFloat(servingGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      setMessage('Enter a valid serving size in grams.');
      return;
    }

    const isCustom = selectedFood.code.startsWith('custom:');
    if (!isCustom && !cloudSignedIn) {
      setMessage('Sign in to log foods from the database (USDA + Open Food Facts), or choose a My food item.');
      return;
    }

    let per100g: NutritionGoals;
    let name: string;
    let code: string;

    if (isCustom) {
      const id = selectedFood.code.slice('custom:'.length);
      const food = customFoods.find((f) => f.id === id);
      if (!food) {
        setMessage('My food item not found.');
        return;
      }
      per100g = {
        calories: food.caloriesPer100g,
        protein: food.proteinPer100g,
        carbs: food.carbsPer100g,
        fat: food.fatPer100g,
        fiber: food.fiberPer100g ?? 0,
      };
      name = food.name;
      code = selectedFood.code;
    } else {
      setNutritionBusy(true);
      const cached =
        offNutritionLookup && offNutritionLookup.code === selectedFood.code ? offNutritionLookup : null;
      const item = cached ?? (await fetchNutritionItem(selectedFood.code));
      setNutritionBusy(false);
      if (!item) return;
      per100g = item.per100g;
      name = item.name;
      code = item.code;
    }

    const macros = computeMacros(per100g, grams);
    const log: NutritionLog = {
      id: createNutritionLogId(),
      date: nutritionDate,
      code,
      name,
      servingGrams: grams,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
      caloriesPer100g: per100g.calories,
      proteinPer100g: per100g.protein,
      carbsPer100g: per100g.carbs,
      fatPer100g: per100g.fat,
      fiberPer100g: per100g.fiber ?? 0,
      createdAt: new Date().toISOString(),
    };

    const base = dataRef.current;
    const nextLogs = [log, ...(base.nutritionLogs ?? [])];
    persist({
      ...base,
      nutritionLogs: nextLogs,
      nutritionGoals: { ...DEFAULT_NUTRITION_GOALS, ...(base.nutritionGoals ?? {}) },
    });
    setSelectedFood(null);
    setServingGrams('100');
    setNutritionQuery('');
    setNutritionResults([]);
    setMessage('Food logged.');
  }

  function createCustomFoodId() {
    return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function saveMyFoodFromNutritionTab() {
    const name = newMyFoodName.trim();
    if (!name) {
      setMessage('Enter a name for your food.');
      return;
    }

    let per100g: NutritionGoals | null = null;
    let defaultServing: number | undefined;

    if (myFoodEntryMode === 'portion') {
      const pg = Number.parseFloat(newMyPortionGrams);
      const cals = Number.parseFloat(newMyFoodCals);
      const p = Number.parseFloat(newMyFoodP);
      const c = Number.parseFloat(newMyFoodC);
      const f = Number.parseFloat(newMyFoodF);
      const fibParsed = Number.parseFloat(newMyFoodFiber);
      const fib = Number.isFinite(fibParsed) && fibParsed >= 0 ? fibParsed : 0;
      if (![pg, cals, p, c, f].every((x) => Number.isFinite(x)) || pg <= 0 || cals < 0 || p < 0 || c < 0 || f < 0) {
        setMessage('Enter portion weight and macros for that one portion.');
        return;
      }
      per100g = portionMacrosToPer100g(pg, cals, p, c, f, fib);
      if (!per100g) {
        setMessage('Could not compute nutrition.');
        return;
      }
      defaultServing = Math.min(5000, Math.round(pg));
    } else {
      const cals = Number.parseFloat(newMyFoodCals);
      const p = Number.parseFloat(newMyFoodP);
      const c = Number.parseFloat(newMyFoodC);
      const f = Number.parseFloat(newMyFoodF);
      const fibParsed = Number.parseFloat(newMyFoodFiber);
      const fib = Number.isFinite(fibParsed) && fibParsed >= 0 ? fibParsed : 0;
      if (![cals, p, c, f].every((x) => Number.isFinite(x)) || cals < 0 || p < 0 || c < 0 || f < 0) {
        setMessage('Enter valid macros per 100g (numbers from the nutrition label).');
        return;
      }
      per100g = {
        calories: formatMacro(cals),
        protein: formatMacro(p),
        carbs: formatMacro(c),
        fat: formatMacro(f),
        fiber: formatMacro(fib),
      };
      const usual = Number.parseFloat(newMyUsualGrams);
      if (Number.isFinite(usual) && usual > 0 && usual <= 5000) {
        defaultServing = Math.round(usual);
      }
    }

    const food: CustomFood = {
      id: createCustomFoodId(),
      name,
      createdAt: new Date().toISOString(),
      caloriesPer100g: per100g.calories,
      proteinPer100g: per100g.protein,
      carbsPer100g: per100g.carbs,
      fatPer100g: per100g.fat,
      ...(per100g.fiber > 0 ? { fiberPer100g: per100g.fiber } : {}),
      ...(defaultServing != null ? { defaultServingGrams: defaultServing } : {}),
    };
    const base = dataRef.current;
    persist({ ...base, customFoods: [food, ...(base.customFoods ?? [])] });
    setNewMyFoodName('');
    setMessage(`Saved “${name}” to My foods.`);
  }

  function applySuggestedNutritionGoals() {
    if (!suggestedNutritionGoals) {
      setMessage('Fill weight, height, and age in Settings for an estimate.');
      return;
    }
    updateNutritionGoals(suggestedNutritionGoals);
    setMessage('Daily targets updated from your profile (you can still edit them).');
  }

  function updateNutritionGoals(next: Partial<NutritionGoals>) {
    const base = dataRef.current;
    const merged = { ...DEFAULT_NUTRITION_GOALS, ...(base.nutritionGoals ?? {}), ...next };
    persist({ ...base, nutritionGoals: merged, nutritionLogs: base.nutritionLogs ?? [] });
  }

  function startEditNutritionLog(log: NutritionLog) {
    setEditingLogId(log.id);
    setEditingGrams(String(log.servingGrams));
  }

  function saveEditedNutritionLog(log: NutritionLog) {
    const grams = Number.parseFloat(editingGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      setMessage('Enter a valid serving size in grams.');
      return;
    }
    const macros = computeMacros(
      {
        calories: log.caloriesPer100g,
        protein: log.proteinPer100g,
        carbs: log.carbsPer100g,
        fat: log.fatPer100g,
        fiber: log.fiberPer100g ?? 0,
      },
      grams,
    );
    const base = dataRef.current;
    const nextLogs = (base.nutritionLogs ?? []).map((l) =>
      l.id === log.id
        ? {
            ...l,
            servingGrams: grams,
            calories: macros.calories,
            protein: macros.protein,
            carbs: macros.carbs,
            fat: macros.fat,
            fiber: macros.fiber,
          }
        : l,
    );
    persist({ ...base, nutritionLogs: nextLogs, nutritionGoals: { ...DEFAULT_NUTRITION_GOALS, ...(base.nutritionGoals ?? {}) } });
    setEditingLogId(null);
    setEditingGrams('');
  }

  function deleteNutritionLog(id: string) {
    const base = dataRef.current;
    const nextLogs = (base.nutritionLogs ?? []).filter((l) => l.id !== id);
    persist({ ...base, nutritionLogs: nextLogs, nutritionGoals: { ...DEFAULT_NUTRITION_GOALS, ...(base.nutritionGoals ?? {}) } });
  }

  function syncReportProfileFromMerged(merged: PersistedGymData) {
    if (!merged.userProfile) return;
    setReportProfile((prev) => ({ ...prev, ...merged.userProfile }));
  }

  function patchReportProfile(patch: Partial<UserProfile>) {
    setProfileCloudError(null);
    setReportProfile((prev) => ({ ...prev, ...patch }));
    setData((d) => ({
      ...d,
      userProfile: { ...d.userProfile, ...patch },
    }));
  }

  async function saveProfileOnline() {
    if (!cloudSignedIn) {
      setMessage('Sign in to save your profile online.');
      return;
    }
    setProfileCloudBusy(true);
    setProfileCloudError(null);
    const userProfile: UserProfile = {
      name: reportProfile.name || '',
      weight: reportProfile.weight || '',
      weightUnit: reportProfile.weightUnit === 'lbs' ? 'lbs' : 'kg',
      height: reportProfile.height || '',
      heightUnit: reportProfile.heightUnit === 'ft' ? 'ft' : 'cm',
      age: reportProfile.age || '',
      sex: reportProfile.sex,
    };
    const res = await saveUserProfileCloud(userProfile);
    setProfileCloudBusy(false);
    if (res.ok) {
      setMessage('Profile saved online.');
    } else {
      setProfileCloudError(res.error ?? 'Could not save');
    }
  }

  const cloudHydratedRef = useRef(false);
  useEffect(() => {
    if (cloudHydratedRef.current) return;
    cloudHydratedRef.current = true;
    void hydrateFromCloudIfSignedIn(() => dataRef.current, (merged) => {
      setData(merged);
      syncReportProfileFromMerged(merged);
    });
  }, []);

  useEffect(() => {
    void fetchAuthSession().then((s) => setCloudSignedIn(!!s?.user?.id));
  }, []);

  useEffect(() => {
    function onMsg(e: MessageEvent) {
      if (!isTrustedGymFlowOAuthOrigin(e.origin)) return;
      if (e.data?.type !== GYM_FLOW_OAUTH_SUCCESS) return;
      setCloudSignedIn(true);
      resetCloudHydrationCursor();
      void hydrateFromCloudIfSignedIn(() => dataRef.current, (merged) => {
        setData(merged);
        syncReportProfileFromMerged(merged);
      });
      setMessage('Signed in — cloud backup on.');
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

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

      const dataUrl = await toJpeg(reportEl, {
        quality: 0.92,
        backgroundColor: '#07080c',
        cacheBust: true,
        width: 1280,
        height: 800,
        pixelRatio: 2,
        style: {
          display: 'flex',
          visibility: 'visible',
          position: 'static',
          transform: 'none',
        },
      });

      const link = document.createElement('a');
      link.download = `Gym-Flow-Report-${new Date().toISOString().split('T')[0]}.jpg`;
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
    setReportProfile({});
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
    const result = commitWorkoutSession({
      data,
      exerciseOrderIds: selectedExerciseIds,
      exerciseDrafts,
      exerciseById,
      sourcePlanId: editingSavedPlanId,
    });
    if (!result.ok) { setMessage(result.error); return; }
    persist(result.nextData);
    setSelectedExerciseIds([]); setExerciseDrafts({});
    setView('activity');
    setActiveRoutineName(null); setEditingSavedPlanId(null);
    setMessage(`${result.completedCount} move${result.completedCount === 1 ? '' : 's'} saved.`);
  }

  const isMainView = view === 'home' || view === 'activity' || view === 'nutrition' || view === 'library';

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
            <div className="home-cloud-row">
              {cloudSignedIn ? (
                <p className="home-cloud-link home-cloud-link--signed-in">
                  <span>Cloud backup on</span>
                  {' · '}
                  <a href="/gym-flow-account/">Account</a>
                </p>
              ) : (
                <>
                  <button
                    type="button"
                    className="home-signin-btn"
                    onClick={() => {
                      openGymFlowSignIn();
                    }}
                  >
                    Sign in
                  </button>
                  <p className="home-cloud-link home-cloud-link--secondary">
                    <a href={getGymFlowSignInPopupUrl()} target="_blank" rel="opener">
                      Open sign-in in new tab
                    </a>
                    {' · '}
                    <a href="/gym-flow-account/">Full account page</a>
                  </p>
                </>
              )}
            </div>

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
                      {sortedSavedPlans.map((plan) => {
                        const entries = orderedPlanEntries(plan, allExercises);
                        const lastUsed = getLastPlanSessionDate(plan.id, data.sessions);
                        return (
                          <li key={plan.id} className="plan-card-home">
                            <div className="plan-card-home-row">
                              <div className="plan-card-home-info">
                                <span className="plan-card-home-name">{plan.name}</span>
                                <span className="plan-card-home-sub">
                                  {planCardActivitySubline(entries.length, lastUsed)}
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

            {presetCategoriesSorted.map((category) => (
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
                      const lastUsed = getLastPlanSessionDate(plan.id, data.sessions);
                      return (
                        <li key={plan.id} className="plan-card-home">
                          <div className="plan-card-home-row">
                            <div className="plan-card-home-info">
                              <span className="plan-card-home-name">{plan.name}</span>
                              <span className="plan-card-home-sub">{planCardActivitySubline(entries.length, lastUsed)}</span>
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
              <WorkoutCalendar
                sessions={data.sessions}
                allExercises={allExercises}
                mealDayKeys={mealDayKeys}
                onDayClick={setSelectedCalendarDay}
              />
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

        {/* ── NUTRITION ─────────────────────────────────────────────── */}
        {view === 'nutrition' && (
          <>
            {!cloudSignedIn && (
              <section className="panel panel--compact nutrition-signin-nudge">
                <p className="panel-subtle" style={{ margin: 0 }}>
                  Sign in to search USDA and Open Food Facts and sync your log.
                </p>
                <button type="button" className="button" style={{ marginTop: '0.5rem' }} onClick={openGymFlowSignIn}>
                  Sign in
                </button>
              </section>
            )}

            <section className="panel nutrition-log-food-panel">
              <h2 className="panel-heading panel-heading--plain">Log food</h2>
              <div className="nutrition-search-row">
                <input
                  className="text-input nutrition-search-input"
                  type="text"
                  placeholder="Search foods…"
                  value={nutritionQuery}
                  onChange={(e) => setNutritionQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      runNutritionSearch();
                    }
                  }}
                />
                <button
                  type="button"
                  className="button button-primary nutrition-search-submit"
                  disabled={nutritionLoading || !cloudSignedIn}
                  onClick={runNutritionSearch}
                >
                  {nutritionLoading ? 'Searching…' : 'Search'}
                </button>
              </div>
              {cloudSignedIn && nutritionLoading ? (
                <p className="panel-subtle nutrition-loading-hint">Searching…</p>
              ) : null}
              {nutritionError && (
                <p className="panel-subtle nutrition-error" role="alert">
                  {nutritionError}
                </p>
              )}
              {displayNutritionResults.length > 0 && (
                <ul className="nutrition-search-list">
                  {displayNutritionResults.map((item) => (
                    <li key={item.code} className="nutrition-search-item">
                      <button
                        type="button"
                        className={`nutrition-search-btn ${selectedFood?.code === item.code ? 'is-selected' : ''}`}
                        onClick={() => setSelectedFood(item)}
                      >
                        {item.image && (
                          <img src={item.image} alt="" className="nutrition-search-thumb" />
                        )}
                        <div className="nutrition-search-text">
                          <span className="nutrition-search-name">{item.name}</span>
                          <span className="nutrition-search-meta">
                            {item.brands || item.quantity || item.servingSize || 'Database'}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {selectedFood && (
                <div className="nutrition-add-block">
                  <div className="nutrition-selected">
                    <strong>{selectedFood.name}</strong>
                    <span>{selectedFood.brands || selectedFood.quantity || selectedFood.servingSize || 'Database'}</span>
                  </div>
                  {servingHint && <p className="panel-subtle nutrition-serving-hint">{servingHint}</p>}
                  <div className="nutrition-grams nutrition-grams-with-chips">
                    <label className="nutrition-grams-label">
                      <span>Amount eaten (g)</span>
                      <div className="nutrition-grams-row">
                        <input
                          className="text-input"
                          type="number"
                          min="1"
                          step="1"
                          value={servingGrams}
                          onChange={(e) => setServingGrams(e.target.value)}
                        />
                        <span className="nutrition-grams-unit">g</span>
                      </div>
                    </label>
                    <div className="nutrition-gram-chips" role="group" aria-label="Quick amounts in grams">
                      {[50, 75, 100, 125, 150, 200, 250].map((g) => (
                        <button key={g} type="button" className="chip chip-compact" onClick={() => setServingGrams(String(g))}>
                          {g}g
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" className="button" disabled={nutritionBusy} onClick={() => void addNutritionLog()}>
                    {nutritionBusy ? 'Adding…' : 'Add to log'}
                  </button>
                </div>
              )}
            </section>

            <section className="panel nutrition-panel-lead">
              <div className="nutrition-panel-title-top">
                <div>
                  <h2 className="panel-heading panel-heading--plain nutrition-hero-heading">Nutrition</h2>
                </div>
                <div className="nutrition-panel-controls">
                  <label className="nutrition-date">
                    <span>Day</span>
                    <input
                      className="text-input"
                      type="date"
                      value={nutritionDate}
                      onChange={(e) => setNutritionDate(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={`chip chip-compact ${nutritionDate === localTodayDateKey() ? 'chip-active' : ''}`}
                    onClick={() => setNutritionDate(localTodayDateKey())}
                  >
                    Today
                  </button>
                  <div className="nutrition-trend-window" role="group" aria-label="Overview period (days ending on selected day)">
                    <span className="nutrition-trend-window-label">Period</span>
                    {[1, 7, 10, 30, 90].map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={`chip chip-compact ${nutritionTrendDays === d ? 'chip-active' : ''}`}
                        onClick={() => setNutritionTrendDays(d)}
                      >
                        {d}d
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="nutrition-overview-stack">
                <TodayConcentricGoalRings
                  totals={nutritionConcentricTotals}
                  goals={nutritionGoals}
                  endDateKey={nutritionDate}
                  periodDays={nutritionTrendDays}
                />
                {nutritionTrendDays === 1 ? (
                  <TodayMealEnergyRows logs={todayMealShares} dayTotalKcal={nutritionTotals.calories} />
                ) : null}
              </div>
              {nutritionTrendDays > 1 ? (
                <p className="nutrition-averages-line nutrition-averages-line--inline">
                  Avg · {nutritionTrendDays}d ending {nutritionDate} · {formatMacro(nutritionWindowAverages.calories)} kcal · P{' '}
                  {formatMacro(nutritionWindowAverages.protein)} · C {formatMacro(nutritionWindowAverages.carbs)} · F{' '}
                  {formatMacro(nutritionWindowAverages.fat)} · Fiber {formatMacro(nutritionWindowAverages.fiber)}
                </p>
              ) : null}
              <WeekNutrientStrips
                days={nutritionWindowByDay}
                goals={nutritionGoals}
                highlightDateKey={nutritionDate}
              />
            </section>

            <section className="panel panel--compact">
              <div
                className="nutrition-collapse-header"
                role="button"
                tabIndex={0}
                onClick={() => toggleSection('nutrition-my-foods')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection('nutrition-my-foods');
                  }
                }}
              >
                <h2 className="panel-heading panel-heading--plain">My foods</h2>
                <span className="nutrition-collapse-chevron" aria-hidden>
                  {collapsedSections['nutrition-my-foods'] ? '▼' : '▲'}
                </span>
              </div>
              {!collapsedSections['nutrition-my-foods'] ? (
                <>
                  <div className="nutrition-entry-toggle" role="tablist" aria-label="How to enter nutrition">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={myFoodEntryMode === 'portion'}
                      className={`nutrition-entry-toggle-btn ${myFoodEntryMode === 'portion' ? 'is-active' : ''}`}
                      onClick={() => setMyFoodEntryMode('portion')}
                    >
                      One portion (easiest)
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={myFoodEntryMode === 'per100g'}
                      className={`nutrition-entry-toggle-btn ${myFoodEntryMode === 'per100g' ? 'is-active' : ''}`}
                      onClick={() => setMyFoodEntryMode('per100g')}
                    >
                      From label (per 100g)
                    </button>
                  </div>
                  <div className="nutrition-goals-grid">
                    <label className="profile-field">
                      <span>Name</span>
                      <input
                        className="text-input"
                        value={newMyFoodName}
                        onChange={(e) => setNewMyFoodName(e.target.value)}
                        placeholder="e.g. Overnight oats"
                      />
                    </label>
                    {myFoodEntryMode === 'portion' ? (
                      <label className="profile-field">
                        <span>Portion weight (g)</span>
                        <input
                          className="text-input"
                          type="number"
                          min="1"
                          step="1"
                          value={newMyPortionGrams}
                          onChange={(e) => setNewMyPortionGrams(e.target.value)}
                          placeholder="Weigh what you actually eat once"
                        />
                      </label>
                    ) : (
                      <label className="profile-field">
                        <span>Usual amount when logging (g, optional)</span>
                        <input
                          className="text-input"
                          type="number"
                          min="1"
                          step="1"
                          value={newMyUsualGrams}
                          onChange={(e) => setNewMyUsualGrams(e.target.value)}
                          placeholder="e.g. 180 — pre-fills “Amount eaten”"
                        />
                      </label>
                    )}
                    <label className="profile-field">
                      <span>{myFoodEntryMode === 'portion' ? 'Calories (this portion)' : 'Calories / 100g'}</span>
                      <input className="text-input" type="number" min="0" step="1" value={newMyFoodCals} onChange={(e) => setNewMyFoodCals(e.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>{myFoodEntryMode === 'portion' ? 'Protein g (this portion)' : 'Protein g / 100g'}</span>
                      <input className="text-input" type="number" min="0" step="0.1" value={newMyFoodP} onChange={(e) => setNewMyFoodP(e.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>{myFoodEntryMode === 'portion' ? 'Carbs g (this portion)' : 'Carbs g / 100g'}</span>
                      <input className="text-input" type="number" min="0" step="0.1" value={newMyFoodC} onChange={(e) => setNewMyFoodC(e.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>{myFoodEntryMode === 'portion' ? 'Fat g (this portion)' : 'Fat g / 100g'}</span>
                      <input className="text-input" type="number" min="0" step="0.1" value={newMyFoodF} onChange={(e) => setNewMyFoodF(e.target.value)} />
                    </label>
                    <label className="profile-field">
                      <span>{myFoodEntryMode === 'portion' ? 'Fiber g (this portion)' : 'Fiber g / 100g'}</span>
                      <input className="text-input" type="number" min="0" step="0.1" value={newMyFoodFiber} onChange={(e) => setNewMyFoodFiber(e.target.value)} placeholder="0 if unknown" />
                    </label>
                  </div>
                  <button type="button" className="button" style={{ marginTop: '0.6rem' }} onClick={saveMyFoodFromNutritionTab}>
                    Save to My foods
                  </button>
                </>
              ) : null}
            </section>

            <section className="panel">
              <div
                className="nutrition-collapse-header"
                role="button"
                tabIndex={0}
                onClick={() => toggleSection('nutrition-logged-foods')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection('nutrition-logged-foods');
                  }
                }}
              >
                <div className="nutrition-collapse-header-titles">
                  <h2 className="panel-heading panel-heading--plain">Logged foods</h2>
                  <span className="panel-subtle">{dailyNutritionLogs.length} items</span>
                </div>
                <span className="nutrition-collapse-chevron" aria-hidden>
                  {collapsedSections['nutrition-logged-foods'] ? '▼' : '▲'}
                </span>
              </div>
              {!collapsedSections['nutrition-logged-foods'] ? (
                dailyNutritionLogs.length === 0 ? (
                  <p className="empty-text">No foods logged for this day yet.</p>
                ) : (
                  <div className="nutrition-log-list">
                    {dailyNutritionLogs.map((log) => (
                      <div key={log.id} className="nutrition-log-row">
                        <div className="nutrition-log-main">
                          <strong>{log.name}</strong>
                          <span className="nutrition-log-meta">{log.servingGrams}g · {formatMacro(log.calories)} kcal</span>
                          <span className="nutrition-log-macros">
                            P {formatMacro(log.protein)}g · C {formatMacro(log.carbs)}g · F {formatMacro(log.fat)}g · Fiber {formatMacro(log.fiber ?? 0)}g
                          </span>
                        </div>
                        <div className="nutrition-log-actions">
                          {editingLogId === log.id ? (
                            <>
                              <input
                                className="text-input nutrition-edit-input"
                                type="number"
                                min="1"
                                step="1"
                                value={editingGrams}
                                onChange={(e) => setEditingGrams(e.target.value)}
                              />
                              <button type="button" className="button button-small" onClick={() => saveEditedNutritionLog(log)}>
                                Save
                              </button>
                              <button type="button" className="button button-muted button-small" onClick={() => { setEditingLogId(null); setEditingGrams(''); }}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button type="button" className="button button-muted button-small" onClick={() => startEditNutritionLog(log)}>
                                Edit
                              </button>
                              <button type="button" className="button button-danger-muted button-small" onClick={() => deleteNutritionLog(log.id)}>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : null}
            </section>

            <section className="panel panel--compact">
              <div
                className="nutrition-collapse-header"
                role="button"
                tabIndex={0}
                onClick={() => toggleSection('nutrition-goals')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection('nutrition-goals');
                  }
                }}
              >
                <h2 className="panel-heading panel-heading--plain">Goals</h2>
                <span className="nutrition-collapse-chevron" aria-hidden>
                  {collapsedSections['nutrition-goals'] ? '▼' : '▲'}
                </span>
              </div>
              {!collapsedSections['nutrition-goals'] ? (
                <>
                  <p className="panel-subtle nutrition-goals-hint">
                    {suggestedNutritionGoals ? (
                      <>
                        Suggested from profile: {suggestedNutritionGoals.calories} kcal · P {suggestedNutritionGoals.protein} · C {suggestedNutritionGoals.carbs} · F{' '}
                        {suggestedNutritionGoals.fat} · Fiber {suggestedNutritionGoals.fiber}.{` `}
                        <button type="button" className="text-button" onClick={applySuggestedNutritionGoals}>
                          Apply
                        </button>
                      </>
                    ) : (
                      <>Set weight, height, and age in Settings for suggestions.</>
                    )}
                  </p>
                  <div className="nutrition-goals-grid">
                    <label className="profile-field">
                      <span>Calories (kcal)</span>
                      <input
                        className="text-input"
                        type="number"
                        min="0"
                        step="1"
                        value={nutritionGoals.calories}
                        onChange={(e) => updateNutritionGoals({ calories: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Protein (g)</span>
                      <input
                        className="text-input"
                        type="number"
                        min="0"
                        step="1"
                        value={nutritionGoals.protein}
                        onChange={(e) => updateNutritionGoals({ protein: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Carbs (g)</span>
                      <input
                        className="text-input"
                        type="number"
                        min="0"
                        step="1"
                        value={nutritionGoals.carbs}
                        onChange={(e) => updateNutritionGoals({ carbs: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Fat (g)</span>
                      <input
                        className="text-input"
                        type="number"
                        min="0"
                        step="1"
                        value={nutritionGoals.fat}
                        onChange={(e) => updateNutritionGoals({ fat: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="profile-field">
                      <span>Fiber (g)</span>
                      <input
                        className="text-input"
                        type="number"
                        min="0"
                        step="1"
                        value={nutritionGoals.fiber}
                        onChange={(e) => updateNutritionGoals({ fiber: Number(e.target.value) || 0 })}
                      />
                    </label>
                  </div>
                </>
              ) : null}
            </section>
          </>
        )}

        {/* ── SETTINGS ──────────────────────────────────────────────── */}
        {view === 'library' && (
          <>
            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Your Profile</h2>
              <p className="panel-subtle">
                Used for your PDF training report. When you are signed in, use <strong>Save profile online</strong> to
                update your account.
              </p>
              <div className="profile-form">
                <label className="profile-field">
                  <span>Name</span>
                  <input
                    className="text-input"
                    type="text"
                    placeholder="e.g. Alex Smith"
                    value={reportProfile.name || ''}
                    onChange={(e) => patchReportProfile({ name: e.target.value })}
                  />
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <label className="profile-field">
                    <span>Weight</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <input
                        className="text-input"
                        type="text"
                        placeholder="75"
                        style={{ flex: 1 }}
                        value={reportProfile.weight || ''}
                        onChange={(e) => patchReportProfile({ weight: e.target.value })}
                      />
                      <select
                        className="select-input"
                        style={{ width: 56 }}
                        value={reportProfile.weightUnit || 'kg'}
                        onChange={(e) =>
                          patchReportProfile({
                            weightUnit: e.target.value === 'lbs' ? 'lbs' : 'kg',
                          })
                        }
                      >
                        <option value="kg">kg</option>
                        <option value="lbs">lbs</option>
                      </select>
                    </div>
                  </label>
                  <label className="profile-field">
                    <span>Height</span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {reportProfile.heightUnit === 'ft' ? (
                        <>
                          <input
                            className="text-input"
                            type="number"
                            placeholder="5"
                            style={{ flex: 1 }}
                            value={(reportProfile.height || '').split("'")[0] || ''}
                            onChange={(e) => {
                              const i = (reportProfile.height || '').split("'")[1] || '';
                              patchReportProfile({ height: `${e.target.value}'${i}` });
                            }}
                          />
                          <input
                            className="text-input"
                            type="number"
                            placeholder="11"
                            style={{ flex: 1 }}
                            value={(reportProfile.height || '').split("'")[1] || ''}
                            onChange={(e) => {
                              const f = (reportProfile.height || '').split("'")[0] || '';
                              patchReportProfile({ height: `${f}'${e.target.value}` });
                            }}
                          />
                        </>
                      ) : (
                        <input
                          className="text-input"
                          type="text"
                          placeholder="175"
                          style={{ flex: 1 }}
                          value={reportProfile.height || ''}
                          onChange={(e) => patchReportProfile({ height: e.target.value })}
                        />
                      )}
                      <select
                        className="select-input"
                        style={{ width: 56 }}
                        value={reportProfile.heightUnit || 'cm'}
                        onChange={(e) =>
                          patchReportProfile({
                            heightUnit: e.target.value === 'ft' ? 'ft' : 'cm',
                          })
                        }
                      >
                        <option value="cm">cm</option>
                        <option value="ft">ft</option>
                      </select>
                    </div>
                  </label>
                </div>
                <label className="profile-field">
                  <span>Age</span>
                  <input
                    className="text-input"
                    type="text"
                    placeholder="28"
                    value={reportProfile.age || ''}
                    onChange={(e) => patchReportProfile({ age: e.target.value })}
                  />
                </label>
                <label className="profile-field">
                  <span>Sex (for nutrition estimate)</span>
                  <select
                    className="select-input"
                    value={reportProfile.sex ?? ''}
                    onChange={(e) =>
                      patchReportProfile({
                        sex:
                          e.target.value === 'female'
                            ? 'female'
                            : e.target.value === 'male'
                              ? 'male'
                              : undefined,
                      })
                    }
                  >
                    <option value="">Prefer not to say (uses male formula)</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>
                <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="button"
                    disabled={profileCloudBusy || !cloudSignedIn}
                    onClick={() => void saveProfileOnline()}
                  >
                    {profileCloudBusy ? 'Saving…' : 'Save profile online'}
                  </button>
                  {!cloudSignedIn && (
                    <span className="panel-subtle" style={{ margin: 0 }}>
                      Sign in from Home to enable online save.
                    </span>
                  )}
                </div>
                {profileCloudError && (
                  <p className="panel-subtle" style={{ margin: '0.5rem 0 0', color: '#fca5a5' }} role="alert">
                    {profileCloudError}
                  </p>
                )}
              </div>
            </section>

            <section className="panel panel--compact">
              <h2 className="panel-heading panel-heading--plain">Export Report</h2>
              <p className="panel-subtle">Choose your preferred format. Save as Image downloads a JPEG (good for mobile sharing).</p>
              
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
          <button className={`bnav-btn ${view === 'nutrition' ? 'bnav-btn--active' : ''}`} onClick={() => setView('nutrition')}>
            <span className="bnav-icon">🥗</span>
            <span className="bnav-label">Nutrition</span>
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
      topExercises,
      neglectedMuscles,
      recentSessions: groupedSessions.slice(0, 12).map(s => ({ date: s.date, groups: s.groups, entries: s.entries })),
      weeklyData,
      nutrition: printReportNutrition,
    }} selectedGroups={selectedGroups} />

    {selectedCalendarDay && (
      <DayActivityModal
        dateKey={selectedCalendarDay}
        sessions={data.sessions}
        allExercises={allExercises}
        savedPlans={data.savedPlans}
        nutritionLogs={data.nutritionLogs ?? []}
        customFoods={data.customFoods ?? []}
        cloudSignedIn={cloudSignedIn}
        onClose={() => setSelectedCalendarDay(null)}
        onPersist={(patch) => {
          persist({ ...dataRef.current, ...patch });
        }}
      />
    )}
    </>
  );
}
