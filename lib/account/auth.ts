import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Google sign-in with Auth.js. Sessions are signed cookies (JWT), so pages stay static:
 * only /api/me and the account widgets on the client ever read the session.
 */
export const { handlers, auth, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 180 },
  trustHost: true,
  callbacks: {
    jwt({ token, account }) {
      // The Google account id, stable even if the person changes their email.
      if (account?.provider === "google" && account.providerAccountId) token.uid = `google:${account.providerAccountId}`;
      return token;
    },
    session({ session, token }) {
      if (token.uid) session.user.id = token.uid as string;
      return session;
    }
  }
});

/** The signed-in user's id, or null. */
export async function currentUserId() {
  const session = await auth();
  return session?.user?.id ?? null;
}
