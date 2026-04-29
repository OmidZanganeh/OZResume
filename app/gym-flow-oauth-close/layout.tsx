import { GymFlowAuthHeader } from '@/components/gym-flow/GymFlowAuthHeader';
import '../gym-flow-surface.css';

export const metadata = {
  title: 'Gym Flow — sign-in',
  robots: { index: false, follow: false },
};

export default function GymFlowOauthCloseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gym-flow-auth-shell">
      <GymFlowAuthHeader subtitle="Signed in" />
      {children}
    </div>
  );
}
