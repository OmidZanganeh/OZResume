import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('https://sudoku-api.vercel.app/api/dosuku', {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('upstream error');
    const data = await res.json();
    const grid = data?.newboard?.grids?.[0];
    if (!grid?.value || !grid?.solution) throw new Error('bad shape');
    return NextResponse.json({ board: grid.value, solution: grid.solution });
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  }
}
