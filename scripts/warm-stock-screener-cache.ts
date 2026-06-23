/**
 * Fetches Finnhub data for all screener tickers and writes to Redis.
 * Run: npm run warm:stocks
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) {
    console.warn('No .env.local found — using process env only.');
    return;
  }
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

async function main() {
  const hasFinnhub = Boolean(process.env.FINNHUB_API_KEY?.trim());
  const hasRedis = Boolean(process.env.REDIS_URL?.trim());

  console.log(`FINNHUB_API_KEY: ${hasFinnhub ? 'yes' : 'MISSING'}`);
  console.log(`REDIS_URL: ${hasRedis ? 'yes' : 'MISSING (will only cache in memory)'}`);
  console.log('Fetching ~262 stocks — this can take several minutes…\n');

  const { getMarketStocks } = await import('../app/api/stock-screener/fetchMarketData');
  const result = await getMarketStocks({ force: true });

  console.log('\nDone.');
  console.log(`  source:    ${result.source}`);
  console.log(`  stocks:    ${result.stocks.length}`);
  console.log(`  cachedAt:  ${result.cachedAt}`);
  console.log(`  expiresAt: ${result.expiresAt ?? 'n/a'}`);
  console.log(`  redis:     ${hasRedis && result.source !== 'mock' ? 'written (stock-screener:snapshot:v2)' : hasRedis ? 'not written (mock/failed fetch)' : 'skipped'}`);
  if (result.warning) console.log(`  warning:   ${result.warning}`);

  if (result.source === 'mock') process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
