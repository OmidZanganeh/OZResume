import { auth } from '@/auth';
import { NextResponse } from 'next/server';

/**
 * Proxy to API Ninjas Exercises API.
 * Docs: https://api-ninjas.com/api/exercises
 *
 * Env var required: EXERCISE_NINJAS_API_KEY
 * Free tier: 10,000 requests / month.
 *
 * Query params accepted by this route:
 *   name       string  - exercise name (partial match)
 *   muscle     string  - muscle group (see VALID_MUSCLES below)
 *   type       string  - exercise type (see VALID_TYPES below)
 *   difficulty string  - beginner | intermediate | expert
 *   offset     number  - pagination; API returns 10 per call
 */

const API_NINJAS_BASE = 'https://api.api-ninjas.com/v1/exercises';

const VALID_MUSCLES = new Set([
  'abdominals', 'abductors', 'adductors', 'biceps', 'calves', 'chest',
  'forearms', 'glutes', 'hamstrings', 'lats', 'lower_back', 'middle_back',
  'neck', 'quadriceps', 'traps', 'triceps',
]);

const VALID_TYPES = new Set([
  'cardio', 'olympic_weightlifting', 'plyometrics', 'powerlifting',
  'strength', 'stretching', 'strongman',
]);

export type NinjasExercise = {
  name: string;
  type: string;
  muscle: string;
  equipment: string;
  difficulty: string;
  instructions: string;
};

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.EXERCISE_NINJAS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: 'Exercise search not configured (missing API key).' }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const name = searchParams.get('name')?.trim() ?? '';
  const muscle = searchParams.get('muscle')?.trim() ?? '';
  const type = searchParams.get('type')?.trim() ?? '';
  const difficulty = searchParams.get('difficulty')?.trim() ?? '';
  const offsetRaw = searchParams.get('offset')?.trim() ?? '0';
  const offset = Math.max(0, Number.parseInt(offsetRaw, 10) || 0);

  if (!name && !muscle && !type && !difficulty) {
    return NextResponse.json({ error: 'Provide at least one of: name, muscle, type, difficulty.' }, { status: 400 });
  }

  const url = new URL(API_NINJAS_BASE);
  if (name) url.searchParams.set('name', name);
  if (muscle && VALID_MUSCLES.has(muscle)) url.searchParams.set('muscle', muscle);
  if (type && VALID_TYPES.has(type)) url.searchParams.set('type', type);
  if (difficulty && ['beginner', 'intermediate', 'expert'].includes(difficulty)) {
    url.searchParams.set('difficulty', difficulty);
  }
  if (offset > 0) url.searchParams.set('offset', String(offset));

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[gym-flow/exercises/search] API Ninjas error', res.status, text.slice(0, 200));
      return NextResponse.json({ error: `Exercise search failed (${res.status})` }, { status: res.status });
    }

    const exercises = (await res.json()) as NinjasExercise[];
    return NextResponse.json(
      { exercises: Array.isArray(exercises) ? exercises : [] },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=300' } },
    );
  } catch (err) {
    console.error('[gym-flow/exercises/search]', err);
    return NextResponse.json({ error: 'Exercise search failed' }, { status: 500 });
  }
}
