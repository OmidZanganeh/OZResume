export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Core',
  'Forearms',
  'Cardio',
  'Mobility',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export type Exercise = {
  id: string;
  name: string;
  primaryGroup: MuscleGroup;
  secondaryGroups?: MuscleGroup[];
  /** wrkout/exercises.json folder name (e.g. Ab_Roller) for upstream assets */
  wrkoutFolder?: string;
  /** First demo image (GitHub raw); optional when the repo has no image */
  wrkoutImageUrl?: string | null;
  /** wrkout exercise.json `category` (e.g. strength, cardio) */
  wrkoutCategory?: string;
  /** wrkout exercise.json `equipment` */
  wrkoutEquipment?: string;
  /** wrkout exercise.json `level` */
  wrkoutLevel?: string;
};
