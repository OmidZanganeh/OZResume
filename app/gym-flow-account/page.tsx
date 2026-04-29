import Link from 'next/link';
import { auth } from '@/auth';
import { GymFlowAuthButtons } from '@/components/gym-flow/GymFlowAuthButtons';

export const metadata = {
  title: 'Gym Flow — Account & cloud backup',
  robots: { index: false, follow: false },
};

export default async function GymFlowAccountPage() {
  const session = await auth();

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

      <GymFlowAuthButtons hasSession={!!session?.user} />

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
