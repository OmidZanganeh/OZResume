/** postMessage type from `app/gym-flow-oauth-close` after successful Google OAuth */
export const GYM_FLOW_OAUTH_SUCCESS = 'gym-flow-oauth-success' as const;

const POPUP_FEATURES =
  'popup=yes,width=520,height=640,left=80,top=80,scrollbars=yes,resizable=yes';

/** Next.js app origin (auth + callback). Vite dev proxies /api but OAuth redirect must hit Next. */
function getAuthBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port, origin } = window.location;
  const isViteDev =
    import.meta.env.DEV &&
    port !== '' &&
    port !== '3000' &&
    (hostname === 'localhost' || hostname === '127.0.0.1');
  if (isViteDev) {
    return `${protocol}//${hostname}:3000`;
  }
  return origin;
}

/** Accept postMessage from oauth-close (same origin prod, or Next :3000 in Vite dev). */
export function isTrustedGymFlowOAuthOrigin(messageOrigin: string): boolean {
  if (messageOrigin === window.location.origin) return true;
  if (!import.meta.env.DEV) return false;
  try {
    const u = new URL(messageOrigin);
    return (
      u.hostname === window.location.hostname &&
      (u.port === '3000' || u.port === '')
    );
  } catch {
    return false;
  }
}

/**
 * Open Google sign-in in a popup. After success, `/gym-flow-oauth-close` posts
 * `{ type: GYM_FLOW_OAUTH_SUCCESS }` to `window.opener` (see `parentOrigin` when dev).
 */
export function openGoogleSignInPopup(): Window | null {
  const parentOrigin = window.location.origin;
  const authBase = getAuthBaseUrl();
  const closeUrl = `${authBase}/gym-flow-oauth-close?parentOrigin=${encodeURIComponent(parentOrigin)}`;
  const signInUrl = `${authBase}/api/auth/signin/google?callbackUrl=${encodeURIComponent(closeUrl)}`;
  return window.open(signInUrl, 'gymFlowGoogleSignIn', POPUP_FEATURES);
}
