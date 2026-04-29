'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { Suspense, useCallback, useEffect, useState } from 'react';

type ProfileForm = {
  name: string;
  weight: string;
  weightUnit: 'kg' | 'lbs';
  height: string;
  heightUnit: 'cm' | 'ft';
  age: string;
};

function ProfileSetupInner() {
  const { status, data: sessionData } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const popup = sp.get('popup') === '1';
  const parentOrigin = sp.get('parentOrigin') ?? '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileForm>({
    name: '',
    weight: '',
    weightUnit: 'kg',
    height: '',
    heightUnit: 'cm',
    age: '',
  });

  const goContinue = useCallback(() => {
    if (popup && parentOrigin) {
      const q = `?parentOrigin=${encodeURIComponent(parentOrigin)}`;
      window.location.href = `${window.location.origin}/gym-flow-oauth-close${q}`;
      return;
    }
    window.location.href = '/gym-flow/';
  }, [popup, parentOrigin]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/gym-flow-account');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/gym-flow/data', { credentials: 'include' });
        const j = (await r.json()) as { data?: { userProfile?: Record<string, string> } };
        const u = j.data?.userProfile;
        if (u && !cancelled) {
          setForm((f) => ({
            name: typeof u.name === 'string' ? u.name : f.name,
            weight: typeof u.weight === 'string' ? u.weight : f.weight,
            weightUnit: u.weightUnit === 'lbs' ? 'lbs' : 'kg',
            height: typeof u.height === 'string' ? u.height : f.height,
            heightUnit: u.heightUnit === 'ft' ? 'ft' : 'cm',
            age: typeof u.age === 'string' ? u.age : f.age,
          }));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    const n = sessionData?.user?.name;
    if (n) {
      setForm((f) => (f.name ? f : { ...f, name: n }));
    }
  }, [sessionData?.user?.name]);

  const profileLooksComplete =
    form.name.trim() && form.weight.trim() && form.height.trim() && form.age.trim();

  useEffect(() => {
    if (loading || status !== 'authenticated') return;
    if (profileLooksComplete) {
      goContinue();
    }
  }, [loading, status, profileLooksComplete, goContinue]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const r = await fetch('/api/gym-flow/profile', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile: form }),
      });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? 'Could not save');
        return;
      }
      goContinue();
    } finally {
      setSaving(false);
    }
  }

  if (status === 'loading' || loading) {
    return <div className="gym-flow-auth-loading">Loading…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="gym-flow-auth-main gym-flow-auth-main--narrow">
      <p className="gym-flow-auth-lead gym-flow-auth-lead--sm">
        Add a few details for reports and your account. You can edit these anytime in Gym Flow settings.
      </p>

      <form className="gym-flow-auth-form-stack" onSubmit={(e) => void onSubmit(e)}>
        <label className="gym-flow-auth-label">
          Name
          <input
            className="gym-flow-auth-input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoComplete="name"
            placeholder="e.g. Alex Smith"
          />
        </label>

        <label className="gym-flow-auth-label">
          Weight
          <div className="gym-flow-auth-inline-fields">
            <input
              className="gym-flow-auth-input"
              style={{ flex: 1 }}
              value={form.weight}
              onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
              inputMode="decimal"
              placeholder="75"
            />
            <select
              className="gym-flow-auth-select"
              value={form.weightUnit}
              onChange={(e) =>
                setForm((f) => ({ ...f, weightUnit: e.target.value === 'lbs' ? 'lbs' : 'kg' }))
              }
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>
        </label>

        <label className="gym-flow-auth-label">
          Height
          <div className="gym-flow-auth-inline-fields">
            {form.heightUnit === 'ft' ? (
              <>
                <input
                  className="gym-flow-auth-input gym-flow-auth-input--narrow"
                  inputMode="numeric"
                  placeholder="5"
                  value={(form.height || '').split("'")[0] || ''}
                  onChange={(e) => {
                    const i = (form.height || '').split("'")[1] || '';
                    setForm((f) => ({ ...f, height: `${e.target.value}'${i}` }));
                  }}
                />
                <span className="gym-flow-auth-unit-hint">ft</span>
                <input
                  className="gym-flow-auth-input gym-flow-auth-input--narrow"
                  inputMode="numeric"
                  placeholder="10"
                  value={(form.height || '').split("'")[1] || ''}
                  onChange={(e) => {
                    const ft = (form.height || '').split("'")[0] || '';
                    setForm((f) => ({ ...f, height: `${ft}'${e.target.value}` }));
                  }}
                />
                <span className="gym-flow-auth-unit-hint">in</span>
              </>
            ) : (
              <input
                className="gym-flow-auth-input"
                style={{ flex: 1 }}
                value={form.height}
                onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                inputMode="decimal"
                placeholder="175"
              />
            )}
            <select
              className="gym-flow-auth-select"
              value={form.heightUnit}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  heightUnit: e.target.value === 'ft' ? 'ft' : 'cm',
                  height: '',
                }))
              }
            >
              <option value="cm">cm</option>
              <option value="ft">ft</option>
            </select>
          </div>
        </label>

        <label className="gym-flow-auth-label">
          Age
          <input
            className="gym-flow-auth-input"
            value={form.age}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
            inputMode="numeric"
            placeholder="28"
          />
        </label>

        {error && (
          <p role="alert" className="gym-flow-auth-error-text">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="gym-flow-auth-btn gym-flow-auth-btn--primary gym-flow-auth-btn-spaced"
          style={{ cursor: saving ? 'wait' : 'pointer' }}
        >
          {saving ? 'Saving…' : 'Save & continue'}
        </button>
        <button
          type="button"
          onClick={goContinue}
          className="gym-flow-auth-btn gym-flow-auth-btn--secondary"
          style={{ width: '100%' }}
        >
          Skip for now
        </button>
      </form>
    </div>
  );
}

export function GymFlowProfileSetupClient() {
  return (
    <Suspense fallback={<div className="gym-flow-auth-loading">Loading…</div>}>
      <ProfileSetupInner />
    </Suspense>
  );
}
