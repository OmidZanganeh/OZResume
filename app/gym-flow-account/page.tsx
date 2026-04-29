import Link from 'next/link';
import { auth } from '@/auth';
import { GymFlowAuthButtons } from '@/components/gym-flow/GymFlowAuthButtons';
import { GymFlowEmailAuthForm } from '@/components/gym-flow/GymFlowEmailAuthForm';
import { getAuthEnvStatus, getDeploymentEnvHint } from '@/lib/auth-env';

export const metadata = {
  title: 'Gym Flow — Account & cloud backup',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function GymFlowAccountPage() {
  const session = await auth();
  const env = getAuthEnvStatus();
  const googleReady = env.hasSecret && env.hasGoogle;
  const emailReady = env.hasSecret && env.hasDatabase;
  const canSignInAny = googleReady || emailReady;
  const deployHint = getDeploymentEnvHint();

  return (
    <main
      style={{
        maxWidth: '32rem',
        margin: '0 auto',
        padding: '2rem 1.25rem 4rem',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        lineHeight: 1.5,
      }}
    >
      <h1 style={{ fontSize: '1.35rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Gym Flow account</h1>
      <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
        Sign in to back up workouts, plans, and stats to the cloud. Use an email account or Google — data syncs when you
        use Gym Flow on this site while signed in.
      </p>

      {session?.user ? (
        <div
          style={{
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>Signed in</p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem', color: '#475569' }}>
            {session.user.email ?? session.user.name ?? session.user.id}
          </p>
        </div>
      ) : (
        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>You are not signed in.</p>
      )}

      {!env.hasSecret && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            color: '#991b1b',
            fontSize: '0.9rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Auth is not configured on this deployment</p>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#7f1d1d', opacity: 0.95 }}>{deployHint}</p>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>
            Set <code style={{ fontSize: '0.85em' }}>AUTH_SECRET</code> in Vercel (or <code>.env.local</code> locally),
            then redeploy. Without it you will see generic “Server error / server configuration” messages.
          </p>
        </div>
      )}

      {env.hasSecret && !canSignInAny && (
        <div
          role="alert"
          style={{
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid #fde68a',
            background: '#fffbeb',
            color: '#92400e',
            fontSize: '0.9rem',
            marginBottom: '1rem',
          }}
        >
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>No sign-in method enabled</p>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            Add <strong>Neon / Postgres</strong> (<code>POSTGRES_URL</code> or <code>DATABASE_URL</code>) for email
            accounts, and/or <strong>Google OAuth</strong> keys. Server currently:{' '}
            <strong>{env.hasDatabase ? 'Database: set' : 'Database: missing'}</strong>
            {' · '}
            <strong>{env.hasGoogle ? 'Google OAuth: set' : 'Google OAuth: missing'}</strong>
          </p>
        </div>
      )}

      {session?.user ? (
        <GymFlowAuthButtons hasSession disabled={false} />
      ) : (
        <>
          {emailReady && <GymFlowEmailAuthForm />}
          {googleReady && (
            <>
              {emailReady && (
                <p
                  style={{
                    margin: '0 0 0.65rem',
                    fontSize: '0.88rem',
                    color: '#64748b',
                    fontWeight: 600,
                  }}
                >
                  Or continue with Google
                </p>
              )}
              <GymFlowAuthButtons hasSession={false} disabled={false} />
            </>
          )}
        </>
      )}

      <ul style={{ margin: '1.5rem 0 0', paddingLeft: '1.2rem', color: '#64748b', fontSize: '0.88rem' }}>
        <li>Use the same browser; opening <strong>/gym-flow/</strong> after sign-in will load cloud data when it is newer than this device.</li>
        <li>
          Google sign-in: add authorized redirect URI{' '}
          <code style={{ fontSize: '0.8em' }}>/api/auth/callback/google</code> on your domain.
        </li>
      </ul>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/gym-flow/" style={{ color: '#0d9488', fontWeight: 600 }}>
          ← Open Gym Flow
        </Link>
      </p>
    </main>
  );
}
