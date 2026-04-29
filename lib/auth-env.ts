/**
 * Auth.js env checks — used to show setup hints without exposing secrets.
 */
import { isDatabaseConfigured } from './db/database-url';

function normalizeEnvValue(v: string | undefined): string {
  if (!v) return '';
  let s = v.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function getAuthEnvStatus() {
  const secret = normalizeEnvValue(
    process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  );
  const googleId = normalizeEnvValue(
    process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID,
  );
  const googleSecret = normalizeEnvValue(
    process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET,
  );
  const hasDatabase = isDatabaseConfigured();
  return {
    hasSecret: secret.length > 0,
    hasGoogle: googleId.length > 0 && googleSecret.length > 0,
    hasDatabase,
    /** Safe for session encryption / JWT — required in production */
    secret,
    googleId,
    googleSecret,
  };
}

export function isAuthFullyConfigured(): boolean {
  const s = getAuthEnvStatus();
  if (!s.hasSecret) return false;
  return s.hasGoogle || s.hasDatabase;
}

/** Where this server build is running (Vercel sets VERCEL_ENV). Helps debug Preview vs Production env. */
export function getDeploymentEnvHint(): string {
  const v = process.env.VERCEL_ENV;
  if (v === 'production') {
    return 'This deployment is Vercel Production. Variables must be enabled for Production (or “All environments”).';
  }
  if (v === 'preview') {
    return 'This deployment is a Vercel Preview. Add AUTH_SECRET and Google keys for Preview as well, or test on your main production URL.';
  }
  if (v === 'development') {
    return 'Vercel development environment.';
  }
  return 'Local or non-Vercel host — use .env.local for AUTH_* variables.';
}
