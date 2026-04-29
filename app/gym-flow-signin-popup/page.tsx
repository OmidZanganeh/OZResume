'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

/** Survives React Strict Mode double-mount in dev (same popup JS context). */
let googleRedirectStarted = false;

function SignInInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (googleRedirectStarted) return;
    googleRedirectStarted = true;

    const parentOrigin = searchParams.get('parentOrigin') ?? '';
    const qs = parentOrigin ? `?parentOrigin=${encodeURIComponent(parentOrigin)}` : '';
    const callbackUrl = `${window.location.origin}/gym-flow-oauth-close${qs}`;

    void signIn('google', { callbackUrl });
  }, [searchParams]);

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem',
        textAlign: 'center',
        color: '#64748b',
      }}
    >
      <p style={{ margin: 0 }}>Continuing to Google…</p>
      <p style={{ margin: '1.25rem 0 0', fontSize: '0.85rem' }}>
        <a href="/gym-flow-account" style={{ color: '#0d9488', fontWeight: 600 }}>
          Use email instead
        </a>
      </p>
    </div>
  );
}

export default function GymFlowSignInPopupPage() {
  return (
    <Suspense
      fallback={
        <p style={{ fontFamily: 'system-ui', padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading…</p>
      }
    >
      <SignInInner />
    </Suspense>
  );
}
