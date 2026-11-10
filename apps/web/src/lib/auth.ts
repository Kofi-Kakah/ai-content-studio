import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Auth.js (NextAuth v5) with a credentials provider backed by the API server.
 * The API returns its own signed JWT which we keep in the session and forward
 * as a Bearer token from the BFF proxy route (app/api/v1/[...path]).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days — matches the API token TTL
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  trustHost: true,
  providers: [
    Credentials({
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: credentials?.email,
            password: credentials?.password,
          }),
        });

        if (!res.ok) return null;

        const data = (await res.json()) as {
          token: string;
          user: { id: string; email: string; name: string | null; image: string | null };
        };

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          image: data.user.image,
          accessToken: data.token,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.uid = user.id as string | undefined;
        token.accessToken = (user as { accessToken?: string }).accessToken;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
      }
      // NOTE: accessToken intentionally stays off the client session —
      // the BFF proxy decrypts it from the cookie server-side.
      return session;
    },
  },
});
