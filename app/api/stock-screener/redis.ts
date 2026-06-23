import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;
  if (!redis) {
    redis = new Redis(url, { lazyConnect: false, maxRetriesPerRequest: 3 });
  }
  return redis;
}
