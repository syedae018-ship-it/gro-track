"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, CheckCircle2, Loader2, Camera, User, Phone, Mail, Briefcase, CreditCard, Building2, Link2, Save, Trash2 } from "lucide-react"
import { updateProfile, uploadAvatar, removeAvatar } from "@/app/(dashboard)/dashboard/settings/actions"
import Image from "next/image"

const PAYMENT_METHODS = [
 { value: "", label: "Select method" },
 { value: "upi", label: "UPI" },
 { value: "bank_transfer", label: "Bank Transfer" },
 { value: "cash", label: "Cash" },
 { value: "other", label: "Other" },
]

interface ProfileSettingsFormProps {
 profile: any
 userId: string
 userEmail: string
}

export function ProfileSettingsForm({ profile, userId, userEmail }: ProfileSettingsFormProps) {
 // Avatar state
 const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null)
 const [avatarFile, setAvatarFile] = useState<File | null>(null)
 const [uploading, setUploading] = useState(false)
 const [isDragging, setIsDragging] = useState(false)
 const [avatarError, setAvatarError] = useState("")

 // Form state
 const [saving, setSaving] = useState(false)
 const [saved, setSaved] = useState(false)
 const [formError, setFormError] = useState("")

 const fileInputRef = useRef<HTMLInputElement>(null)

 function getInitials(name: string) {
 return (name || "?").split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
 }

 // ── Avatar handlers ──────────────────────────────────────────────────────
 function processFile(file: File) {
 setAvatarError("")
 const allowed = ["image/jpeg", "image/png", "image/webp"]
 if (!allowed.includes(file.type)) { setAvatarError("Only JPG, PNG, WEBP supported."); return }
 if (file.size > 2 * 1024 * 1024) { setAvatarError("Max file size is 2MB."); return }
 setAvatarFile(file)
 setAvatarPreview(URL.createObjectURL(file))
 }

 function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
 const file = e.target.files?.[0]
 if (file) processFile(file)
 }

 const handleDrop = useCallback((e: React.DragEvent) => {
 e.preventDefault()
 setIsDragging(false)
 const file = e.dataTransfer.files?.[0]
 if (file) processFile(file)
 }, [])

 async function handleAvatarUpload() {
 if (!avatarFile) return
 setUploading(true)
 setAvatarError("")
 const fd = new FormData()
 fd.append("avatar", avatarFile)
 const result = await uploadAvatar(fd)
 if (result.error) {
 setAvatarError(result.error)
 } else if (result.avatarUrl) {
 setAvatarPreview(result.avatarUrl)
 setAvatarFile(null)
 }
 setUploading(false)
 }

 async function handleRemoveAvatar() {
 setUploading(true)
 const result = await removeAvatar()
 if (!result.error) {
 setAvatarPreview(null)
 setAvatarFile(null)
 }
 setUploading(false)
 }

 // ── Profile save ─────────────────────────────────────────────────────────
 async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
 e.preventDefault()
 setSaving(true)
 setFormError("")
 setSaved(false)
 const result = await updateProfile(new FormData(e.currentTarget))
 if (result.error) {
 setFormError(result.error)
 } else {
 setSaved(true)
 setTimeout(() => setSaved(false), 3000)
 }
 setSaving(false)
 }

 const initials = getInitials(profile?.full_name || "")

 return (
 <div className="flex flex-col gap-5">

 {/* ── Avatar Card ── */}
 <div className="enterprise-card p-5 sm:p-6">
 <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
 <Camera className="w-4 h-4" /> Profile Photo
 </h2>

 <div className="flex flex-col sm:flex-row items-center gap-6">
 {/* Preview */}
 <div className="relative shrink-0">
 <div
 onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
 onDragLeave={() => setIsDragging(false)}
 onDrop={handleDrop}
 onClick={() => !avatarPreview && fileInputRef.current?.click()}
 className={`w-24 h-24 rounded-2xl overflow-hidden relative group transition-all ${
 !avatarPreview ? "cursor-pointer border-2 border-dashed border-border hover:border-violet-500/40" : ""
 } ${isDragging ? "border-violet-500/60 bg-violet-500/5" : ""}`}
 >
 {avatarPreview ? (
 <>
 <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
 <div className="absolute inset-0 bg-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
 <button
 type="button"
 onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
 className="text-foreground text-xs font-semibold flex flex-col items-center gap-1"
 >
 <Camera className="w-5 h-5" />
 Change
 </button>
 </div>
 </>
 ) : (
 <div className="w-full h-full bg-gradient-to-br from-violet-600 to-blue-600 flex flex-col items-center justify-center gap-1">
 <span className="text-xl font-bold text-foreground">{initials}</span>
 <Upload className="w-4 h-4 text-muted-foreground" />
 </div>
 )}
 </div>
 <input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFileInput} />
 </div>

 {/* Controls */}
 <div className="flex flex-col gap-3 flex-1">
 <div>
 <p className="text-sm font-semibold text-foreground">{profile?.full_name || "Your Name"}</p>
 <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>
 </div>

 {avatarError && (
 <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5">{avatarError}</p>
 )}

 <div className="flex flex-wrap gap-2">
 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="flex items-center gap-2 text-xs font-semibold text-foreground bg-muted hover:bg-muted border border-border px-3 py-2 rounded-xl transition-all"
 >
 <Upload className="w-3.5 h-3.5" />
 {avatarPreview ? "Change Photo" : "Upload Photo"}
 </button>

 {avatarFile && (
 <button
 type="button"
 onClick={handleAvatarUpload}
 disabled={uploading}
 className="flex items-center gap-2 text-xs font-bold text-foreground bg-violet-600 hover:bg-violet-500 px-3 py-2 rounded-xl transition-all disabled:opacity-50"
 >
 {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
 {uploading ? "Uploading…" : "Save Photo"}
 </button>
 )}

 {avatarPreview && !avatarFile && (
 <button
 type="button"
 onClick={handleRemoveAvatar}
 disabled={uploading}
 className="flex items-center gap-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 px-3 py-2 rounded-xl transition-all"
 >
 <Trash2 className="w-3.5 h-3.5" /> Remove
 </button>
 )}
 </div>
 <p className="text-[10px] text-muted-foreground">JPG, PNG, WEBP · max 2MB · Drag & drop supported</p>
 </div>
 </div>
 </div>

 {/* ── Profile Form ── */}
 <form onSubmit={handleSubmit} className="flex flex-col gap-5">

 {/* Personal Info */}
 <div className="enterprise-card p-5 sm:p-6">
 <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
 <User className="w-4 h-4" /> Personal Information
 </h2>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <FormField
 label="Full Name"
 name="full_name"
 defaultValue={profile?.full_name}
 placeholder="Your full name"
 required
 icon={<User className="w-3.5 h-3.5" />}
 />
 <FormField
 label="Phone Number"
 name="phone"
 type="tel"
 defaultValue={profile?.phone}
 placeholder="+91 9876543210"
 icon={<Phone className="w-3.5 h-3.5" />}
 />
 <FormField
 label="Email Address"
 name="email"
 type="email"
 defaultValue={profile?.email || userEmail}
 placeholder="you@example.com"
 icon={<Mail className="w-3.5 h-3.5" />}
 />
 <FormField
 label="Specialization / Title"
 name="specialization"
 defaultValue={profile?.specialization}
 placeholder="e.g. Video Editor, Motion Designer"
 icon={<Briefcase className="w-3.5 h-3.5" />}
 />
 </div>
 </div>

 {/* Payment Details */}
 <div className="enterprise-card p-5 sm:p-6">
 <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-2">
 <CreditCard className="w-4 h-4" /> Payment Details
 </h2>
 <p className="text-[11px] text-muted-foreground mb-5">Visible only to admins for processing payouts.</p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
 <div className="space-y-1.5">
 <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment Method</label>
 <select
 name="payment_method"
 defaultValue={profile?.payment_method || ""}
 className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
 >
 {PAYMENT_METHODS.map(m => (
 <option key={m.value} value={m.value} className="bg-background">{m.label}</option>
 ))}
 </select>
 </div>
 <FormField
 label="UPI ID"
 name="upi_id"
 defaultValue={profile?.upi_id}
 placeholder="yourname@upi"
 icon={<Link2 className="w-3.5 h-3.5" />}
 />
 <FormField
 label="Bank Name"
 name="bank_name"
 defaultValue={profile?.bank_name}
 placeholder="e.g. HDFC Bank"
 icon={<Building2 className="w-3.5 h-3.5" />}
 />
 <FormField
 label="Account Holder Name"
 name="account_holder_name"
 defaultValue={profile?.account_holder_name}
 placeholder="Name on bank account"
 icon={<User className="w-3.5 h-3.5" />}
 />
 </div>
 </div>

 {/* Notes (for admins editing their own notes) */}
 <div className="enterprise-card p-5 sm:p-6">
 <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Notes</h2>
 <textarea
 name="notes"
 defaultValue={profile?.notes || ""}
 rows={3}
 placeholder="Any internal notes (optional)…"
 className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 transition-all resize-none"
 />
 </div>

 {/* Error / Save */}
 <AnimatePresence>
 {formError && (
 <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
 className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5"
 >
 {formError}
 </motion.p>
 )}
 </AnimatePresence>

 <button
 type="submit"
 disabled={saving}
 className={`flex items-center justify-center gap-2 min-h-[48px] h-12 w-full rounded-xl text-sm font-bold transition-all touch-target ${
 saved
 ? "bg-emerald-600 text-foreground"
 : " from-violet-600 to-blue-600 hover:opacity-90 text-foreground shadow-lg shadow-violet-500/20"
 } disabled:opacity-50`}
 >
 {saving ? (
 <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
 ) : saved ? (
 <><CheckCircle2 className="w-4 h-4" /> Saved!</>
 ) : (
 <><Save className="w-4 h-4" /> Save Profile</>
 )}
 </button>
 </form>
 </div>
 )
}

// ── FormField helper ─────────────────────────────────────────────────────────
function FormField({
 label, name, defaultValue, placeholder, type = "text", required, icon
}: {
 label: string
 name: string
 defaultValue?: string | null
 placeholder?: string
 type?: string
 required?: boolean
 icon?: React.ReactNode
}) {
 return (
 <div className="space-y-1.5">
 <label htmlFor={name} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
 {label}{required && <span className="text-red-400 ml-1">*</span>}
 </label>
 <div className="relative">
 {icon && (
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</div>
 )}
 <input
 id={name}
 type={type}
 name={name}
 defaultValue={defaultValue || ""}
 placeholder={placeholder}
 required={required}
 className={`w-full bg-muted border border-border rounded-xl py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all ${icon ? "pl-9 pr-3.5" : "px-3.5"}`}
 />
 </div>
 </div>
 )
}
