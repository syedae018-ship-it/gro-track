"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Flame, Loader2, Mail } from "lucide-react"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState(searchParams?.error || "")

  const handleGoogleLogin = async () => {
    setIsPending(true)
    setError("")
    try {
      await signIn("google", { callbackUrl: "/dashboard" })
    } catch (err) {
      setError("An unexpected error occurred. Please try again.")
      setIsPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-6 relative overflow-hidden font-sans">
      {/* Optional subtle grid background pattern for enterprise feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(100,100,100,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(100,100,100,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">
        {/* Brand Logo */}
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <Flame className="w-6 h-6 text-primary" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="font-bold text-2xl text-foreground tracking-tight">Sign in to GroTrack</h1>
            <p className="text-sm text-muted-foreground mt-1">Internal workspace access only</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl p-6 sm:p-8 border border-border shadow-sm text-center">
          {/* Error Message */}
          {error && (
            <div className="p-3 mb-6 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-2">
              <span className="mt-0.5 shrink-0 font-bold">!</span>
              <span>{error === "AccessDenied" ? "Access denied. Ensure you are using your @groitup.com workspace email." : error}</span>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-6">
            Authentication is restricted to authorized @groitup.com accounts.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={isPending}
            className="w-full h-11 rounded-lg bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</>
            ) : (
              <><Mail className="w-4 h-4" /> Sign In with Google Workspace</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
