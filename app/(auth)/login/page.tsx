"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Flame, Loader2, Eye, EyeOff, Users, Shield, Zap, ArrowRight, Lock, Mail } from "lucide-react"
import { login } from "../actions"
import Link from "next/link"

export default function LoginPage({
  searchParams,
}: {
  searchParams: { message?: string }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(searchParams?.message || "")
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        const result = await login(formData)
        if (result && typeof result === "object" && "error" in result) {
          setError((result as any).error)
        }
      } catch (err: any) {
        if (err?.message === "NEXT_REDIRECT") return
        if (err?.digest?.startsWith("NEXT_REDIRECT")) return
        setError("An unexpected error occurred. Please try again.")
      }
    })
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden font-sans">
      
      {/* ── LEFT SIDE — Cinematic Purple Visual ── */}
      <div className="hidden md:flex flex-col flex-1 relative overflow-hidden p-10 lg:p-14 bg-[#090014]">
        
        {/* Deep layered ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[160px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-secondary/15 rounded-full blur-[140px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[200px]" />
          {/* Subtle grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(168,85,247,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(168,85,247,0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>

        {/* Brand — Top Left */}
        <div className="relative z-20 flex items-center gap-3 mb-auto">
          <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center shadow-luxury-glow">
            <Flame className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-syne font-bold text-xl text-foreground tracking-tighter">GroTrack</span>
        </div>

        {/* Central floating dashboard mockup */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] pointer-events-none z-10">
          <div className="glass-card p-6 shadow-purple-bloom">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-full bg-gradient-primary shadow-luxury-glow flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-foreground">GroTrack Dashboard</span>
              <div className="ml-auto flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_#8b5cff]" />
                <div className="w-2 h-2 rounded-full bg-secondary/60" />
                <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: "Active Tasks", value: "128", color: "text-primary" },
                { label: "Revenue", value: "$24.6K", color: "text-emerald-400" },
                { label: "Employees", value: "12", color: "text-secondary" },
                { label: "Clients", value: "8", color: "text-[#c084fc]" },
              ].map((s) => (
                <div key={s.label} className="bg-input rounded-xl p-3 border border-border">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{s.label}</p>
                  <p className={`text-lg font-bold font-syne ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
            {/* Mini bar chart */}
            <div className="flex items-end gap-2 h-16 px-1">
              {[30, 55, 45, 70, 60, 85, 72].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: i === 5 ? 'linear-gradient(180deg, #8B5CFF, #A855F7)' : 'rgba(168,85,247,0.25)', boxShadow: i === 5 ? '0 0 10px rgba(139,92,246,0.6)' : 'none' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Typography & Stats — Bottom Left */}
        <div className="relative z-20 flex flex-col w-full max-w-[560px] mt-auto">
          <h2 className="text-[40px] lg:text-[48px] leading-[1.05] font-syne font-bold text-foreground mb-4 tracking-tight">
            The OS for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-primary drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]">
              creative
            </span>{" "}
            agencies.
          </h2>
          <p className="text-[#b8a9d9] text-[15px] leading-relaxed mb-10 max-w-[500px]">
            Track tasks, manage clients, automate payments — built for video editors, designers and AI creators.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {[
              { icon: Users, label: "Active Agencies", value: "10K+" },
              { icon: Zap, label: "Tasks Delivered", value: "98%" },
              { icon: Shield, label: "Your Data", value: "Secure" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 px-4 py-3 glass-card">
                <Icon className="w-4 h-4 text-primary drop-shadow-[0_0_8px_rgba(139,92,246,0.7)]" />
                <div>
                  <div className="text-foreground font-bold text-[13px] tracking-tight">{value}</div>
                  <div className="text-muted-foreground text-[9px] uppercase tracking-[0.1em] font-bold mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT SIDE — Form ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative bg-[#05010d]">
        {/* Ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px] pointer-events-none" />

        {/* Card */}
        <div className="relative w-full max-w-[460px] z-10">
          {/* Animated neon border */}
          <div className="absolute inset-[-1px] rounded-[32px] bg-gradient-primary opacity-30 blur-sm pointer-events-none" />
          <div className="relative bg-surface backdrop-blur-[20px] rounded-[28px] p-8 lg:p-10 border border-primary/25 shadow-purple-bloom">

            {/* Mobile logo */}
            <div className="flex md:hidden items-center gap-3 mb-8">
              <div className="w-9 h-9 rounded-full bg-gradient-primary shadow-luxury-glow flex items-center justify-center">
                <Flame className="w-4 h-4 text-white" />
              </div>
              <span className="font-syne font-bold text-xl text-foreground">GroTrack</span>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_#8b5cff]" />
                <span className="text-xs text-primary font-medium">Secure Sign In</span>
              </div>
              <h1 className="font-syne font-bold text-[32px] text-foreground mb-2 tracking-tight">
                Welcome{" "}
                <span className="text-transparent bg-clip-text bg-gradient-primary">back</span>
              </h1>
              <p className="text-sm text-muted-foreground">Sign in to access your workspace.</p>
            </div>

            {/* Error */}
            {error && (
              <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-start gap-3 backdrop-blur-md">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
                  <Mail className="w-3 h-3 text-primary" /> Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  disabled={isPending}
                  autoComplete="email"
                  placeholder="you@agency.com"
                  className="w-full h-14 bg-input border border-border rounded-full px-6 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all disabled:opacity-50 shadow-inner"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
                    <Lock className="w-3 h-3 text-primary" /> Password
                  </label>
                  <Link href="#" className="text-[11px] text-primary hover:text-secondary transition-colors font-medium">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    required
                    disabled={isPending}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full h-14 bg-input border border-border rounded-full px-6 pr-14 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all disabled:opacity-50 shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full h-14 mt-6 rounded-full bg-gradient-primary text-[15px] font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-purple-bloom hover:shadow-[0_0_50px_rgba(139,92,246,0.7)] border border-primary/30"
              >
                {isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
                ) : (
                  <><span>Sign In to Workspace</span><ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Don't have an account?{" "}
              <Link href="/signup" className="text-primary font-medium hover:text-secondary transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
