/**
 * Auth.js env checks — used to show setup hints without exposing secrets.
 */
export function getAuthEnvStatus() {
  const secret = (
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    ''
  ).trim();
  const googleId = (
    process.env.AUTH_GOOGLE_ID ||
    process.env.GOOGLE_CLIENT_ID ||
    ''
  ).trim();
  const googleSecret = (
    process.env.AUTH_GOOGLE_SECRET ||
    process.env.GOOGLE_CLIENT_SECRET ||
    ''
  ).trim();
  return {
    hasSecret: secret.length > 0,
    hasGoogle: googleId.length > 0 && googleSecret.length > 0,
    /** Safe for session encryption / JWT — required in production */
    secret,
    googleId,
    googleSecret,
  };
}

export function isAuthFullyConfigured(): boolean {
  const s = getAuthEnvStatus();
  return s.hasSecret && s.hasGoogle;
}
