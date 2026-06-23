/** Wilder RSI from daily closes (oldest → newest). Returns null if insufficient data. */
export function computeRSI(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = closes[i]! - closes[i - 1]!;
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i]! - closes[i - 1]!;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

/** Stochastic-style fallback when candle history is unavailable. */
export function approximateRSIFromRange(price: number, low52: number, high52: number): number {
  if (!Number.isFinite(price) || !Number.isFinite(low52) || !Number.isFinite(high52) || high52 <= low52) {
    return 50;
  }
  const k = ((price - low52) / (high52 - low52)) * 100;
  return Math.round(Math.min(100, Math.max(0, k)) * 10) / 10;
}
