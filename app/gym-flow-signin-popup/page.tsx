import { GymFlowSignInPopupClient } from '@/components/gym-flow/GymFlowSignInPopupClient';
import { getAuthEnvStatus } from '@/lib/auth-env';

export const dynamic = 'force-dynamic';

export default function GymFlowSignInPopupPage() {
  const env = getAuthEnvStatus();
  const showGoogle = env.hasSecret && env.hasGoogle;
  const showEmail = env.hasSecret && env.hasDatabase;

  return <GymFlowSignInPopupClient showGoogle={showGoogle} showEmail={showEmail} />;
}
