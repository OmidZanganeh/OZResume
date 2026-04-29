import { useCallback, useEffect, useRef, useState } from 'react';
import { BodyChart, ViewSide, INTENSITY_COLORS } from 'body-muscles';
import type { MuscleGroup } from '../data/exerciseLibrary';
import {
  buildBodyMusclesStateForTenDayGaps,
  getGroupForBodyMuscleId,
  HEAT_INTENSITY,
  GROUP_TO_MUSCLE_IDS,
  heatTierFromCount,
} from '../bodyMap/bodyMusclesMapping';
import { MUSCLE_GROUP_CALENDAR_COLOR } from './calendarMuscleColors';

/** Gym Flow heatmap — must match {@link HEAT_INTENSITY} slots in bodyMusclesMapping. */
(INTENSITY_COLORS as Record<number, string>)[HEAT_INTENSITY.gap] = '#f43f5e';
(INTENSITY_COLORS as Record<number, string>)[HEAT_INTENSITY.x1] = '#fbbf24';
(INTENSITY_COLORS as Record<number, string>)[HEAT_INTENSITY.x2] = '#fde047';
(INTENSITY_COLORS as Record<number, string>)[HEAT_INTENSITY.x3] = '#bef264';
(INTENSITY_COLORS as Record<number, string>)[HEAT_INTENSITY.x4] = '#4ade80';
(INTENSITY_COLORS as Record<number, string>)[HEAT_INTENSITY.x5Plus] = '#2dd4bf';

const LEGEND_INACTIVE_SLOT = 99;

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
};

const ORPHAN_ICONS: Record<string, string> = {
  Cardio: '🏃',
  Mobility: '🧘',
};

function OrphanPills({
  practiceCounts,
  practiceWindowDays,
  selectedGroups,
  onToggleGroup,
}: {
  practiceCounts: Map<MuscleGroup, number>;
  practiceWindowDays: number;
  selectedGroups: MuscleGroup[];
  onToggleGroup: (group: MuscleGroup) => void;
}) {
  const orphans: MuscleGroup[] = ['Cardio', 'Mobility'];
  return (
    <div className="orphan-pills" role="group" aria-label="Cardio and mobility">
      {orphans.map((g) => {
        const n = practiceCounts.get(g) ?? 0;
        const tier = heatTierFromCount(n);
        const colorClass = `orphan-pill--heat${tier}`;
        const selected = selectedGroups.includes(g);
        return (
          <button
            key={g}
            type="button"
            className={`orphan-pill ${colorClass} ${selected ? 'orphan-pill--selected' : ''}`.trim()}
            onClick={() => onToggleGroup(g)}
            title={`${g}: ${n} session(s) last ${practiceWindowDays} days`}
            aria-pressed={selected}
          >
            <span className="orphan-pill-icon">{ORPHAN_ICONS[g] ?? '⚡'}</span>
            <span className="orphan-pill-name">{g}</span>
            <span className="orphan-pill-count">{n === 0 ? '0×' : `${n}×`}</span>
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

  const onMuscleClick = useCallback((muscleId: string) => {
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

    frontChartRef.current = new BodyChart(frontEl, {
      ...common,
      view: ViewSide.FRONT,
      ariaLabel: 'Front body map — tap a region to filter exercises',
    });
    backChartRef.current = new BodyChart(backEl, {
      ...common,
      view: ViewSide.BACK,
      ariaLabel: 'Back body map — tap a region to filter exercises',
    });

    return () => {
      frontChartRef.current?.destroy();
      backChartRef.current?.destroy();
      frontChartRef.current = null;
      backChartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMuscleClick]);

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
          <div className="report-legend report-legend--heat-scale" aria-label="Sessions per muscle in this period">
            <span className="legend-item"><span className="legend-dot legend-dot--heat0"></span> 0</span>
            <span className="legend-item"><span className="legend-dot legend-dot--heat1"></span> 1×</span>
            <span className="legend-item"><span className="legend-dot legend-dot--heat2"></span> 2×</span>
            <span className="legend-item"><span className="legend-dot legend-dot--heat3"></span> 3×</span>
            <span className="legend-item"><span className="legend-dot legend-dot--heat4"></span> 4×</span>
            <span className="legend-item"><span className="legend-dot legend-dot--heat5"></span> 5+×</span>
          </div>
          {orphansPlacement === 'bottom' && <p className="report-hint">Tap a region to plan that muscle group</p>}
        </div>

        {orphansPlacement === 'bottom' && (
          <OrphanPills
            practiceCounts={practiceCounts}
            practiceWindowDays={practiceWindowDays}
            selectedGroups={selectedGroups}
            onToggleGroup={onToggleGroup}
          />
        )}
      </div>

      <p className="body-map-credit">
        Anatomy: <a href="https://github.com/vulovix/body-muscles" target="_blank" rel="noreferrer">body-muscles</a>
      </p>
    </div>
  );
}
