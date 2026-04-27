import { useEffect, useRef } from 'react';
import { BodyChart, ViewSide, INTENSITY_COLORS } from 'body-muscles';
import type { MuscleGroup } from '../data/exerciseLibrary';
import {
  buildBodyMusclesStateForTenDayGaps,
  getGroupForBodyMuscleId,
  MOTIVATION_GREEN_INTENSITY_SLOT,
} from '../bodyMap/bodyMusclesMapping';

/** Slot 0 = no hits in window — red “gap” cue (was default gray in the library). */
(INTENSITY_COLORS as Record<number, string>)[0] = '#b91c1c';
/** Library slot {@link MOTIVATION_GREEN_INTENSITY_SLOT} is yellow by default; we use it for “2+” motivation green. */
(INTENSITY_COLORS as Record<number, string>)[MOTIVATION_GREEN_INTENSITY_SLOT] = '#22c55e';

type Props = {
  practiceCounts: Map<MuscleGroup, number>;
  practiceWindowDays: number;
  selectedGroups: MuscleGroup[];
  onToggleGroup: (group: MuscleGroup) => void;
};

function OrphanMuscleSquares({
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
    <div className="body-map-orphan-squares" role="group" aria-label="Cardio and mobility coverage">
      {orphans.map((g) => {
        const n = practiceCounts.get(g) ?? 0;
        const tier =
          n >= 2 ? 'body-map-orphan-square--green' : n === 1 ? 'body-map-orphan-square--orange' : 'body-map-orphan-square--gray';
        const selectedClass = selectedGroups.includes(g) ? 'body-map-orphan-square--selected' : '';
        return (
          <button
            key={g}
            type="button"
            className={`body-map-orphan-square ${tier} ${selectedClass}`.trim()}
            onClick={() => onToggleGroup(g)}
            title={`${g}: ${n} hit(s) last ${practiceWindowDays} days — tap to filter catalog`}
          >
            <span className="body-map-orphan-square-label">{g}</span>
            <span className="body-map-orphan-square-count">{n === 0 ? '—' : `${n}×`}</span>
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
      ariaLabel:
        'Anterior body — red = not trained, orange = once, green = twice or more in the window; tap to filter',
    });
    backChartRef.current = new BodyChart(backEl, {
      ...common,
      view: ViewSide.BACK,
      ariaLabel:
        'Posterior body — red = not trained, orange = once, green = twice or more in the window; tap to filter',
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
    <div className="body-map" role="img" aria-label="10-day training streak colors and plan filter">
      <p className="body-map-tap-hint">
        <strong>Green</strong> = trained that area <strong>2+</strong> times in the last {practiceWindowDays} days.{' '}
        <strong>Orange</strong> = once (almost there). <strong>Red</strong> = not yet. Tap a region to filter the catalog
        (chips below).
      </p>
      <div className="body-map-figures body-map-figures--anatomy body-map-figures--with-orphans">
        <div className="body-map-figures-main">
          <figure className="body-map-figure body-map-figure--chart">
            <figcaption className="body-map-figure-label">Front</figcaption>
            <div ref={frontHostRef} className="body-muscles-host" />
          </figure>
          <figure className="body-map-figure body-map-figure--chart">
            <figcaption className="body-map-figure-label">Back</figcaption>
            <div ref={backHostRef} className="body-muscles-host" />
          </figure>
        </div>
        <OrphanMuscleSquares
          practiceCounts={practiceCounts}
          practiceWindowDays={practiceWindowDays}
          selectedGroups={selectedGroups}
          onToggleGroup={onToggleGroup}
        />
      </div>
      <p className="body-map-legend body-map-legend--heat">
        <span>Last {practiceWindowDays} days (each completed move counts; primary + secondary groups)</span>
        <span className="body-map-legend-scales">
          <i className="body-map-legend-swatch" style={{ background: INTENSITY_COLORS[0] }} aria-hidden />
          0×
          <i className="body-map-legend-swatch" style={{ background: INTENSITY_COLORS[5] }} aria-hidden />
          1×
          <i
            className="body-map-legend-swatch"
            style={{ background: INTENSITY_COLORS[MOTIVATION_GREEN_INTENSITY_SLOT] }}
            aria-hidden
          />
          2+
        </span>
      </p>
      <p className="body-map-credit">
        Anatomy:{' '}
        <a href="https://github.com/vulovix/body-muscles" target="_blank" rel="noreferrer">
          body-muscles
        </a>{' '}
        (Apache-2.0)
      </p>
      <p className="body-map-hint">
        Cardio &amp; Mobility: tap the squares to filter. Equipment filters live on the <strong>Moves</strong> step.{' '}
        <strong>Add past workout</strong> uses only muscles you pick, so extras don&apos;t light up on the map.
      </p>
    </div>
  );
}
