import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !supabaseKey) return null;
  return createClient(supabaseUrl, supabaseKey);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 Hours Session Expiry
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const email = user.email || "";
        const supabase = getSupabase();
        
        if (!supabase) {
          console.error("Supabase client could not be initialized");
          return false;
        }
        
        // Temporary allowlist authentication via RPC
        const { data, error } = await supabase.rpc('get_allowed_user', { lookup_email: email });
        
        if (error || !data || data.status !== 'active') {
          console.error("Error verifying allowed user or inactive:", error);
          return false;
        }

        // Sync user via RPC (this returns the true Supabase UUID)
        const { data: syncedId, error: syncError } = await supabase.rpc('sync_nextauth_user', {
          google_email: email,
          google_name: user.name || '',
          google_image: user.image || ''
        });

        if (syncError || !syncedId) {
          console.error("Error syncing NextAuth user to Supabase:", syncError);
          return false;
        }
        
        // Attach the real UUID to the user object so it can be passed to JWT
        user.id = syncedId;

        return true;
      }
      return false;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; // Now correctly holds the Supabase UUID!
        token.email = user.email;
        token.name = user.name;
        
        const supabase = getSupabase();
        if (user.email === 'syed.ae018@gmail.com') {
          token.role = 'managing_director';
        } else if (supabase) {
          // Fetch role from allowed_users
          const { data } = await supabase.rpc('get_allowed_user', { lookup_email: user.email });
          if (data && data.status === 'active') {
            token.role = data.role === 'admin' ? 'managing_director' : data.role;
          } else {
            token.role = 'employee';
          }
        } else {
          token.role = 'employee';
        }
      }
      
      // Sign a Supabase token
      const signingSecret = process.env.SUPABASE_JWT_SECRET;
      if (signingSecret) {
        const payload = {
          aud: "authenticated",
          exp: Math.floor(new Date(token.exp as number).getTime()),
          sub: token.id,
          email: token.email,
          role: "authenticated",
        };
        token.supabaseAccessToken = jwt.sign(payload, signingSecret);
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // @ts-ignore
        session.user.id = token.id;
        // @ts-ignore
        session.user.role = token.role;
        // @ts-ignore
        session.supabaseAccessToken = token.supabaseAccessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login', 
  },
  secret: process.env.NEXTAUTH_SECRET,
};
