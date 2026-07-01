import type { Stock } from './types';

/** True when most liquid names still have avgVolume stuck at zero (stale Redis / session cache). */
export function snapshotNeedsVolumeRepair(stocks: Stock[]): boolean {
  const liquid = stocks.filter(s => s.marketCap > 100 && s.price > 0);
  if (liquid.length < 20) return false;
  const zeroVol = liquid.filter(s => !s.avgVolume || s.avgVolume <= 0).length;
  return zeroVol / liquid.length > 0.5;
}
