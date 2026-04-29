'use client';

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

      const redirectTarget = afterSignInRedirect ?? '/gym-flow-profile-setup';

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

  const cardClass =
    variant === 'compact' ? 'gym-flow-auth-card gym-flow-auth-card--flush' : 'gym-flow-auth-card';

  return (
    <div className={cardClass}>
      <p className="gym-flow-auth-card-title">{variant === 'compact' ? 'Email' : 'Email & password'}</p>

      <div className="gym-flow-auth-tabs">
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setError(null);
          }}
          className={`gym-flow-auth-tab${mode === 'signin' ? ' gym-flow-auth-tab--active' : ''}`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`gym-flow-auth-tab${mode === 'register' ? ' gym-flow-auth-tab--active' : ''}`}
        >
          Create account
        </button>
      </div>

      <form className="gym-flow-auth-form-stack" onSubmit={(e) => void onSubmit(e)}>
        <label className="gym-flow-auth-label">
          Email
          <input
            type="email"
            name="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="gym-flow-auth-input"
          />
        </label>
        <label className="gym-flow-auth-label">
          Password
          <input
            type="password"
            name="password"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="gym-flow-auth-input"
          />
        </label>
        {mode === 'register' && <p className="gym-flow-auth-hint">At least 8 characters.</p>}
        {error && (
          <p role="alert" className="gym-flow-auth-error-text">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="gym-flow-auth-btn gym-flow-auth-btn--primary">
          {busy ? 'Please wait…' : mode === 'register' ? 'Create account & sign in' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
