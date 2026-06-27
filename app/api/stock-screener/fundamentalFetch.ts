import { spawn } from 'node:child_process';
import { existsSync, resolve } from 'node:path';
import type { FundamentalPeriod } from '@/app/web-apps/stock-screener/fundamentalTypes';

const PY_SCRIPT = resolve(process.cwd(), 'scripts/fetch_fundamental_one.py');

export function spawnFundamentalFetch(symbol: string): Promise<FundamentalPeriod[] | null> {
  if (!existsSync(PY_SCRIPT)) return Promise.resolve(null);

  return new Promise(resolvePromise => {
    const proc = spawn('python', [PY_SCRIPT, symbol], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.on('close', code => {
      if (code !== 0) {
        resolvePromise(null);
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as FundamentalPeriod[];
        resolvePromise(Array.isArray(parsed) && parsed.length > 0 ? parsed : null);
      } catch {
        resolvePromise(null);
      }
    });

    proc.on('error', () => resolvePromise(null));
  });
}
