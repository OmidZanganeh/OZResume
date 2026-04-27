import { useEffect, useRef } from 'react';
import { BodyChart, ViewSide, INTENSITY_COLORS } from 'body-muscles';
import type { MuscleGroup } from '../data/exerciseLibrary';
import { buildBodyMusclesStateForTenDayGaps, getGroupForBodyMuscleId } from '../bodyMap/bodyMusclesMapping';

type Props = {
  practiceCounts: Map<MuscleGroup, number>;
  practiceWindowDays: number;
  selectedGroups: MuscleGroup[];
  onToggleGroup: (group: MuscleGroup) => void;
};

function OrphanPills({ practiceCounts, practiceWindowDays }: { practiceCounts: Map<MuscleGroup, number>; practiceWindowDays: number }) {
  const nonMapped: MuscleGroup[] = ['Cardio', 'Mobility'];
  return (
    <div className="body-map-orphans" role="list">
      {nonMapped.map((g) => {
        const n = practiceCounts.get(g) ?? 0;
        const hasHit = n > 0;
        return (
          <span
            key={g}
            className={
              hasHit
                ? 'body-map-pill body-map-pill--has-count'
                : 'body-map-pill body-map-pill--gap'
            }
            role="listitem"
          >
            {g}
            {hasHit ? ` · ${n}× last ${practiceWindowDays}d` : ` · not hit in last ${practiceWindowDays}d`}
          </span>
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
  const toggleRef = useRef(onToggleGroup);
  toggleRef.current = onToggleGroup;

  useEffect(() => {
    const frontEl = frontHostRef.current;
    const backEl = backHostRef.current;
    if (!frontEl || !backEl) return;

    const onMuscleClick = (muscleId: string) => {
      const g = getGroupForBodyMuscleId(muscleId);
      if (g) toggleRef.current(g);
    };

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
      ariaLabel: 'Anterior body — red areas had no work in the last 10 days; tap to add or remove a filter',
    });
    backChartRef.current = new BodyChart(backEl, {
      ...common,
      view: ViewSide.BACK,
      ariaLabel: 'Posterior body — red areas had no work in the last 10 days; tap to add or remove a filter',
    });

    return () => {
      frontChartRef.current?.destroy();
      backChartRef.current?.destroy();
      frontChartRef.current = null;
      backChartRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = buildBodyMusclesStateForTenDayGaps(practiceCounts, selectedGroups);
    frontChartRef.current?.update({ bodyState: state });
    backChartRef.current?.update({ bodyState: state });
  }, [practiceCounts, selectedGroups]);

  return (
    <div className="body-map" role="img" aria-label="10-day training gaps and plan filter">
      <p className="body-map-tap-hint">
        <strong>Red</strong> = no moves logged for that area in the last {practiceWindowDays} days. <strong>Gray</strong> = you
        hit it at least once. Tap a region to add or remove it from your move list (chips below).
      </p>
      <div className="body-map-figures body-map-figures--anatomy">
        <figure className="body-map-figure body-map-figure--chart">
          <figcaption className="body-map-figure-label">Front</figcaption>
          <div ref={frontHostRef} className="body-muscles-host" />
        </figure>
        <figure className="body-map-figure body-map-figure--chart">
          <figcaption className="body-map-figure-label">Back</figcaption>
          <div ref={backHostRef} className="body-muscles-host" />
        </figure>
      </div>
      <p className="body-map-legend body-map-legend--heat">
        <span>Last {practiceWindowDays} days (each completed move entry counts; primary + secondary groups)</span>
        <span className="body-map-legend-scales">
          <i className="body-map-legend-swatch" style={{ background: INTENSITY_COLORS[0] }} aria-hidden />
          Trained
          <i className="body-map-legend-swatch" style={{ background: INTENSITY_COLORS[10] }} aria-hidden />
          Not hit
        </span>
      </p>
      <p className="body-map-credit">
        Anatomy:{' '}
        <a href="https://github.com/vulovix/body-muscles" target="_blank" rel="noreferrer">
          body-muscles
        </a>{' '}
        (Apache-2.0)
      </p>
      <p className="body-map-orphan-title">Not on the figure — same {practiceWindowDays}-day window</p>
      <OrphanPills practiceCounts={practiceCounts} practiceWindowDays={practiceWindowDays} />
      <p className="body-map-hint">Selected focus areas use a stronger outline on the figure.</p>
    </div>
  );
}
