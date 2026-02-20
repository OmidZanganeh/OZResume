import { NextResponse } from 'next/server';
import Redis from 'ioredis';

const KEY = 'gis:leaderboard';

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

export async function GET() {
  try {
    const client = getRedis();
    // Returns [member, score, member, score, ...]
    const raw = await client.zrange(KEY, 0, 2, 'REV', 'WITHSCORES');
    const leaders: { name: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const member = raw[i];        // "PlayerName:timestamp"
      const score = Number(raw[i + 1]);
      const name = member.split(':')[0];
      leaders.push({ name, score });
    }
    return NextResponse.json(leaders);
  } catch (err) {
    console.error('Leaderboard GET error:', err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, score } = await req.json() as { name: string; score: number };
    if (!name || typeof score !== 'number') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const client = getRedis();
    const member = `${name.slice(0, 20)}:${Date.now()}`;
    await client.zadd(KEY, score, member);
    // Keep only top 100 entries to avoid unlimited growth
    await client.zremrangebyrank(KEY, 0, -101);
    // Return fresh top 3
    const raw = await client.zrange(KEY, 0, 2, 'REV', 'WITHSCORES');
    const leaders: { name: string; score: number }[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      const member = raw[i];
      const score = Number(raw[i + 1]);
      const name = member.split(':')[0];
      leaders.push({ name, score });
    }
    return NextResponse.json(leaders);
  } catch (err) {
    console.error('Leaderboard POST error:', err);
    return NextResponse.json({ error: 'Failed to save score' }, { status: 500 });
  }
}
