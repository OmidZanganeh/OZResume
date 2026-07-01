/**
 * Backfill average volume into Redis (snapshot + weekly bulk) via Yahoo weekly bars.
 * Run after warm:stocks and warm:weekly when Vol column or timeline volume is empty.
 *
 * Run: npm run warm:volume
 * Run: npm run warm:volume -- nasdaq100
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseUniverseArg, universeMeta } from '../app/web-apps/stock-screener/universe';

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
  console.log(`REDIS_URL: ${hasRedis ? 'yes' : 'MISSING'}`);
  if (!hasRedis) {
    console.error('REDIS_URL is required — volume is stored in Redis.');
    process.exit(1);
  }

  const { runVolumeRepairBatch } = await import('../app/api/stock-screener/volumeRepair');
  const { runWeeklyVolumeRepairBatch } = await import('../app/api/stock-screener/weeklyBulk');

  console.log('\n1/2 — Live Vol (avg daily volume on today’s snapshot)…');
  let batchNum = 0;
  while (true) {
    batchNum += 1;
    const batch = await runVolumeRepairBatch(universeId);
    console.log(
      `  batch ${batchNum}: +${batch.batchAdded} patched → ${batch.cursor}/${batch.total}` +
        (batch.complete ? ' ✓ complete' : ''),
    );
    if (batch.complete) break;
  }

  console.log('\n2/2 — Historical Vol (weekly bar volume for timeline dates)…');
  batchNum = 0;
  while (true) {
    batchNum += 1;
    const batch = await runWeeklyVolumeRepairBatch(universeId);
    console.log(
      `  batch ${batchNum}: +${batch.batchAdded} patched → ${batch.cursor}/${batch.total}` +
        (batch.complete ? ' ✓ complete' : ''),
    );
    if (batch.complete) break;
  }

  console.log('\nDone — Vol data is in Redis. The screener should load without backfill banners.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
