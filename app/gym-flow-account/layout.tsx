import { GymFlowAuthHeader } from '@/components/gym-flow/GymFlowAuthHeader';
import { GymFlowAuthShell } from '@/components/gym-flow/GymFlowAuthShell';
import '../gym-flow-surface.css';

export default function GymFlowAccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <GymFlowAuthShell>
      <GymFlowAuthHeader subtitle="Account" />
      {children}
    </GymFlowAuthShell>
  );
}
