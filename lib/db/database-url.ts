/**
 * Vercel + Neon often expose `POSTGRES_URL` (pooled). Our code historically used `DATABASE_URL`.
 * Accept either so `.env.local` matches the Vercel Postgres template.
 */
export function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  return url?.trim() || undefined;
}

export function isDatabaseConfigured(): boolean {
  return !!getDatabaseUrl();
}
