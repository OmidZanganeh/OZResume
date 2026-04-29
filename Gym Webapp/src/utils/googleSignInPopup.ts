/** postMessage type from `app/gym-flow-oauth-close` after successful Google OAuth */
export const GYM_FLOW_OAUTH_SUCCESS = 'gym-flow-oauth-success' as const;

const POPUP_FEATURES =
  'popup=yes,width=520,height=640,left=80,top=80,scrollbars=yes,resizable=yes';

/**
 * Open Google sign-in in a popup. After success, `/gym-flow-oauth-close` posts
 * `{ type: GYM_FLOW_OAUTH_SUCCESS }` to `window.opener` (same origin).
 */
export function openGoogleSignInPopup(): Window | null {
  const origin = window.location.origin;
  const closeUrl = `${origin}/gym-flow-oauth-close`;
  const signInUrl = `${origin}/api/auth/signin/google?callbackUrl=${encodeURIComponent(closeUrl)}`;
  return window.open(signInUrl, 'gymFlowGoogleSignIn', POPUP_FEATURES);
}
