import { useCallback, useEffect, useRef, useState } from 'react';
import { BodyChart, ViewSide, INTENSITY_COLORS } from 'body-muscles';
import { Wind, HeartPulse, Zap } from 'lucide-react';
import type { MuscleGroup } from '../data/exerciseLibrary';
import {
  buildBodyMusclesStateForTenDayGaps,
  getGroupForBodyMuscleId,
  MOTIVATION_GREEN_INTENSITY_SLOT,
  GROUP_TO_MUSCLE_IDS,
} from '../bodyMap/bodyMusclesMapping';
import { MUSCLE_GROUP_CALENDAR_COLOR } from './calendarMuscleColors';

/** Gym Flow heatmap slots (body-muscles intensity indices). */
const HEAT_GAP = 0;
const HEAT_ONCE = 5;
/** Slot 99: unhit regions in rainbow legend mode. */
const LEGEND_INACTIVE_SLOT = 99;

/** Needs work — rose, readable on dark without harsh pure red. */
(INTENSITY_COLORS as Record<number, string>)[HEAT_GAP] = '#f43f5e';
/** Hit once — warm amber, clearly between gap and “on track”. */
(INTENSITY_COLORS as Record<number, string>)[HEAT_ONCE] = '#fbbf24';
/** 2+ sessions — clear “on track” green (distinct from brand accent teal). */
(INTENSITY_COLORS as Record<number, string>)[MOTIVATION_GREEN_INTENSITY_SLOT] = '#22c55e';

// Initialize Rainbow Slots (100+) to avoid library defaults
const RAINBOW_START_SLOT = 100;
const GROUP_TO_RAINBOW_SLOT: Record<string, number> = {};
Object.keys(MUSCLE_GROUP_CALENDAR_COLOR).forEach((g, i) => {
  const slot = RAINBOW_START_SLOT + i;
  GROUP_TO_RAINBOW_SLOT[g] = slot;
  (INTENSITY_COLORS as Record<number, string>)[slot] = MUSCLE_GROUP_CALENDAR_COLOR[g as MuscleGroup];
});

/** Unhit muscle silhouettes in rainbow mode — cool slate, not flat black. */
(INTENSITY_COLORS as Record<number, string>)[LEGEND_INACTIVE_SLOT] = '#475569';

type Props = {
  practiceCounts: Map<MuscleGroup, number>;
  practiceWindowDays: number;
  selectedGroups: MuscleGroup[];
  onToggleGroup: (group: MuscleGroup) => void;
  /** When false, body regions and Cardio/Mobility pills are view-only (no tap-to-toggle). */
  allowRegionToggle?: boolean;
};

const ORPHAN_ICONS: Record<string, React.ReactNode> = {
  Cardio: <HeartPulse size={16} strokeWidth={1.8} />,
  Mobility: <Wind size={16} strokeWidth={1.8} />,
};

function OrphanPills({
  practiceCounts,
  practiceWindowDays,
  selectedGroups,
  onToggleGroup,
  interactive,
}: {
  practiceCounts: Map<MuscleGroup, number>;
  practiceWindowDays: number;
  selectedGroups: MuscleGroup[];
  onToggleGroup: (group: MuscleGroup) => void;
  interactive: boolean;
}) {
  const orphans: MuscleGroup[] = ['Cardio', 'Mobility'];
  return (
    <div className="orphan-pills" role="group" aria-label="Cardio and mobility">
      {orphans.map((g) => {
        const n = practiceCounts.get(g) ?? 0;
        const colorClass =
          n >= 2 ? 'orphan-pill--green' : n === 1 ? 'orphan-pill--orange' : 'orphan-pill--red';
        const selected = interactive && selectedGroups.includes(g);
        const title = `${g}: ${n} session(s) last ${practiceWindowDays} days`;
        const inner = (
          <>
            <span className="orphan-pill-icon-svg">{ORPHAN_ICONS[g] ?? <Zap size={16} strokeWidth={1.8} />}</span>
            <span className="orphan-pill-name">{g}</span>
            <span className="orphan-pill-count">{n === 0 ? '0×' : `${n}×`}</span>
          </>
        );
        const cls = `orphan-pill ${colorClass} ${selected ? 'orphan-pill--selected' : ''}`.trim();
        if (!interactive) {
          return (
            <div key={g} className={`${cls} orphan-pill--static`.trim()} title={title}>
              {inner}
            </div>
          );
        }
        return (
          <button
            key={g}
            type="button"
            className={cls}
            onClick={() => onToggleGroup(g)}
            title={title}
            aria-pressed={selected}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}

export function BodyMapFigure({
  practiceCounts,
  practiceWindowDays,
  selectedGroups,
  onToggleGroup,
  allowRegionToggle = true,
  mode = 'heatmap',
  orphansPlacement = 'bottom',
}: Props & { mode?: 'heatmap' | 'rainbow'; orphansPlacement?: 'top' | 'bottom' | 'none' }) {
  const frontHostRef = useRef<HTMLDivElement>(null);
  const backHostRef = useRef<HTMLDivElement>(null);
  const frontChartRef = useRef<BodyChart | null>(null);
  const backChartRef = useRef<BodyChart | null>(null);
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');

  // Keep onToggleGroup stable in the click handler so we never recreate charts
  const toggleRef = useRef(onToggleGroup);
  toggleRef.current = onToggleGroup;
  const allowToggleRef = useRef(allowRegionToggle);
  allowToggleRef.current = allowRegionToggle;

  const onMuscleClick = useCallback((muscleId: string) => {
    if (!allowToggleRef.current) return;
    const g = getGroupForBodyMuscleId(muscleId);
    if (g) toggleRef.current(g);
  }, []);

  // Mount charts once — stable click handler, no deps that change
  useEffect(() => {
    const frontEl = frontHostRef.current;
    const backEl = backHostRef.current;
    if (!frontEl || !backEl) return;

    const state = buildBodyMusclesStateForTenDayGaps(practiceCounts, selectedGroups);
    const common = {
      bodyState: state,
      onMuscleClick,
      onMuscleHover: () => {},
      showViewLabel: false,
      className: 'body-muscles-inner',
    } as const;

    const frontLabel = allowRegionToggle
      ? 'Front body map — tap a region to filter or plan'
      : 'Front body map — view only';
    const backLabel = allowRegionToggle
      ? 'Back body map — tap a region to filter or plan'
      : 'Back body map — view only';

    frontChartRef.current = new BodyChart(frontEl, {
      ...common,
      view: ViewSide.FRONT,
      ariaLabel: frontLabel,
    });
    backChartRef.current = new BodyChart(backEl, {
      ...common,
      view: ViewSide.BACK,
      ariaLabel: backLabel,
    });

    return () => {
      frontChartRef.current?.destroy();
      backChartRef.current?.destroy();
      frontChartRef.current = null;
      backChartRef.current = null;
    };
  }, [onMuscleClick, allowRegionToggle]);

  // Update state only — no chart recreation, no lag
  useEffect(() => {
    let state: any = {};
    if (mode === 'rainbow') {
      // Legend/Summary mode: only show rainbow color if it was hit (count > 0)
      for (const group of Object.keys(GROUP_TO_MUSCLE_IDS)) {
        const ids = GROUP_TO_MUSCLE_IDS[group as MuscleGroup];
        if (!ids) continue;
        const wasHit = (practiceCounts.get(group as MuscleGroup) ?? 0) > 0;
        const intensity = wasHit ? (GROUP_TO_RAINBOW_SLOT[group] ?? LEGEND_INACTIVE_SLOT) : LEGEND_INACTIVE_SLOT;
        for (const id of ids) {
          state[id] = { intensity, selected: false };
        }
      }
    } else {
      state = buildBodyMusclesStateForTenDayGaps(practiceCounts, selectedGroups);
    }
    frontChartRef.current?.update({ bodyState: state });
    backChartRef.current?.update({ bodyState: state });
  }, [practiceCounts, selectedGroups, mode]);

  return (
    <div className="body-map">
      {orphansPlacement === 'top' && (
        <div style={{ marginBottom: '1rem' }}>
          <OrphanPills
            practiceCounts={practiceCounts}
            practiceWindowDays={practiceWindowDays}
            selectedGroups={selectedGroups}
            onToggleGroup={onToggleGroup}
            interactive={allowRegionToggle}
          />
        </div>
      )}

      <div className="body-map-toggle" role="group" aria-label="Body map view">
        <button
          type="button"
          className={`chip chip-compact ${activeSide === 'front' ? 'chip-active' : ''}`}
          onClick={() => setActiveSide('front')}
          aria-pressed={activeSide === 'front'}
        >
          Front
        </button>
        <button
          type="button"
          className={`chip chip-compact ${activeSide === 'back' ? 'chip-active' : ''}`}
          onClick={() => setActiveSide('back')}
          aria-pressed={activeSide === 'back'}
        >
          Back
        </button>
      </div>

      <div className="body-map-row">
        <figure className={`body-map-figure ${activeSide === 'front' ? 'is-active' : ''}`.trim()}>
          <figcaption className="body-map-figure-label">Front</figcaption>
          <div ref={frontHostRef} className="body-muscles-host" />
        </figure>
        <figure className={`body-map-figure ${activeSide === 'back' ? 'is-active' : ''}`.trim()}>
          <figcaption className="body-map-figure-label">Back</figcaption>
          <div ref={backHostRef} className="body-muscles-host" />
        </figure>
      </div>

      <div className="report-footer-meta">
        <div className="footer-meta-left">
          <div className="report-legend">
            <span className="legend-item"><span className="legend-dot legend-dot--red"></span> Needs work</span>
            <span className="legend-item"><span className="legend-dot legend-dot--orange"></span> Once</span>
            <span className="legend-item"><span className="legend-dot legend-dot--green"></span> 2+ sessions</span>
          </div>
          {orphansPlacement === 'bottom' && allowRegionToggle ? (
            <p className="report-hint">Tap a region to plan that muscle group</p>
          ) : null}
        </div>

        {orphansPlacement === 'bottom' && (
          <OrphanPills
            practiceCounts={practiceCounts}
            practiceWindowDays={practiceWindowDays}
            selectedGroups={selectedGroups}
            onToggleGroup={onToggleGroup}
            interactive={allowRegionToggle}
          />
        )}
      </div>

      <p className="body-map-credit">
        Anatomy: <a href="https://github.com/vulovix/body-muscles" target="_blank" rel="noreferrer">body-muscles</a>
      </p>
    </div>
  );
}
