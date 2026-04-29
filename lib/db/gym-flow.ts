import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from './database-url';

export type GymFlowRow = { payload: unknown; updated_at: string };

let sql: ReturnType<typeof neon> | null = null;

function getSql() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error('DATABASE_URL or POSTGRES_URL is not set');
  }
  if (!sql) {
    sql = neon(url);
  }
  return sql;
}

let tableReady: Promise<void> | null = null;

export function ensureGymFlowTable(): Promise<void> {
  if (!tableReady) {
    const s = getSql();
    tableReady = s`
      CREATE TABLE IF NOT EXISTS gym_flow_data (
        user_id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return tableReady;
}

export async function getGymFlowData(userId: string): Promise<GymFlowRow | null> {
  await ensureGymFlowTable();
  const rows = (await getSql()`
    SELECT payload, updated_at FROM gym_flow_data WHERE user_id = ${userId}
  `) as unknown as GymFlowRow[];
  const r = rows[0];
  return r ?? null;
}

export async function saveGymFlowData(userId: string, payload: unknown): Promise<void> {
  await ensureGymFlowTable();
  const json = JSON.stringify(payload);
  await getSql()`
    INSERT INTO gym_flow_data (user_id, payload, updated_at)
    VALUES (${userId}, ${json}::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW()
  `;
}
