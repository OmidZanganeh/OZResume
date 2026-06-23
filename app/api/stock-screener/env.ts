/** Finnhub API token — supports common env var names from dashboard / Vercel. */
export function getFinnhubApiKey(): string | undefined {
  const key =
    process.env.FINNHUB_API_KEY?.trim() ||
    process.env.X_Finnhub_Secret?.trim() ||
    process.env.X_FINNHUB_SECRET?.trim();
  return key || undefined;
}
