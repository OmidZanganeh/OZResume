import type { UniverseId } from './universe';

const SESSION_KEY_PREFIX = 'stock-screener-market-v2';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SessionMarketPayload {
  stocks: unknown[];
  source: string;
  cachedAt?: string;
  expiresAt?: string;
  fromCache?: boolean;
  warning?: string;
  universe?: UniverseId;
}

function sessionKey(universeId: UniverseId): string {
  return `${SESSION_KEY_PREFIX}:${universeId}`;
}

export function readSessionMarketCache(universeId: UniverseId = 'sp500'): SessionMarketPayload | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(sessionKey(universeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; payload: SessionMarketPayload };
    if (Date.now() > parsed.expiresAt) {
      sessionStorage.removeItem(sessionKey(universeId));
      return null;
    }
    return parsed.payload;
  } catch {
    return null;
  }
}

export function writeSessionMarketCache(
  payload: SessionMarketPayload,
  universeId: UniverseId = 'sp500',
): void {
  if (typeof window === 'undefined') return;
  const wrapped = { expiresAt: Date.now() + SESSION_TTL_MS, payload: { ...payload, universe: universeId } };
  try {
    sessionStorage.setItem(sessionKey(universeId), JSON.stringify(wrapped));
    return;
  } catch {
    // Quota exceeded — store without weekly bar arrays.
  }
  try {
    const slim: SessionMarketPayload = {
      ...payload,
      universe: universeId,
      stocks: Array.isArray(payload.stocks)
        ? payload.stocks.map(entry => {
            if (entry && typeof entry === 'object' && 'weeklyHistory' in entry) {
              const { weeklyHistory: _drop, ...rest } = entry as Record<string, unknown>;
              return rest;
            }
            return entry;
          })
        : payload.stocks,
    };
    sessionStorage.setItem(
      sessionKey(universeId),
      JSON.stringify({ expiresAt: Date.now() + SESSION_TTL_MS, payload: slim }),
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
