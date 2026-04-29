'use client';

import type { CSSProperties } from 'react';
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
        style={buttonSecondary}
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && signIn('google', { callbackUrl: '/gym-flow/' })}
      style={{
        ...buttonPrimary,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      title={disabled ? 'Sign-in is not configured on the server' : undefined}
    >
      Sign in with Google
    </button>
  );
}

const buttonPrimary: CSSProperties = {
  padding: '0.65rem 1.25rem',
  borderRadius: '10px',
  border: '1px solid #0f766e',
  background: '#14b8a6',
  color: '#042f2e',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
};

const buttonSecondary: CSSProperties = {
  ...buttonPrimary,
  background: '#f1f5f9',
  color: '#334155',
  border: '1px solid #cbd5e1',
};
