'use client';

import { SessionProvider } from 'next-auth/react';

export default function GymFlowSignInPopupLayout({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
