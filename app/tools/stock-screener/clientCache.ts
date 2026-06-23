const SESSION_KEY = 'stock-screener-market-v1';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionMarketPayload {
  stocks: unknown[];
  source: string;
  cachedAt?: string;
  expiresAt?: string;
  fromCache?: boolean;
  warning?: string;
}

export function readSessionMarketCache(): SessionMarketPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; payload: SessionMarketPayload };
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeSessionMarketCache(payload: SessionMarketPayload): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ expiresAt: Date.now() + SESSION_TTL_MS, payload }),
    );
  } catch {
    // sessionStorage full or disabled
  }
}

export function formatCacheAge(cachedAt?: string): string | null {
  if (!cachedAt) return null;
  const ms = Date.now() - new Date(cachedAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'less than 1 hour ago';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
