import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { neon } from '@neondatabase/serverless';
import { getDatabaseUrl } from './database-url';

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

export function ensureGymFlowEmailAccountsTable(): Promise<void> {
  if (!tableReady) {
    const s = getSql();
    tableReady = s`
      CREATE TABLE IF NOT EXISTS gym_flow_email_accounts (
        user_id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return tableReady;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function registerEmailAccount(
  email: string,
  password: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  await ensureGymFlowEmailAccountsTable();
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) {
    return { ok: false, error: 'Invalid email address' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }
  if (password.length > 72) {
    return { ok: false, error: 'Password is too long' };
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  const userId = randomUUID();

  try {
    await getSql()`
      INSERT INTO gym_flow_email_accounts (user_id, email, password_hash)
      VALUES (${userId}, ${normalized}, ${passwordHash})
    `;
    return { ok: true, userId };
  } catch (e: unknown) {
    const code =
      typeof e === 'object' && e !== null && 'code' in e
        ? String((e as { code: unknown }).code)
        : '';
    if (code === '23505') {
      return { ok: false, error: 'An account with this email already exists' };
    }
    console.error('[registerEmailAccount]', e);
    return { ok: false, error: 'Could not create account' };
  }
}

export async function verifyEmailCredentials(
  email: string,
  password: string,
): Promise<{ id: string; email: string } | null> {
  await ensureGymFlowEmailAccountsTable();
  const normalized = normalizeEmail(email);
  const rows = (await getSql()`
    SELECT user_id, email, password_hash
    FROM gym_flow_email_accounts
    WHERE email = ${normalized}
  `) as unknown as { user_id: string; email: string; password_hash: string }[];
  const row = rows[0];
  if (!row) return null;
  if (!bcrypt.compareSync(password, row.password_hash)) return null;
  return { id: row.user_id, email: row.email };
}
