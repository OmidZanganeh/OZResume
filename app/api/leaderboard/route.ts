import { NextResponse } from 'next/server';
import Redis from 'ioredis';

const VALID_GAMES = ['worddrop', 'flagquiz', 'typeracer', 'wordorder', 'sudoku', 'flappy'] as const;
type Game = (typeof VALID_GAMES)[number];

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL as string, {
      lazyConnect: false,
      maxRetriesPerRequest: 3,
    });
  }
  return redis;
}

function redisKey(game: Game) {
  return `gis:leaderboard:${game}`;
}

async function getTop3(client: Redis, game: Game) {
  const raw = await client.zrange(redisKey(game), 0, 2, 'REV', 'WITHSCORES');
  const leaders: { name: string; score: number }[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const name = raw[i].split(':')[0];
    const score = Number(raw[i + 1]);
    leaders.push({ name, score });
  }
  return leaders;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const game = (searchParams.get('game') ?? 'worddrop') as Game;
  if (!VALID_GAMES.includes(game)) {
    return NextResponse.json({ error: 'Unknown game' }, { status: 400 });
  }
  try {
    const leaders = await getTop3(getRedis(), game);
    return NextResponse.json(leaders);
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, score, game } = await req.json() as { name: string; score: number; game: Game };
    if (!name || typeof score !== 'number' || !VALID_GAMES.includes(game)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const client = getRedis();
    const member = `${name.slice(0, 20)}:${Date.now()}`;
    await client.zadd(redisKey(game), score, member);
    await client.zremrangebyrank(redisKey(game), 0, -101);
    const leaders = await getTop3(client, game);
    return NextResponse.json(leaders);
  } catch (err) {
    console.error('Leaderboard POST error:', err);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
