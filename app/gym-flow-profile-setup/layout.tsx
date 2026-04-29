import { GymFlowAuthHeader } from '@/components/gym-flow/GymFlowAuthHeader';
import { GymFlowAuthShell } from '@/components/gym-flow/GymFlowAuthShell';
import '../gym-flow-surface.css';

export default function GymFlowProfileSetupLayout({ children }: { children: React.ReactNode }) {
  return (
    <GymFlowAuthShell>
      <GymFlowAuthHeader subtitle="Your profile" />
      {children}
    </GymFlowAuthShell>
  );
}
