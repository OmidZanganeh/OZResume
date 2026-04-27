import type { Exercise } from '../data/exerciseLibrary';
import {
  candidateMuscleGroupsForExercise,
  effectiveTrainedMuscles,
  nextTrainedMusclesAfterToggle,
  type ExerciseLogDraft,
} from '../utils/workoutLogDraft';

type Props = {
  exercise: Exercise;
  draft: ExerciseLogDraft | undefined;
  onPatch: (patch: Partial<ExerciseLogDraft>) => void;
};

export function MuscleTargetPick({ exercise, draft, onPatch }: Props) {
  const candidates = candidateMuscleGroupsForExercise(exercise);
  if (candidates.length <= 1) return null;
  return (
    <div className="muscle-target-pick" role="group" aria-label="Muscles this move counts toward on the map">
      <span className="muscle-target-pick-label">Count for body map (your session)</span>
      <div className="muscle-target-pick-chips">
        {candidates.map((g) => {
          const active = effectiveTrainedMuscles(draft, exercise).includes(g);
          return (
            <label key={g} className={`muscle-target-chip ${active ? 'muscle-target-chip--on' : ''}`}>
              <input
                type="checkbox"
                checked={active}
                onChange={() =>
                  onPatch({
                    trainedMuscleGroups: nextTrainedMusclesAfterToggle(draft, exercise, g),
                  })
                }
              />
              <span>{g}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
