import { openImageDataUrlInBrowser } from './openImageInBrowser';
import { toPng } from 'html-to-image';
import type { Exercise } from '../data/exerciseTypes';
import type { SavedPlan, WorkoutSession } from '../data/gymFlowStorage';
import { resolvePlanExerciseIdsToCatalog } from '../data/migrateStorage';

const CAPTURE_WIDTH = 780;

export type PlanExportOptions = {
  plan: SavedPlan;
  allExercises: Exercise[];
  sessions?: WorkoutSession[];
  athleteName?: string;
};

type LastLog = {
  sets: number;
  reps: string;
  weight: string;
};

function formatExportDate(d = new Date()): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function lastLogForExercise(
  sessions: WorkoutSession[] | undefined,
  exerciseId: string,
): LastLog | null {
  if (!sessions?.length) return null;
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  for (const session of sorted) {
    const entry = session.entries.find((e) => e.exerciseId === exerciseId);
    if (entry && (entry.sets > 0 || entry.reps || entry.weight)) {
      return { sets: entry.sets, reps: entry.reps, weight: entry.weight };
    }
  }
  return null;
}

function formatLastLog(log: LastLog): string {
  const setsReps =
    log.sets > 0 && log.reps.trim()
      ? `${log.sets}×${log.reps.trim()}`
      : log.sets > 0
        ? `${log.sets} sets`
        : log.reps.trim()
          ? log.reps.trim()
          : '';
  const weight = log.weight.trim();
  if (setsReps && weight) return `${setsReps} · ${weight}`;
  return setsReps || weight || '';
}

function buildExportNode(opts: PlanExportOptions): HTMLElement {
  const { plan, allExercises, sessions, athleteName } = opts;
  const map = new Map(allExercises.map((e) => [e.id, e]));
  const ids = resolvePlanExerciseIdsToCatalog(plan.exerciseIds, allExercises);
  const exercises = ids
    .map((id) => map.get(id))
    .filter((e): e is Exercise => Boolean(e));

  const root = document.createElement('div');
  root.className = 'gf-plan-export';
  root.setAttribute('aria-hidden', 'true');

  const muscles =
    plan.muscleGroups.length > 0
      ? plan.muscleGroups
      : [...new Set(exercises.map((e) => e.primaryGroup))];

  const equipment =
    plan.equipment.length > 0
      ? plan.equipment
      : [
          ...new Set(
            exercises
              .map((e) => e.wrkoutEquipment)
              .filter((x): x is string => Boolean(x && x.trim())),
          ),
        ];

  const muscleChips = muscles
    .map((m) => `<span class="gf-plan-export__chip">${escapeHtml(m)}</span>`)
    .join('');

  const equipLine =
    equipment.length > 0
      ? `<p class="gf-plan-export__equip">${escapeHtml(equipment.join(' · '))}</p>`
      : '';

  const rows = exercises
    .map((ex, i) => {
      const targets = plan.exerciseMuscleTargets?.[ex.id];
      const focus =
        targets && targets.length > 0
          ? targets.join(', ')
          : [ex.primaryGroup, ...(ex.secondaryGroups ?? []).slice(0, 1)]
              .filter(Boolean)
              .join(' · ');
      const last = lastLogForExercise(sessions, ex.id);
      const lastLine = last ? formatLastLog(last) : '';
      const equip = ex.wrkoutEquipment?.trim()
        ? `<span class="gf-plan-export__ex-meta">${escapeHtml(ex.wrkoutEquipment)}</span>`
        : '';
      return `
        <li class="gf-plan-export__row">
          <span class="gf-plan-export__num">${String(i + 1).padStart(2, '0')}</span>
          <div class="gf-plan-export__ex">
            <span class="gf-plan-export__ex-name">${escapeHtml(ex.name)}</span>
            <span class="gf-plan-export__ex-focus">${escapeHtml(focus)}</span>
            ${equip}
          </div>
          <div class="gf-plan-export__cue">
            ${
              lastLine
                ? `<span class="gf-plan-export__last">${escapeHtml(lastLine)}</span><span class="gf-plan-export__last-label">Last</span>`
                : `<span class="gf-plan-export__blank">—</span><span class="gf-plan-export__last-label">Log</span>`
            }
          </div>
        </li>`;
    })
    .join('');

  const empty =
    exercises.length === 0
      ? `<p class="gf-plan-export__empty">No exercises in this plan yet.</p>`
      : '';

  const athlete = athleteName?.trim()
    ? `<p class="gf-plan-export__athlete">${escapeHtml(athleteName.trim())}</p>`
    : '';

  root.innerHTML = `
    <header class="gf-plan-export__header">
      <div class="gf-plan-export__brand">
        <span class="gf-plan-export__mark">GF</span>
        <div>
          <p class="gf-plan-export__app">Gym Flow</p>
          <p class="gf-plan-export__label">Workout plan</p>
        </div>
      </div>
      <div class="gf-plan-export__header-right">
        ${athlete}
        <p class="gf-plan-export__date">${escapeHtml(formatExportDate())}</p>
      </div>
    </header>

    <div class="gf-plan-export__title-block">
      <h1 class="gf-plan-export__title">${escapeHtml(plan.name)}</h1>
      <p class="gf-plan-export__summary">${exercises.length} exercise${exercises.length === 1 ? '' : 's'}${
        muscles.length ? ` · ${muscles.length} muscle group${muscles.length === 1 ? '' : 's'}` : ''
      }</p>
      <div class="gf-plan-export__chips">${muscleChips}</div>
      ${equipLine}
    </div>

    <div class="gf-plan-export__list-head">
      <span>#</span>
      <span>Exercise</span>
      <span>Target / last</span>
    </div>
    ${empty}
    <ol class="gf-plan-export__list">${rows}</ol>

    <footer class="gf-plan-export__footer">
      <span>Take this to the gym · check off as you go</span>
      <span>gym-flow</span>
    </footer>
  `;

  return root;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renders a tall phone-friendly plan card as PNG and opens it in the browser
 * so the user can save/share with native OS controls.
 */
export async function exportPlanAsImage(opts: PlanExportOptions): Promise<void> {
  const host = document.createElement('div');
  host.className = 'gf-plan-export-host';
  const node = buildExportNode(opts);
  host.appendChild(node);
  document.body.appendChild(host);

  try {
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: '#07080c',
      width: CAPTURE_WIDTH,
      style: {
        transform: 'none',
        width: `${CAPTURE_WIDTH}px`,
      },
    });

    openImageDataUrlInBrowser(dataUrl);
  } finally {
    host.remove();
  }
}
