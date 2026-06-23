/**
 * Fetches full US common-stock universe into Redis (incremental batches).
 * Run: npm run warm:stocks
 * Takes 1–3 hours for ~5k symbols at Finnhub free rate limits.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
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
  const hasKey = Boolean(
    process.env.FINNHUB_API_KEY?.trim() ||
    process.env.X_Finnhub_Secret?.trim(),
  );
  const hasRedis = Boolean(process.env.REDIS_URL?.trim());

  console.log(`Finnhub key: ${hasKey ? 'yes' : 'MISSING'}`);
  console.log(`REDIS_URL: ${hasRedis ? 'yes' : 'MISSING'}`);
  console.log('Loading full US symbol list + fundamentals in batches…\n');

  const { getUsSymbolUniverse } = await import('../app/api/stock-screener/symbols');
  const { runIncrementalBatch } = await import('../app/api/stock-screener/incrementalRefresh');

  const universe = await getUsSymbolUniverse();
  console.log(`Universe: ${universe.length} US common stocks / ADRs\n`);

  let batchNum = 0;
  while (true) {
    batchNum++;
    const reset = batchNum === 1;
    const batch = await runIncrementalBatch(reset);
    console.log(
      `  batch ${batchNum}: +${batch.batchAdded} → ${batch.fetched}/${batch.total}` +
      (batch.complete ? ' ✓ complete' : ''),
    );
    if (batch.complete) break;
  }

  console.log('\nDone — Redis snapshot ready for all users.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
