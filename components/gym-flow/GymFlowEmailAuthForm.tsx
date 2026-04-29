'use client';

import type { CSSProperties } from 'react';
import { useState } from 'react';
import { signIn } from 'next-auth/react';

type Mode = 'signin' | 'register';

type Props = {
  variant?: 'default' | 'compact';
  /** Full URL after successful credentials sign-in (e.g. oauth-close in a popup). */
  afterSignInRedirect?: string;
};

export function GymFlowEmailAuthForm({ variant = 'default', afterSignInRedirect }: Props) {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/gym-flow/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
          credentials: 'include',
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setError(data.error ?? 'Could not create account');
          return;
        }
      }

  const redirectTarget = afterSignInRedirect ?? '/gym-flow/';

      const signRes = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl: redirectTarget,
      });

      if (signRes?.error) {
        setError(
          mode === 'signin'
            ? 'Invalid email or password.'
            : 'Account created but sign-in failed — try signing in manually.',
        );
        return;
      }

      window.location.assign(signRes?.url ?? redirectTarget);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...card, marginBottom: variant === 'compact' ? 0 : card.marginBottom }}>
      <p style={{ margin: '0 0 0.75rem', fontWeight: 700, fontSize: '0.95rem' }}>
        {variant === 'compact' ? 'Email' : 'Email & password'}
      </p>
      {variant === 'default' && (
        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: '#64748b' }}>
          Create a Gym Flow account without Google. Same cloud backup as Google sign-in (separate login — not linked to a
          Google account).
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          type="button"
          onClick={() => { setMode('signin'); setError(null); }}
          style={mode === 'signin' ? tabActive : tabIdle}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setMode('register'); setError(null); }}
          style={mode === 'register' ? tabActive : tabIdle}
        >
          Create account
        </button>
      </div>

      <form onSubmit={(e) => void onSubmit(e)}>
        <label style={label}>
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={input}
          />
        </label>
        <label style={label}>
          Password
          <input
            type="password"
            name="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            style={input}
          />
        </label>
        {mode === 'register' && (
          <p style={{ margin: '0 0 0.75rem', fontSize: '0.78rem', color: '#64748b' }}>At least 8 characters.</p>
        )}
        {error && (
          <p role="alert" style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#b91c1c' }}>
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} style={{ ...submitBtn, opacity: busy ? 0.65 : 1 }}>
          {busy ? 'Please wait…' : mode === 'register' ? 'Create account & sign in' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

const card: CSSProperties = {
  padding: '1rem',
  borderRadius: '12px',
  border: '1px solid #e2e8f0',
  background: '#fff',
  marginBottom: '1.25rem',
};

const tabActive: CSSProperties = {
  padding: '0.4rem 0.85rem',
  borderRadius: '8px',
  border: '1px solid #0f766e',
  background: '#ccfbf1',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
};

const tabIdle: CSSProperties = {
  ...tabActive,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  fontWeight: 500,
};

const label: CSSProperties = {
  display: 'block',
  fontSize: '0.82rem',
  fontWeight: 600,
  marginBottom: '0.75rem',
  color: '#334155',
};

const input: CSSProperties = {
  display: 'block',
  width: '100%',
  marginTop: '0.35rem',
  padding: '0.5rem 0.65rem',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
};

const submitBtn: CSSProperties = {
  width: '100%',
  padding: '0.65rem 1rem',
  borderRadius: '10px',
  border: '1px solid #0f766e',
  background: '#14b8a6',
  color: '#042f2e',
  fontWeight: 700,
  fontSize: '0.95rem',
  cursor: 'pointer',
};
