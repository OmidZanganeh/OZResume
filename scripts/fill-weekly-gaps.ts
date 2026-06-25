/**
 * Download missing weekly bars for a universe into Redis (and local file).
 * Run: npm run warm:weekly:gaps -- nasdaq100
 */
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { universeMeta, type UniverseId } from '../app/web-apps/stock-screener/universe';

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

function parseUniverseArg(): UniverseId {
  const arg = process.argv[2]?.trim();
  if (arg === 'nasdaq100') return 'nasdaq100';
  return 'sp500';
}

async function main() {
  const universeId = parseUniverseArg();
  const meta = universeMeta(universeId);
  const hasRedis = Boolean(process.env.REDIS_URL?.trim());
  console.log(`Universe: ${meta.label}`);
  console.log(`REDIS_URL: ${hasRedis ? 'yes' : 'MISSING (will write local file only)'}`);

  const { fillWeeklyBulkGaps } = await import('../app/api/stock-screener/weeklyBulk');

  const result = await fillWeeklyBulkGaps(universeId);
  console.log(`Missing before: ${result.missingBefore}`);
  console.log(`Added: ${result.added.length} — ${result.added.join(', ') || '(none)'}`);
  if (result.failed.length) {
    console.log(`Failed: ${result.failed.join(', ')}`);
  }
  console.log(`Coverage: ${result.fetched}/${result.total}${result.complete ? ' ✓' : ''}`);

  const outDir = resolve(process.cwd(), 'data');
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, meta.localBulkFile);
  writeFileSync(outPath, JSON.stringify(result.store));
  console.log(`\nLocal copy: ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
