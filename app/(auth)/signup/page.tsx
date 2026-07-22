"use client"

import { Check, Mail, ArrowRight, Loader2, Flame, User2, Lock, UserCog } from "lucide-react"
import { signup, resendVerificationEmail } from "../actions"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function SignupPage({
 searchParams,
}: {
 searchParams: { message: string }
}) {
 const router = useRouter()
 const [isLoading, setIsLoading] = useState(false)
 const isSubmitting = useRef(false)
 const [verificationEmail, setVerificationEmail] = useState<string | null>(null)
 const [resendCooldown, setResendCooldown] = useState(0)
 const [isResending, setIsResending] = useState(false)

 useEffect(() => {
 if (resendCooldown > 0) {
 const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000)
 return () => clearTimeout(timer)
 }
 }, [resendCooldown])

 useEffect(() => {
 if (searchParams?.message) {
 toast.error(searchParams.message)
 router.replace('/signup', { scroll: false })
 }
 }, [searchParams, router])

 async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
 e.preventDefault()
 if (isSubmitting.current) return
 isSubmitting.current = true
 setIsLoading(true)
 try {
 const formData = new FormData(e.currentTarget)
 const result = await signup(formData)
 if (result?.error) {
 toast.error(result.error)
 } else if (result?.success) {
 if (result.autoLogin) {
 toast.success("Account created! Redirecting to dashboard...")
 router.push('/dashboard/overview')
 router.refresh()
 } else {
 toast.success("Account created! Please verify your email.")
 setVerificationEmail(result.email!)
 setResendCooldown(60)
 }
 }
 } catch (error: any) {
 toast.error("An unexpected error occurred. Please try again.")
 } finally {
 setIsLoading(false)
 isSubmitting.current = false
 }
 }

 async function handleResendEmail() {
 if (resendCooldown > 0 || isResending || !verificationEmail) return
 setIsResending(true)
 try {
 const result = await resendVerificationEmail(verificationEmail)
 if (result?.error) {
 toast.error(result.error)
 } else {
 toast.success("Verification email resent!")
 setResendCooldown(60)
 }
 } catch (error) {
 toast.error("Failed to resend email.")
 } finally {
 setIsResending(false)
 }
 }

 return (
 <div className="min-h-screen bg-background flex flex-col md:flex-row overflow-hidden relative font-sans">

 {/* ── LEFT SIDE — Branding ── */}
 <div className="hidden md:flex flex-col flex-1 relative bg-background p-12 justify-between border-r border-border hover:border-primary/30 overflow-hidden">
 {/* Ambient Glows */}
 <div className="absolute inset-0 pointer-events-none">
 <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/25 rounded-full blur-[140px]" />
 <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-secondary/20 rounded-full blur-[160px]" />
 <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(168,85,247,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(168,85,247,0.06)_1px,transparent_1px)] bg-[size:40px_40px]" />
 </div>

 {/* Logo */}
 <div className="relative z-10 flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-primary shadow-sm flex items-center justify-center">
 <Flame className="w-5 h-5 text-foreground" strokeWidth={2.5} />
 </div>
 <span className="font-syne font-bold text-xl text-foreground tracking-tight">GroTrack</span>
 </div>

 {/* Hero Copy */}
 <div className="relative z-10 max-w-md my-auto">
 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-border hover:border-primary/30 mb-6">
 <div className="w-1.5 h-1.5 rounded-full bg-primary " />
 <span className="text-xs text-primary font-medium">Join thousands of agencies</span>
 </div>
 <h2 className="text-[38px] font-syne font-bold text-foreground mb-6 leading-tight tracking-tight">
 Elevate your agency's{" "}
 <span className=" bg-primary">operational</span>{" "}
 flow.
 </h2>
 <div className="space-y-4">
 {[
 "Seamless task & workflow management",
 "Automated invoicing & payment tracking",
 "Granular role-based access control",
 ].map((feature) => (
 <div key={feature} className="flex items-center gap-3">
 <div className="w-7 h-7 rounded-full bg-primary/15 border border-border hover:border-primary/30 shadow-sm flex items-center justify-center shrink-0">
 <Check className="w-3.5 h-3.5 text-primary" />
 </div>
 <span className="text-sm text-muted-foreground">{feature}</span>
 </div>
 ))}
 </div>
 </div>

 {/* Bottom stats */}
 <div className="relative z-10 grid grid-cols-3 gap-3">
 {[
 { label: "Agencies", value: "10K+" },
 { label: "Tasks Done", value: "2M+" },
 { label: "Uptime", value: "99.9%" },
 ].map((s) => (
 <div key={s.label} className="enterprise-card p-4 text-center">
 <p className="font-syne font-bold text-xl text-primary">{s.value}</p>
 <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{s.label}</p>
 </div>
 ))}
 </div>
 </div>

 {/* ── RIGHT SIDE — Form ── */}
 <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-12 relative overflow-y-auto bg-background">
 {/* Ambient glow */}
 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[180px] pointer-events-none" />

 <div className="w-full max-w-[440px] space-y-8 my-auto relative z-10">

 {verificationEmail ? (
 // ── VERIFICATION VIEW ──
 <div className="flex flex-col items-center text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
 <div className="relative">
 <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
 <div className="relative w-20 h-20 rounded-2xl bg-card border border-border hover:border-primary/30 shadow-md flex items-center justify-center text-primary">
 <Mail className="w-9 h-9" />
 </div>
 </div>
 <div className="space-y-2">
 <h1 className="font-syne font-bold text-3xl text-foreground">Check your email</h1>
 <p className="text-sm text-muted-foreground leading-relaxed">
 We've sent a verification link to{" "}
 <span className="text-primary font-medium">{verificationEmail}</span>.
 Click the link to activate your account.
 </p>
 </div>

 <div className="w-full pt-4 space-y-3 border-t border-border">
 <button
 onClick={handleResendEmail}
 disabled={resendCooldown > 0 || isResending}
 className="w-full h-12 rounded-full border border-border hover:border-primary/30 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
 >
 {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
 {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Verification Email"}
 </button>

 <Link href="/login" className="block">
 <button className="w-full h-12 rounded-full bg-card border border-border text-muted-foreground text-sm font-medium hover:text-primary hover:border-border hover:border-primary/30 transition-all flex items-center justify-center gap-2">
 Back to login <ArrowRight className="w-4 h-4" />
 </button>
 </Link>
 </div>
 </div>
 ) : (
 // ── SIGNUP FORM VIEW ──
 <div className="animate-in fade-in duration-500">
 {/* Mobile logo */}
 <div className="flex md:hidden items-center gap-3 mb-8">
 <div className="w-9 h-9 rounded-full bg-primary shadow-sm flex items-center justify-center">
 <Flame className="w-4 h-4 text-foreground" />
 </div>
 <span className="font-syne font-bold text-xl text-foreground">GroTrack</span>
 </div>

 {/* Glowing card */}
 <div className="relative">
 <div className="absolute inset-[-1px] rounded-[28px] bg-primary opacity-20 blur-sm pointer-events-none" />
 <div className="relative bg-card rounded-[24px] p-8 border border-border hover:border-primary/30 shadow-md">
 
 {/* Header */}
 <div className="mb-7">
 <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-border hover:border-primary/30 mb-4">
 <div className="w-1.5 h-1.5 rounded-full bg-primary " />
 <span className="text-xs text-primary font-medium">New Account</span>
 </div>
 <h1 className="font-syne font-bold text-[28px] text-foreground mb-1">Create an account</h1>
 <p className="text-sm text-muted-foreground">Set up your profile to join the workspace.</p>
 </div>

 <form onSubmit={handleSignup} className="space-y-4">
 {/* Full Name */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
 <User2 className="w-3 h-3 text-primary" /> Full Name
 </label>
 <input
 type="text"
 name="full_name"
 required
 disabled={isLoading}
 placeholder="John Doe"
 className="w-full h-12 bg-input border border-border rounded-full px-5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-border hover:border-primary/30 transition-all disabled:opacity-50"
 />
 </div>

 {/* Email */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
 <Mail className="w-3 h-3 text-primary" /> Email Address
 </label>
 <input
 type="email"
 name="email"
 required
 disabled={isLoading}
 placeholder="name@agency.com"
 className="w-full h-12 bg-input border border-border rounded-full px-5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-border hover:border-primary/30 transition-all disabled:opacity-50"
 />
 </div>

 {/* Password */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
 <Lock className="w-3 h-3 text-primary" /> Password
 </label>
 <input
 type="password"
 name="password"
 required
 disabled={isLoading}
 placeholder="••••••••"
 className="w-full h-12 bg-input border border-border rounded-full px-5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-border hover:border-primary/30 transition-all disabled:opacity-50"
 />
 </div>

 {/* Confirm Password */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
 <Lock className="w-3 h-3 text-primary" /> Confirm Password
 </label>
 <input
 type="password"
 name="confirm_password"
 required
 disabled={isLoading}
 placeholder="••••••••"
 className="w-full h-12 bg-input border border-border rounded-full px-5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-border hover:border-primary/30 transition-all disabled:opacity-50"
 />
 </div>

 {/* Role */}
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] flex items-center gap-2">
 <UserCog className="w-3 h-3 text-primary" /> Select Role
 </label>
 <select
 name="role"
 required
 disabled={isLoading}
 className="w-full h-12 bg-input border border-border rounded-full px-5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-border hover:border-primary/30 transition-all appearance-none disabled:opacity-50 cursor-pointer"
 >
 <option value="employee" className="bg-card text-foreground">Employee</option>
 <option value="admin_ops" className="bg-card text-foreground">Admin (Ops)</option>
 <option value="admin_finance" className="bg-card text-foreground">Admin (Finance)</option>
 <option value="managing_director" className="bg-card text-foreground">Admin (Managing Director)</option>
 </select>
 </div>

 <button
 type="submit"
 disabled={isLoading}
 className="w-full h-13 mt-2 rounded-full bg-primary text-[14px] font-bold text-primary-foreground hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-sm border border-border hover:border-primary/30 py-3.5"
 >
 {isLoading ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</>
 ) : (
 <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
 )}
 </button>
 </form>

 <p className="text-center text-sm text-muted-foreground mt-6">
 Already have an account?{" "}
 <Link href="/login" className="text-primary font-medium hover:text-secondary transition-colors">
 Sign in
 </Link>
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 )
}
