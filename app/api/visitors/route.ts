import { NextResponse } from 'next/server';
import Redis from 'ioredis';

const KEY = 'site:visitors';

let redis: Redis | null = null;
function getRedis(): Redis {
  if (!redis) redis = new Redis(process.env.REDIS_URL as string, { maxRetriesPerRequest: 3 });
  return redis;
}

export async function POST() {
  try {
    const count = await getRedis().incr(KEY);
    return NextResponse.json({ count });
  } catch {
    return NextResponse.json({ count: null }, { status: 500 });
  }
}

export async function GET() {
  try {
    const val = await getRedis().get(KEY);
    return NextResponse.json({ count: val ? parseInt(val) : 0 });
  } catch {
    return NextResponse.json({ count: null }, { status: 500 });
  }
}
