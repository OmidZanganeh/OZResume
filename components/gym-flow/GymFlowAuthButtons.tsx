'use client';

import { signIn, signOut } from 'next-auth/react';

type Props = {
  hasSession: boolean;
  disabled?: boolean;
};

export function GymFlowAuthButtons({ hasSession, disabled = false }: Props) {
  if (hasSession) {
    return (
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: '/gym-flow-account' })}
        className="gym-flow-auth-btn gym-flow-auth-btn--secondary"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && signIn('google', { callbackUrl: '/gym-flow-profile-setup' })}
      className="gym-flow-auth-btn gym-flow-auth-btn--google"
      title={disabled ? 'Sign-in is not configured on the server' : undefined}
    >
      Sign in with Google
    </button>
  );
}
