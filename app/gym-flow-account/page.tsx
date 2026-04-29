import Link from 'next/link';
import { auth } from '@/auth';
import { GymFlowAuthButtons } from '@/components/gym-flow/GymFlowAuthButtons';
import { GymFlowEmailAuthForm } from '@/components/gym-flow/GymFlowEmailAuthForm';
import { getAuthEnvStatus } from '@/lib/auth-env';

export const metadata = {
  title: 'Gym Flow — Account',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function GymFlowAccountPage() {
  const session = await auth();
  const env = getAuthEnvStatus();
  const googleReady = env.hasSecret && env.hasGoogle;
  const emailReady = env.hasSecret && env.hasDatabase;
  const canSignInAny = googleReady || emailReady;

  return (
    <main className="gym-flow-auth-main">
      {session?.user ? (
        <div className="gym-flow-auth-card">
          <p className="gym-flow-auth-row-label">Signed in</p>
          <p className="gym-flow-auth-row-meta">{session.user.email ?? session.user.name ?? session.user.id}</p>
        </div>
      ) : null}

      {!session?.user && !canSignInAny && (
        <p className="gym-flow-auth-muted" style={{ marginBottom: '1rem' }}>
          Sign-in isn&apos;t available right now.
        </p>
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

      <p className="gym-flow-auth-back">
        <Link href="/gym-flow/" className="gym-flow-auth-link">
          ← Open Gym Flow
        </Link>
      </p>
    </main>
  );
}
