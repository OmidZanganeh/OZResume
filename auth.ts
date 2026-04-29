import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { getAuthEnvStatus } from '@/lib/auth-env';

const { googleId, googleSecret, secret } = getAuthEnvStatus();

const providers = [];
if (googleId && googleSecret) {
  providers.push(
    Google({
      clientId: googleId,
      clientSecret: googleSecret,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  /** v5 reads AUTH_SECRET by default; set explicitly so NEXTAUTH_SECRET still works */
  secret: secret || undefined,
  providers,
  callbacks: {
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/gym-flow-account',
  },
});
