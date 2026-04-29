'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
  const profileSetupUrl = ready
    ? (() => {
        const q = new URLSearchParams();
        q.set('popup', '1');
        if (parentOrigin) q.set('parentOrigin', parentOrigin);
        return `${window.location.origin}/gym-flow-profile-setup?${q.toString()}`;
      })()
    : '';

  if (!ready) {
    return <div className="gym-flow-auth-loading">Loading…</div>;
  }

  const noMethod =
    !showGoogle && !showEmail ? (
      <p className="gym-flow-auth-warn-inline">
        Sign-in isn&apos;t available.{' '}
        <a href="/gym-flow-account" className="gym-flow-auth-link">
          Account page
        </a>
      </p>
    ) : null;

  return (
    <div className="gym-flow-auth-centre">
      {noMethod}

      {showEmail && <GymFlowEmailAuthForm variant="compact" afterSignInRedirect={profileSetupUrl} />}

      {showGoogle && showEmail && <div className="gym-flow-auth-divider">OR</div>}

      {showGoogle && (
        <button
          type="button"
          className="gym-flow-auth-btn gym-flow-auth-btn--google"
          onClick={() => void signIn('google', { callbackUrl: profileSetupUrl })}
        >
          Continue with Google
        </button>
      )}

      <p className="gym-flow-auth-footer-note">
        <a href="/gym-flow-account" className="gym-flow-auth-link">
          Account
        </a>
      </p>
    </div>
  );
}

export function GymFlowSignInPopupClient(props: Props) {
  return (
    <Suspense fallback={<div className="gym-flow-auth-loading">Loading…</div>}>
      <SignInPopupInner {...props} />
    </Suspense>
  );
}
