'use client';

import type { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';

type Props = {
  children: ReactNode;
};

/** Dark Gym Flow chrome + NextAuth session scope for account, popup sign-in, and profile setup. */
export function GymFlowAuthShell({ children }: Props) {
  return (
    <SessionProvider>
      <div className="gym-flow-auth-shell">{children}</div>
    </SessionProvider>
  );
}
