/**
 * Download ~12y of weekly closes for an index universe into Redis (and local file).
 * Run: npm run warm:weekly
 * Run: npm run warm:weekly -- nasdaq100
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { universeMeta, parseUniverseArg, type UniverseId } from '../app/web-apps/stock-screener/universe';

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
  const universeId = parseUniverseArg(process.argv[2]);
  const meta = universeMeta(universeId);
  const hasRedis = Boolean(process.env.REDIS_URL?.trim());
  console.log(`Universe: ${meta.label}`);
  console.log(`REDIS_URL: ${hasRedis ? 'yes' : 'MISSING (will write local file only)'}`);

  const { runWeeklyBulkBatch } = await import('../app/api/stock-screener/weeklyBulk');
  const { getSymbolUniverse } = await import('../app/api/stock-screener/symbols');

  const universe = await getSymbolUniverse(universeId);
  console.log(`${meta.label}: ${universe.length} symbols`);
  console.log(`Downloading ~12 years of weekly closes via Yahoo…\n`);

  let batchNum = 0;
  while (true) {
    batchNum++;
    const reset = batchNum === 1;
    const batch = await runWeeklyBulkBatch(reset, universeId);
    console.log(
      `  batch ${batchNum}: +${batch.batchAdded} → ${batch.fetched}/${batch.total}` +
        (batch.complete ? ' ✓ complete' : ''),
    );
    if (batch.complete) break;
  }

  const { readWeeklyBulk } = await import('../app/api/stock-screener/weeklyBulk');
  const store = await readWeeklyBulk(universeId);
  if (store) {
    const outDir = resolve(process.cwd(), 'data');
    mkdirSync(outDir, { recursive: true });
    const outPath = resolve(outDir, meta.localBulkFile);
    writeFileSync(outPath, JSON.stringify(store));
    console.log(`\nLocal copy: ${outPath}`);
    console.log(`Tickers with weekly data: ${Object.keys(store.data).length}`);
  }

  console.log('\nDone — weekly bulk ready for 10y timeline.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
