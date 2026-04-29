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
    <main className="gym-flow-auth-main">
      <p className="gym-flow-auth-lead">
        Sign in to back up workouts, plans, and stats to the cloud. Use an email account or Google — data syncs when
        you use Gym Flow on this site while signed in.
      </p>

      {session?.user ? (
        <div className="gym-flow-auth-card">
          <p className="gym-flow-auth-row-label">Signed in</p>
          <p className="gym-flow-auth-row-meta">{session.user.email ?? session.user.name ?? session.user.id}</p>
        </div>
      ) : (
        <p className="gym-flow-auth-muted" style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>
          You are not signed in.
        </p>
      )}

      {!env.hasSecret && (
        <div role="alert" className="gym-flow-auth-alert gym-flow-auth-alert--error">
          <p className="gym-flow-auth-alert-title">Auth is not configured on this deployment</p>
          <p>{deployHint}</p>
          <p>
            Set <code className="gym-flow-auth-code">AUTH_SECRET</code> in Vercel (or <code className="gym-flow-auth-code">.env.local</code>{' '}
            locally), then redeploy. Without it you will see generic &quot;Server error / server configuration&quot; messages.
          </p>
        </div>
      )}

      {env.hasSecret && !canSignInAny && (
        <div role="alert" className="gym-flow-auth-alert gym-flow-auth-alert--warn">
          <p className="gym-flow-auth-alert-title">No sign-in method enabled</p>
          <p>
            Add <strong>Neon / Postgres</strong> (<code className="gym-flow-auth-code">POSTGRES_URL</code> or{' '}
            <code className="gym-flow-auth-code">DATABASE_URL</code>) for email accounts, and/or <strong>Google OAuth</strong>{' '}
            keys. Server currently: <strong>{env.hasDatabase ? 'Database: set' : 'Database: missing'}</strong>
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
              {emailReady && <p className="gym-flow-auth-or-hint">Or continue with Google</p>}
              <GymFlowAuthButtons hasSession={false} disabled={false} />
            </>
          )}
        </>
      )}

      <ul className="gym-flow-auth-list">
        <li>
          Use the same browser; opening <strong>/gym-flow/</strong> after sign-in will load cloud data when it is newer
          than this device.
        </li>
        <li>
          Google sign-in: add authorized redirect URI{' '}
          <code className="gym-flow-auth-code">/api/auth/callback/google</code> on your domain.
        </li>
      </ul>

      <p className="gym-flow-auth-back">
        <Link href="/gym-flow/" className="gym-flow-auth-link">
          ← Open Gym Flow
        </Link>
      </p>
    </main>
  );
}
