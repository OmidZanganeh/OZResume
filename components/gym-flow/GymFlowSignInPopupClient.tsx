'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import type { CSSProperties } from 'react';
import { Suspense, useEffect, useState } from 'react';
import { GymFlowEmailAuthForm } from '@/components/gym-flow/GymFlowEmailAuthForm';

type Props = {
  showGoogle: boolean;
  showEmail: boolean;
};

function SignInPopupInner({ showGoogle, showEmail }: Props) {
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const parentOrigin = searchParams.get('parentOrigin') ?? '';
  const qs = parentOrigin ? `?parentOrigin=${encodeURIComponent(parentOrigin)}` : '';
  const oauthCloseUrl = ready ? `${window.location.origin}/gym-flow-oauth-close${qs}` : '';

  if (!ready) {
    return (
      <div style={{ fontFamily: 'system-ui', padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading…</div>
    );
  }

  const divider: CSSProperties = {
    margin: '1rem 0',
    textAlign: 'center',
    fontSize: '0.8rem',
    color: '#94a3b8',
    fontWeight: 600,
    letterSpacing: '0.06em',
  };

  const googleBtn: CSSProperties = {
    width: '100%',
    padding: '0.65rem 1rem',
    borderRadius: '10px',
    border: '1px solid #0f766e',
    background: '#f8fafc',
    color: '#0f766e',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    fontFamily: 'system-ui, sans-serif',
  };

  const noMethod =
    !showGoogle && !showEmail ? (
      <p style={{ fontSize: '0.88rem', color: '#b45309' }}>
        Sign-in is not available here. Check <a href="/gym-flow-account">/gym-flow-account</a> or your site
        configuration.
      </p>
    ) : null;

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '1.25rem',
        maxWidth: '22rem',
        margin: '0 auto',
      }}
    >
      <h1 style={{ margin: '0 0 1rem', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>Sign in</h1>
      <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#64748b' }}>
        Use your email or Google. When you finish, this window will close.
      </p>

      {noMethod}

      {showEmail && (
        <GymFlowEmailAuthForm variant="compact" afterSignInRedirect={oauthCloseUrl} />
      )}

      {showGoogle && showEmail && <div style={divider}>OR</div>}

      {showGoogle && (
        <button
          type="button"
          style={googleBtn}
          onClick={() => void signIn('google', { callbackUrl: oauthCloseUrl })}
        >
          Continue with Google
        </button>
      )}

      <p style={{ margin: '1.25rem 0 0', fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center' }}>
        <a href="/gym-flow-account" style={{ color: '#0d9488', fontWeight: 600 }}>
          Full account page
        </a>
      </p>
    </div>
  );
}

export function GymFlowSignInPopupClient(props: Props) {
  return (
    <Suspense
      fallback={
        <div style={{ fontFamily: 'system-ui', padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading…</div>
      }
    >
      <SignInPopupInner {...props} />
    </Suspense>
  );
}
