/**
 * Fetch Yahoo weekly history for S&P 500 symbols missing from the bulk store.
 * Run: npm run warm:weekly:gaps
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
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
  const hasRedis = Boolean(process.env.REDIS_URL?.trim());
  console.log(`REDIS_URL: ${hasRedis ? 'yes' : 'MISSING (will update local file only)'}`);

  const { fillWeeklyBulkGaps } = await import('../app/api/stock-screener/weeklyBulk');

  console.log('Finding missing symbols and downloading via Yahoo…\n');
  const result = await fillWeeklyBulkGaps();

  console.log(`Missing before: ${result.missingBefore}`);
  console.log(`Added: ${result.added.length} → ${result.fetched}/${result.total}`);
  if (result.added.length) console.log(`  ${result.added.join(', ')}`);
  if (result.failed.length) {
    console.log(`Failed (${result.failed.length}): ${result.failed.join(', ')}`);
  }
  console.log(result.complete ? '\n✓ All universe symbols have weekly data' : '\n⚠ Some symbols still missing');

  const outDir = resolve(process.cwd(), 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, 'sp500-weekly-bulk.json');
  writeFileSync(outPath, JSON.stringify(result.store));
  console.log(`Local copy: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
