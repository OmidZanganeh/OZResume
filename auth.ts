import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import { getAuthEnvStatus } from '@/lib/auth-env';
import { isDatabaseConfigured } from '@/lib/db/database-url';
import { verifyEmailCredentials } from '@/lib/db/gym-flow-credentials';

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

if (isDatabaseConfigured()) {
  providers.push(
    Credentials({
      id: 'credentials',
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== 'string' || typeof password !== 'string') return null;
        const user = await verifyEmailCredentials(email, password);
        if (!user) return null;
        return { id: user.id, email: user.email, name: user.email };
      },
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
