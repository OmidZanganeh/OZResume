/** postMessage type from `app/gym-flow-oauth-close` after successful Google OAuth */
export const GYM_FLOW_OAUTH_SUCCESS = 'gym-flow-oauth-success' as const;

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

const POPUP_FEATURES =
  'width=480,height=760,left=80,top=48,scrollbars=yes,resizable=yes,status=yes';

export function getGymFlowSignInPopupUrl(): string {
  const parentOrigin = window.location.origin;
  const authBase = getAuthBaseUrl();
  return `${authBase}/gym-flow-signin-popup?parentOrigin=${encodeURIComponent(parentOrigin)}`;
}

/**
 * Prefer a popup; if the browser blocks it (common in PWAs / Safari), navigate this tab.
 * Uses `/gym-flow-signin-popup` (SessionProvider), not raw `/api/auth/signin/google`.
 */
export function openGymFlowSignIn(): void {
  const url = getGymFlowSignInPopupUrl();
  const w = window.open(url, `gymFlowSignIn_${Date.now()}`, POPUP_FEATURES);
  if (!w) {
    window.location.assign(url);
    return;
  }
  try {
    w.focus();
  } catch {
    /* ignore */
  }
}

/** @deprecated Use openGymFlowSignIn */
export function openGoogleSignInPopup(): Window | null {
  const url = getGymFlowSignInPopupUrl();
  return window.open(url, `gymFlowSignIn_${Date.now()}`, POPUP_FEATURES);
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
