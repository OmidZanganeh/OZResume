import Link from 'next/link';
import { auth } from '@/auth';
import { GymFlowAuthButtons } from '@/components/gym-flow/GymFlowAuthButtons';
import { getAuthEnvStatus } from '@/lib/auth-env';

export const metadata = {
  title: 'Gym Flow — Account & cloud backup',
  robots: { index: false, follow: false },
};

export default async function GymFlowAccountPage() {
  const session = await auth();
  const env = getAuthEnvStatus();
  const authReady = env.hasSecret && env.hasGoogle;

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
        Sign in with Google to back up your workouts, plans, and stats to the cloud. Data syncs when you use Gym Flow
        on this site while signed in.
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

      {!authReady && (
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
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Sign-in is not configured on this deployment</p>
          <p style={{ margin: 0 }}>
            Auth.js needs a secret and Google OAuth keys. In{' '}
            <strong>Vercel → Project → Settings → Environment Variables</strong>, set for <strong>Production</strong>:
          </p>
          <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.2rem' }}>
            {!env.hasSecret && (
              <li>
                <code style={{ fontSize: '0.85em' }}>AUTH_SECRET</code> — run locally:{' '}
                <code style={{ fontSize: '0.85em' }}>npx auth secret</code> or{' '}
                <code style={{ fontSize: '0.85em' }}>openssl rand -base64 32</code>
              </li>
            )}
            {!env.hasGoogle && (
              <li>
                <code style={{ fontSize: '0.85em' }}>AUTH_GOOGLE_ID</code> and{' '}
                <code style={{ fontSize: '0.85em' }}>AUTH_GOOGLE_SECRET</code> from Google Cloud OAuth (Web client)
              </li>
            )}
          </ul>
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
            Redeploy after saving. A missing <code>AUTH_SECRET</code> causes the generic “Server error / problem with the
            server configuration” page.
          </p>
        </div>
      )}

      <GymFlowAuthButtons hasSession={!!session?.user} disabled={!authReady} />

      <ul style={{ margin: '1.5rem 0 0', paddingLeft: '1.2rem', color: '#64748b', fontSize: '0.88rem' }}>
        <li>Use the same browser; opening <strong>/gym-flow/</strong> after sign-in will load cloud data when it is newer than this device.</li>
        <li>Add authorized redirect URI in Google Cloud: <code style={{ fontSize: '0.8em' }}>/api/auth/callback/google</code> on your domain.</li>
      </ul>

      <p style={{ marginTop: '2rem' }}>
        <Link href="/gym-flow/" style={{ color: '#0d9488', fontWeight: 600 }}>
          ← Open Gym Flow
        </Link>
      </p>
    </main>
  );
}
