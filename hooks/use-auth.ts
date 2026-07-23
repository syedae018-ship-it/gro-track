"use client";

import { useSession, signOut } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();

  const user = session?.user as any;

  return {
    data: session,
    status,
    user,
    session,
    role: user?.role || 'employee', // Read role directly from JWT payload
    isLoading: status === "loading",
    signOut: () => signOut({ callbackUrl: '/login' }),
  };
}
