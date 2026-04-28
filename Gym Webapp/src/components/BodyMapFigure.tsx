import { useCallback, useEffect, useRef } from 'react';
import { BodyChart, ViewSide, INTENSITY_COLORS } from 'body-muscles';
import type { MuscleGroup } from '../data/exerciseLibrary';
import {
  buildBodyMusclesStateForTenDayGaps,
  getGroupForBodyMuscleId,
  MOTIVATION_GREEN_INTENSITY_SLOT,
} from '../bodyMap/bodyMusclesMapping';

/** Slot 0 = no hits in window — red "gap" cue. */
(INTENSITY_COLORS as Record<number, string>)[0] = '#b91c1c';
/** Slot for "2+" motivation green. */
(INTENSITY_COLORS as Record<number, string>)[MOTIVATION_GREEN_INTENSITY_SLOT] = '#22c55e';

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
        const colorClass =
          n >= 2 ? 'orphan-pill--green' : n === 1 ? 'orphan-pill--orange' : 'orphan-pill--red';
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
}: Props) {
  const frontHostRef = useRef<HTMLDivElement>(null);
  const backHostRef = useRef<HTMLDivElement>(null);
  const frontChartRef = useRef<BodyChart | null>(null);
  const backChartRef = useRef<BodyChart | null>(null);

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
    const state = buildBodyMusclesStateForTenDayGaps(practiceCounts, selectedGroups);
    frontChartRef.current?.update({ bodyState: state });
    backChartRef.current?.update({ bodyState: state });
  }, [practiceCounts, selectedGroups]);

  return (
    <div className="body-map" role="img" aria-label="10-day training coverage map">
      <div className="body-map-row">
        <figure className="body-map-figure body-map-figure--chart">
          <figcaption className="body-map-figure-label">Front</figcaption>
          <div ref={frontHostRef} className="body-muscles-host" />
        </figure>
        <figure className="body-map-figure body-map-figure--chart">
          <figcaption className="body-map-figure-label">Back</figcaption>
          <div ref={backHostRef} className="body-muscles-host" />
        </figure>
      </div>
      <OrphanPills
        practiceCounts={practiceCounts}
        practiceWindowDays={practiceWindowDays}
        selectedGroups={selectedGroups}
        onToggleGroup={onToggleGroup}
      />
      <p className="body-map-credit">
        Anatomy:{' '}
        <a href="https://github.com/vulovix/body-muscles" target="_blank" rel="noreferrer">
          body-muscles
        </a>{' '}
        (Apache-2.0)
      </p>
    </div>
  );
}
