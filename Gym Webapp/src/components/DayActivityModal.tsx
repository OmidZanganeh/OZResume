import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Exercise, MuscleGroup } from '../data/exerciseLibrary';
import { MUSCLE_GROUPS } from '../data/exerciseLibrary';
import type { CustomFood, NutritionGoals, NutritionLog } from '../data/gymFlowStorage';
import type { SavedPlan } from '../data/gymFlowStorage';
import {
  buildHistoricalSessionForDate,
  createHistorySessionDate,
  recomputeStatsFromSessions,
} from '../utils/historySeed';
import { nutritionLogDateKey } from '../utils/nutritionGoalsFromProfile';
import { portionMacrosToPer100g } from '../utils/nutritionServing';
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

export type DayActivityPersistPatch = {
  sessions?: WorkoutSession[];
  stats?: Record<string, ExerciseStat>;
  nutritionLogs?: NutritionLog[];
  customFoods?: CustomFood[];
};

type Props = {
  dateKey: string;
  sessions: WorkoutSession[];
  allExercises: Exercise[];
  savedPlans: SavedPlan[];
  nutritionLogs: NutritionLog[];
  customFoods: CustomFood[];
  cloudSignedIn: boolean;
  onClose: () => void;
  onPersist: (patch: DayActivityPersistPatch) => void;
};

function createNutritionLogId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `food-${crypto.randomUUID()}`;
  }
  return `food-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createCustomFoodId() {
  return `cf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMacro(value: number) {
  return Math.round(value * 10) / 10;
}

function formatNutritionApiError(json: unknown, fallback: string): string {
  if (!json || typeof json !== 'object') return fallback;
  const o = json as Record<string, unknown>;
  const base = typeof o.error === 'string' ? o.error : fallback;
  const status = typeof o.status === 'number' ? ` (status ${o.status})` : '';
  const details = typeof o.details === 'string' && o.details.trim() ? ` — ${o.details.trim()}` : '';
  return `${base}${status}${details}`.trim();
}

export function DayActivityModal({
  dateKey,
  sessions,
  allExercises,
  savedPlans,
  nutritionLogs,
  customFoods,
  cloudSignedIn,
  onClose,
  onPersist,
}: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedMuscles, setSelectedMuscles] = useState<Set<MuscleGroup>>(new Set());
  const [message, setMessage] = useState<string | null>(null);

  const [mealQuery, setMealQuery] = useState('');
  const mealSearchAbortRef = useRef<AbortController | null>(null);
  const [mealApiResults, setMealApiResults] = useState<NutritionSearchItem[]>([]);
  const [mealLoading, setMealLoading] = useState(false);
  const [mealError, setMealError] = useState<string | null>(null);
  const [selectedMealItem, setSelectedMealItem] = useState<NutritionSearchItem | null>(null);
  const [mealGrams, setMealGrams] = useState('100');
  const [mealBusy, setMealBusy] = useState(false);
  const [mealServingHint, setMealServingHint] = useState<string | null>(null);
  const [offMealLookup, setOffMealLookup] = useState<NutritionItemDetail | null>(null);

  const [newFoodName, setNewFoodName] = useState('');
  const [newFoodSaveMode, setNewFoodSaveMode] = useState<'per100g' | 'portion'>('portion');
  const [newFoodPortionGrams, setNewFoodPortionGrams] = useState('200');
  const [newFoodUsualGrams, setNewFoodUsualGrams] = useState('');
  const [newFoodCals, setNewFoodCals] = useState('200');
  const [newFoodP, setNewFoodP] = useState('10');
  const [newFoodC, setNewFoodC] = useState('20');
  const [newFoodF, setNewFoodF] = useState('5');
  const [newFoodFiber, setNewFoodFiber] = useState('0');

  const [addFoodOpen, setAddFoodOpen] = useState(false);
  const [customFoodOpen, setCustomFoodOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

  const dayMeals = useMemo(() => {
    return nutritionLogs.filter((l) => nutritionLogDateKey(l.date) === dateKey);
  }, [nutritionLogs, dateKey]);

  const mergedMealSearch = useMemo(() => {
    const q = mealQuery.trim().toLowerCase();
    const customMatches: NutritionSearchItem[] =
      q.length < 1
        ? []
        : customFoods
            .filter((f) => f.name.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((f) => ({
              code: `custom:${f.id}`,
              name: f.name,
              brands: 'My food',
            }));
    if (!cloudSignedIn) return customMatches;
    const codes = new Set(customMatches.map((i) => i.code));
    return [...customMatches, ...mealApiResults.filter((i) => !codes.has(i.code))];
  }, [mealQuery, customFoods, mealApiResults, cloudSignedIn]);

  useEffect(() => {
    mealSearchAbortRef.current?.abort();
    mealSearchAbortRef.current = null;
    setMealApiResults([]);
    setMealError(null);
    setMealLoading(false);
  }, [mealQuery]);

  useEffect(() => {
    if (!cloudSignedIn) {
      mealSearchAbortRef.current?.abort();
      mealSearchAbortRef.current = null;
      setMealApiResults([]);
      setMealLoading(false);
      setMealError(null);
    }
  }, [cloudSignedIn]);

  function runMealSearch() {
    if (!cloudSignedIn) {
      setMessage('Sign in to search the food database.');
      return;
    }
    const term = mealQuery.trim();
    if (term.length < 2) {
      setMessage('Type at least 2 characters to search.');
      return;
    }
    mealSearchAbortRef.current?.abort();
    const controller = new AbortController();
    mealSearchAbortRef.current = controller;
    setMealLoading(true);
    setMealError(null);
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
          setMealError(formatNutritionApiError(json, 'Search failed'));
          setMealApiResults([]);
          return;
        }
        const payload = json as { items?: NutritionSearchItem[] };
        setMealApiResults(Array.isArray(payload.items) ? payload.items : []);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setMealError('Search failed');
      })
      .finally(() => {
        if (mealSearchAbortRef.current === controller) {
          mealSearchAbortRef.current = null;
        }
        setMealLoading(false);
      });
  }

  async function fetchNutritionItem(code: string, silent = false): Promise<NutritionItemDetail | null> {
    const res = await fetch(`/api/gym-flow/nutrition/item?code=${encodeURIComponent(code)}`, {
      credentials: 'include',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (!silent) setMealError(formatNutritionApiError(json, 'Could not load nutrition data'));
      return null;
    }
    return (json?.item as NutritionItemDetail) ?? null;
  }

  const mealCustomServingKey = useMemo(() => {
    if (!selectedMealItem?.code?.startsWith('custom:')) return '';
    const id = selectedMealItem.code.slice('custom:'.length);
    const f = customFoods.find((x) => x.id === id);
    return `${id}:${f?.defaultServingGrams ?? 'na'}:${f?.fiberPer100g ?? 'na'}`;
  }, [selectedMealItem?.code, customFoods]);

  useEffect(() => {
    setOffMealLookup(null);
    setMealServingHint(null);
    if (!selectedMealItem) return;
    if (selectedMealItem.code.startsWith('custom:')) return;

    setMealGrams('100');
    setMealServingHint(selectedMealItem.servingSize ? `Label: ${selectedMealItem.servingSize}` : null);
    if (!cloudSignedIn) return;

    let cancelled = false;
    void (async () => {
      const item = await fetchNutritionItem(selectedMealItem.code, true);
      if (cancelled || !item) return;
      setOffMealLookup(item);
      const sug = item.suggestedServingGrams;
      if (typeof sug === 'number' && sug > 0 && sug <= 2000) {
        setMealGrams(String(Math.round(sug)));
        setMealServingHint(`Prefilled ${Math.round(sug)} g — adjust if needed.`);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedMealItem?.code, cloudSignedIn]);

  useEffect(() => {
    if (!selectedMealItem?.code?.startsWith('custom:')) return;
    setOffMealLookup(null);
    const id = selectedMealItem.code.slice('custom:'.length);
    const f = customFoods.find((x) => x.id === id);
    const def = f?.defaultServingGrams ?? 100;
    setMealGrams(String(def));
    setMealServingHint(f?.defaultServingGrams ? `Default ${def} g` : 'Amount in grams');
  }, [mealCustomServingKey]);

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
    const kept = sessions.filter((s) => s.id !== id);
    const stats = recomputeStatsFromSessions(kept);
    onPersist({ sessions: kept, stats });
    setMessage('Workout deleted.');
  }

  async function addMealLog() {
    setMealError(null);
    if (!selectedMealItem) {
      setMessage('Select a food first.');
      return;
    }
    const grams = Number.parseFloat(mealGrams);
    if (!Number.isFinite(grams) || grams <= 0) {
      setMessage('Enter a valid serving size in grams.');
      return;
    }

    let per100g: NutritionGoals;
    let name: string;
    let code: string;

    if (selectedMealItem.code.startsWith('custom:')) {
      const id = selectedMealItem.code.slice('custom:'.length);
      const food = customFoods.find((f) => f.id === id);
      if (!food) {
        setMessage('Custom food not found.');
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
      code = selectedMealItem.code;
    } else {
      if (!cloudSignedIn) {
        setMessage('Sign in to log catalog foods, or pick from My foods.');
        return;
      }
      setMealBusy(true);
      const cached =
        offMealLookup && offMealLookup.code === selectedMealItem.code ? offMealLookup : null;
      const item = cached ?? (await fetchNutritionItem(selectedMealItem.code));
      setMealBusy(false);
      if (!item) return;
      per100g = item.per100g;
      name = item.name;
      code = item.code;
    }

    const macros = computeMacros(per100g, grams);
    const log: NutritionLog = {
      id: createNutritionLogId(),
      date: dateKey,
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

    onPersist({ nutritionLogs: [log, ...nutritionLogs] });
    setSelectedMealItem(null);
    setMealGrams('100');
    setOffMealLookup(null);
    setMealServingHint(null);
    setMealQuery('');
    setMealApiResults([]);
    setMessage('Food logged.');
  }

  function deleteMeal(id: string) {
    onPersist({ nutritionLogs: nutritionLogs.filter((l) => l.id !== id) });
    setMessage('Food removed.');
  }

  function saveNewCustomFood() {
    const name = newFoodName.trim();
    if (!name) {
      setMessage('Enter a food name.');
      return;
    }

    let per100g: NutritionGoals | null = null;
    let defaultServing: number | undefined;

    if (newFoodSaveMode === 'portion') {
      const pg = Number.parseFloat(newFoodPortionGrams);
      const cals = Number.parseFloat(newFoodCals);
      const p = Number.parseFloat(newFoodP);
      const c = Number.parseFloat(newFoodC);
      const f = Number.parseFloat(newFoodF);
      const fibParsed = Number.parseFloat(newFoodFiber);
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
      const cals = Number.parseFloat(newFoodCals);
      const p = Number.parseFloat(newFoodP);
      const c = Number.parseFloat(newFoodC);
      const f = Number.parseFloat(newFoodF);
      const fibParsed = Number.parseFloat(newFoodFiber);
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
      const usual = Number.parseFloat(newFoodUsualGrams);
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
    onPersist({ customFoods: [food, ...customFoods] });
    setNewFoodName('');
    setMessage(`Saved “${name}” to My foods.`);
  }

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(dateKey + 'T12:00:00'));

  const content = (
    <div className="history-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="history-modal day-modal-content">
        <header className="history-modal-header">
          <h2 className="history-modal-title">{dateLabel}</h2>
          <button type="button" className="history-modal-close" onClick={onClose} aria-label="Close modal">×</button>
        </header>

        <div className="modal-body">
          {message && <div className="flash-message">{message}</div>}

          <div className="day-modal-section">
            <h3 className="panel-heading panel-heading--plain" style={{ marginBottom: '1rem' }}>Logged Workouts</h3>
            {daySessions.length === 0 ? (
              <p className="panel-subtle">No workouts logged on this day.</p>
            ) : (
              <div className="day-modal-sessions">
                {daySessions.map((s) => (
                  <div key={s.id} className="day-modal-session-card">
                    <div className="day-modal-session-info">
                      <div className="day-modal-session-groups">
                        {s.groups.length > 0 ? s.groups.map((g) => (
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
                className="text-input day-modal-select"
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

            <div className="day-modal-actions">
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

          <div className="day-modal-section" style={{ marginTop: '2rem' }}>
            <h3 className="panel-heading panel-heading--plain" style={{ marginBottom: '0.65rem' }}>Meals logged</h3>
            {dayMeals.length === 0 ? (
              <p className="panel-subtle">None yet.</p>
            ) : (
              <ul className="day-meal-list">
                {dayMeals.map((log) => (
                  <li key={log.id} className="day-meal-row">
                    <div>
                      <strong>{log.name}</strong>
                      <span className="panel-subtle" style={{ display: 'block', fontSize: '0.8rem', marginTop: 2 }}>
                        {log.servingGrams}g · {formatMacro(log.calories)} kcal · P {formatMacro(log.protein)} C {formatMacro(log.carbs)} F {formatMacro(log.fat)} · Fiber {formatMacro(log.fiber ?? 0)}
                      </span>
                    </div>
                    <button type="button" className="button button-danger-muted button--small" onClick={() => deleteMeal(log.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            )}

            <button
              type="button"
              className="day-modal-collapse-trigger"
              aria-expanded={addFoodOpen}
              onClick={() => setAddFoodOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setAddFoodOpen((o) => !o);
                }
              }}
            >
              <span>Add food</span>
              <span className="day-modal-collapse-chevron" aria-hidden>{addFoodOpen ? '▲' : '▼'}</span>
            </button>
            {addFoodOpen ? (
              <div className="day-modal-collapsible-body">
                <div className="form-group">
                  <label className="form-label" htmlFor="day-modal-meal-search">Search</label>
                  <div className="nutrition-search-row">
                    <input
                      id="day-modal-meal-search"
                      className="text-input nutrition-search-input"
                      type="text"
                      placeholder={cloudSignedIn ? 'Type to filter My foods, or search…' : 'Type to filter My foods'}
                      value={mealQuery}
                      onChange={(e) => setMealQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          runMealSearch();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="button button-primary nutrition-search-submit"
                      disabled={mealLoading || !cloudSignedIn}
                      onClick={runMealSearch}
                    >
                      {mealLoading ? '…' : 'Search'}
                    </button>
                  </div>
                </div>
                {mealError ? (
                  <p className="panel-subtle nutrition-error" role="alert">{mealError}</p>
                ) : null}
                {mergedMealSearch.length > 0 ? (
                  <ul className="nutrition-search-list nutrition-search-list--day-modal">
                    {mergedMealSearch.map((item) => {
                      const sub = item.brands || item.quantity || item.servingSize || '';
                      return (
                        <li key={item.code} className="nutrition-search-item">
                          <button
                            type="button"
                            className={`nutrition-search-btn ${selectedMealItem?.code === item.code ? 'is-selected' : ''}`}
                            onClick={() => setSelectedMealItem(item)}
                          >
                            <div className="nutrition-search-text">
                              <span className="nutrition-search-name">{item.name}</span>
                              {sub ? <span className="nutrition-search-meta">{sub}</span> : null}
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
                {selectedMealItem ? (
                  <div className="nutrition-add-block day-modal-nutrition-add">
                    <div className="form-group">
                      <label className="form-label" htmlFor="day-modal-meal-grams">
                        Grams · <strong>{selectedMealItem.name}</strong>
                      </label>
                      <div className="nutrition-grams nutrition-grams-with-chips">
                        <div className="nutrition-grams-row">
                          <input
                            id="day-modal-meal-grams"
                            className="text-input"
                            type="number"
                            min="1"
                            step="1"
                            value={mealGrams}
                            title={mealServingHint ?? undefined}
                            onChange={(e) => setMealGrams(e.target.value)}
                          />
                          <span className="nutrition-grams-unit">g</span>
                        </div>
                        <div className="nutrition-gram-chips" role="group" aria-label="Quick grams">
                          {[50, 75, 100, 125, 150, 200, 250].map((g) => (
                            <button key={g} type="button" className="chip chip-compact" onClick={() => setMealGrams(String(g))}>
                              {g}g
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="day-modal-actions">
                      <button type="button" className="button button-primary" disabled={mealBusy} onClick={() => void addMealLog()}>
                        {mealBusy ? 'Adding…' : 'Add food'}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <button
              type="button"
              className="day-modal-collapse-trigger day-modal-collapse-trigger--spaced"
              aria-expanded={customFoodOpen}
              onClick={() => setCustomFoodOpen((o) => !o)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setCustomFoodOpen((o) => !o);
                }
              }}
            >
              <span>Save custom food</span>
              <span className="day-modal-collapse-chevron" aria-hidden>{customFoodOpen ? '▲' : '▼'}</span>
            </button>
            {customFoodOpen ? (
              <div className="day-modal-collapsible-body">
                <div className="nutrition-entry-toggle" role="tablist" aria-label="Entry mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={newFoodSaveMode === 'portion'}
                    className={`nutrition-entry-toggle-btn ${newFoodSaveMode === 'portion' ? 'is-active' : ''}`}
                    onClick={() => setNewFoodSaveMode('portion')}
                  >
                    One portion
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={newFoodSaveMode === 'per100g'}
                    className={`nutrition-entry-toggle-btn ${newFoodSaveMode === 'per100g' ? 'is-active' : ''}`}
                    onClick={() => setNewFoodSaveMode('per100g')}
                  >
                    Per 100g
                  </button>
                </div>
                <div className="nutrition-goals-grid">
                  <label className="profile-field">
                    <span>Name</span>
                    <input className="text-input" value={newFoodName} onChange={(e) => setNewFoodName(e.target.value)} placeholder="Food name" />
                  </label>
                  {newFoodSaveMode === 'portion' ? (
                    <label className="profile-field">
                      <span>Portion weight (g)</span>
                      <input
                        className="text-input"
                        type="number"
                        min="1"
                        step="1"
                        value={newFoodPortionGrams}
                        onChange={(e) => setNewFoodPortionGrams(e.target.value)}
                        placeholder="g"
                      />
                    </label>
                  ) : (
                    <label className="profile-field">
                      <span>Default grams when logging (optional)</span>
                      <input
                        className="text-input"
                        type="number"
                        min="1"
                        step="1"
                        value={newFoodUsualGrams}
                        onChange={(e) => setNewFoodUsualGrams(e.target.value)}
                        placeholder="e.g. 180"
                      />
                    </label>
                  )}
                  <label className="profile-field">
                    <span>{newFoodSaveMode === 'portion' ? 'Calories (this portion)' : 'Calories / 100g'}</span>
                    <input className="text-input" type="number" min="0" step="1" value={newFoodCals} onChange={(e) => setNewFoodCals(e.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>{newFoodSaveMode === 'portion' ? 'Protein (g)' : 'Protein g / 100g'}</span>
                    <input className="text-input" type="number" min="0" step="0.1" value={newFoodP} onChange={(e) => setNewFoodP(e.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>{newFoodSaveMode === 'portion' ? 'Carbs (g)' : 'Carbs g / 100g'}</span>
                    <input className="text-input" type="number" min="0" step="0.1" value={newFoodC} onChange={(e) => setNewFoodC(e.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>{newFoodSaveMode === 'portion' ? 'Fat (g)' : 'Fat g / 100g'}</span>
                    <input className="text-input" type="number" min="0" step="0.1" value={newFoodF} onChange={(e) => setNewFoodF(e.target.value)} />
                  </label>
                  <label className="profile-field">
                    <span>{newFoodSaveMode === 'portion' ? 'Fiber (g)' : 'Fiber g / 100g'}</span>
                    <input className="text-input" type="number" min="0" step="0.1" value={newFoodFiber} onChange={(e) => setNewFoodFiber(e.target.value)} placeholder="0" />
                  </label>
                </div>
                <div className="day-modal-actions">
                  <button type="button" className="button button-muted" onClick={saveNewCustomFood}>
                    Save to My foods
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
