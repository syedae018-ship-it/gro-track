import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createClient } from "@supabase/supabase-js";
import jwt from "jsonwebtoken";

// Use service role to bypass RLS during auth checks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      // 1. Verify if user is in allowed_users
      // We use the service role client to bypass any RLS
      const { data: allowedUser, error } = await supabase
        .from('allowed_users')
        .select('*')
        .eq('email', user.email)
        .eq('status', 'active')
        .maybeSingle();

      if (error || !allowedUser) {
        console.error("User not allowed:", user.email);
        return '/login?error=AccessDenied';
      }

      // 2. Sync user to auth.users and profiles (to satisfy Foreign Keys for Tasks/Projects)
      const { data: supabaseUid, error: syncError } = await supabase.rpc('sync_nextauth_user', {
        google_email: user.email,
        google_name: user.name || user.email.split('@')[0],
        google_image: user.image || ''
      });

      if (syncError) {
        console.error("Failed to sync NextAuth user to Supabase:", syncError);
        return false;
      }

      // Attach the role and UUID so we can put it in the JWT
      (user as any).role = allowedUser.role;
      (user as any).designation = allowedUser.designation;
      (user as any).supabaseUid = supabaseUid;

      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.role = (user as any).role;
        token.designation = (user as any).designation;
        token.supabaseUid = (user as any).supabaseUid;
      }

      // We need to encode a Supabase-compatible JWT using our SUPABASE_JWT_SECRET
      if (process.env.SUPABASE_JWT_SECRET && token.supabaseUid && !token.supabaseAccessToken) {
        token.supabaseAccessToken = jwt.sign(
          {
            aud: "authenticated",
            exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
            sub: token.supabaseUid,
            email: token.email,
            role: "authenticated",
            user_metadata: {
              role: token.role,
              designation: token.designation,
              full_name: token.name,
              avatar_url: token.picture
            }
          },
          process.env.SUPABASE_JWT_SECRET
        );
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).designation = token.designation;
        (session.user as any).id = token.supabaseUid; // Use the Supabase UUID as the ID
      }
      (session as any).supabaseAccessToken = token.supabaseAccessToken;
      return session;
    }
  },
  pages: {
    signIn: "/login",
    error: "/login"
  }
};
