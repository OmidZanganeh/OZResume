import type { Exercise, MuscleGroup } from './exerciseTypes';
import type { SavedPlan } from './gymFlowStorage';

export type PlanCategory = {
  title: string;
  plans: SavedPlan[];
};

export function buildPresetPlans(library: Exercise[]): PlanCategory[] {
  const getId = (kw: string) => library.find((e) => e.name.toLowerCase().includes(kw))?.id;

  const makePlan = (
    prefix: string,
    name: string,
    muscleGroups: MuscleGroup[],
    searchTerms: string[]
  ): SavedPlan => {
    const exerciseIds = searchTerms
      .map(getId)
      .filter((id) => id !== undefined) as string[];

    return {
      id: `preset-${prefix}-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      muscleGroups,
      equipment: [],
      exerciseIds,
    };
  };

  return [
    {
      title: 'Core Foundations',
      plans: [
        makePlan('fb1', 'Beginner Full Body', ['Chest', 'Back', 'Quads', 'Core'], [
          'squat',
          'dumbbell bench press',
          'cable row',
          'romanian deadlift',
          'overhead press',
          'lat pulldown',
          'plank'
        ]),
        makePlan('fb2', 'Advanced Full Body', ['Chest', 'Back', 'Quads', 'Hamstrings', 'Shoulders', 'Core'], [
          'barbell squat',
          'barbell bench press',
          'pull up',
          'leg press',
          'military press',
          'barbell row',
          'calf raise',
          'crunch'
        ]),
        makePlan('mw1', 'Machine Workout Entry', ['Chest', 'Back', 'Quads', 'Hamstrings'], [
          'leg press',
          'chest press',
          'lat pulldown',
          'leg extension',
          'seated leg curl',
          'cable row'
        ])
      ]
    },
    {
      title: 'Classic Splits',
      plans: [
        makePlan('pu1', 'Push Day (Chest/Shoulders/Tri)', ['Chest', 'Shoulders', 'Triceps'], [
          'bench press',
          'overhead press',
          'incline dumbbell press',
          'lateral raise',
          'triceps pushdown',
          'overhead tricep',
          'pec deck'
        ]),
        makePlan('pl1', 'Pull Day (Back/Biceps)', ['Back', 'Biceps', 'Forearms'], [
          'deadlift',
          'pull up',
          'barbell row',
          'face pull',
          'bicep curl',
          'hammer curl',
          'shrug'
        ]),
        makePlan('lg1', 'Leg Day (Quads/Hams/Glutes/Calves)', ['Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'], [
          'barbell squat',
          'romanian deadlift',
          'leg press',
          'walking lunge',
          'leg extension',
          'seated leg curl',
          'calf raise',
          'ab wheel'
        ])
      ]
    },
    {
      title: 'Targeted Growth',
      plans: [
        makePlan('arm', 'Arm Annihilator', ['Biceps', 'Triceps', 'Forearms'], [
          'barbell curl',
          'skullcrusher',
          'hammer curl',
          'triceps pushdown',
          'preacher curl',
          'overhead tricep',
          'reverse curl'
        ]),
        makePlan('shb', 'Shoulder Boulders', ['Shoulders', 'Chest'], [
          'military press',
          'arnold press',
          'lateral raise',
          'front raise',
          'face pull',
          'reverse fly'
        ]),
        makePlan('cor', 'Core Crusher', ['Core'], [
          'crunch',
          'leg raise',
          'ab wheel',
          'plank',
          'russian twist',
          'bicycle',
          'woodchopper'
        ])
      ]
    }
  ];
}
