import { GymFlowAuthHeader } from '@/components/gym-flow/GymFlowAuthHeader';
import { GymFlowAuthShell } from '@/components/gym-flow/GymFlowAuthShell';
import '../gym-flow-surface.css';

export default function GymFlowSignInPopupLayout({ children }: { children: React.ReactNode }) {
  return (
    <GymFlowAuthShell>
      <GymFlowAuthHeader subtitle="Sign in" />
      {children}
    </GymFlowAuthShell>
  );
}
