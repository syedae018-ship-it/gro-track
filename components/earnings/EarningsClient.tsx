"use client"

import { useState, useMemo, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IndianRupee, CheckCircle2, Clock, TrendingUp, AlertTriangle, UploadCloud, FileText, Loader2, ArrowRight, Mail, MessageCircle } from "lucide-react"
import { formatINR, safeNum } from "@/lib/utils/currency"

import { requestPayout, markPayoutAsReceived } from "@/app/(dashboard)/dashboard/earnings/actions"
import { createClient } from "@/lib/supabase/client"

interface Task {
 id: string
 title: string
 status: string
 payout_status: 'unpaid' | 'payout_requested' | 'paid' | null
 payment_amount: number
 completed_at: string | null
 created_at: string
 client: { name: string } | null
}

interface Payout {
 id: string
 total_amount: number
 status: 'requested' | 'paid' | 'rejected'
 requested_at: string
 paid_at: string | null
 payment_proof_url: string | null
}

interface EarningsClientProps {
 initialTasks: Task[]
 initialPayouts: Payout[]
 employeeName: string
 employeeEmail: string
 employeeId: string
}

type DateFilter = "30 Days" | "60 Days" | "90 Days" | "All Time"

export function EarningsClient({ initialTasks = [], initialPayouts = [], employeeName, employeeEmail, employeeId }: EarningsClientProps) {
 const [tasks, setTasks] = useState<Task[]>(initialTasks || [])
 const [payouts, setPayouts] = useState<Payout[]>(initialPayouts || [])
 const [filter, setFilter] = useState<DateFilter>("All Time")

 const safeFormatDate = (iso: string | null | undefined, options?: Intl.DateTimeFormatOptions) => {
 if (!iso) return "—"
 const d = new Date(iso)
 if (isNaN(d.getTime())) return "—"
 return d.toLocaleDateString("en-IN", options || { day: 'numeric', month: 'short', year: 'numeric' })
 }
 
 const [isModalOpen, setIsModalOpen] = useState(false)
 const [isRequesting, setIsRequesting] = useState(false)
 const [requestError, setRequestError] = useState("")
 
 const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
 const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)

 // Filter tasks based on selected date range and normalize fallbacks
 const filteredTasks = useMemo(() => {
 const normalized = tasks.map(t => ({
 ...t,
 payout_status: t.payout_status || 'unpaid',
 completed_at: t.completed_at || t.created_at
 }))
 
 if (filter === "All Time") return normalized
 
 const now = new Date().getTime()
 const days = filter === "30 Days" ? 30 : filter === "60 Days" ? 60 : 90
 const limit = now - (days * 24 * 60 * 60 * 1000)
 
 return normalized.filter(t => {
 const d = new Date(t.completed_at)
 if (isNaN(d.getTime())) return true // Fallback to keep it if date is completely unparseable
 return d.getTime() >= limit
 })
 }, [tasks, filter])

 // Filter payouts
 const filteredPayouts = useMemo(() => {
 if (filter === "All Time") return payouts
 const now = new Date().getTime()
 const days = filter === "30 Days" ? 30 : filter === "60 Days" ? 60 : 90
 const limit = now - (days * 24 * 60 * 60 * 1000)
 
 return payouts.filter(p => {
 if (!p.requested_at) return false
 const d = new Date(p.requested_at)
 if (isNaN(d.getTime())) return true
 return d.getTime() >= limit
 })
 }, [payouts, filter])

 // Formulas
 // Pending = SUM(completed task amounts WHERE payout_status != "paid")
 const totalPending = filteredTasks.filter(t => t.payout_status !== 'paid').reduce((acc, t) => acc + Number(t.payment_amount), 0)
 
 // Paid Out = SUM(completed task amounts WHERE payout_status = "paid")
 const totalPaid = filteredTasks.filter(t => t.payout_status === 'paid').reduce((acc, t) => acc + Number(t.payment_amount), 0)
 
 // Total Earned = SUM(all completed task amounts)
 const totalEarned = filteredTasks.reduce((acc, t) => acc + Number(t.payment_amount), 0)
 
 // Tasks Done = COUNT(completed tasks)
 const totalTasksDone = filteredTasks.length

 const unpaidTasks = filteredTasks.filter(t => t.payout_status === 'unpaid')

 useEffect(() => {
 if (isModalOpen) {
 setSelectedTaskIds(unpaidTasks.map(t => t.id))
 }
 }, [isModalOpen, unpaidTasks])

 const selectedTasks = unpaidTasks.filter(t => selectedTaskIds.includes(t.id))
 const selectedAmount = selectedTasks.reduce((acc, t) => acc + Number(t.payment_amount), 0)

 // Handlers
 const handleRequestPayout = async (action: 'email' | 'whatsapp') => {
 if (selectedTaskIds.length === 0) return
 setIsRequesting(true)
 setRequestError("")

 const taskIds = selectedTaskIds
 const amount = selectedAmount

 const res = await requestPayout(taskIds, amount)
 
 if (res.error) {
 setRequestError(res.error)
 setIsRequesting(false)
 return
 }

 // Update local state
 setTasks(prev => prev.map(t => taskIds.includes(t.id) ? { ...t, payout_status: 'payout_requested' } : t))
 setPayouts(prev => [{
 id: res.payoutId!,
 total_amount: amount,
 status: 'requested',
 requested_at: new Date().toISOString(),
 paid_at: null,
 payment_proof_url: null
 }, ...prev])

 setIsRequesting(false)
 setIsModalOpen(false)

 executeAction(action, amount, selectedTasks)
 }

 const executeAction = (action: 'email' | 'whatsapp', totalAmount: number, tasksIncluded: Task[]) => {
 const dateStr = safeFormatDate(new Date().toISOString(), { year: 'numeric', month: 'long', day: 'numeric' })
 
 if (action === 'email') {
 const subject = encodeURIComponent(`Payout Request — ${employeeName}`)
 const bodyText = `Hello,

I would like to request a payout for the following completed tasks.

Employee Name: ${employeeName}
Request Date: ${dateStr}

Total Requested Amount: Rs. ${totalAmount.toLocaleString('en-IN')}
Number of Tasks: ${tasksIncluded.length}

Task Breakdown:
${tasksIncluded.map(t => `- ${t.title} (Rs. ${Number(t.payment_amount).toLocaleString('en-IN')})`).join('\n')}

Please process this request at your earliest convenience.

Best regards,
${employeeName}`
 
 window.location.href = `mailto:syed.ae018@gmail.com?subject=${subject}&body=${encodeURIComponent(bodyText)}`
 } 
 else if (action === 'whatsapp') {
 const waText = `*Payout Request* 💰\n\n*Employee:* ${employeeName}\n*Date:* ${dateStr}\n\n*Total Requested:* Rs. ${totalAmount.toLocaleString('en-IN')}\n*Tasks Completed:* ${tasksIncluded.length}\n\n*Task Breakdown:*\n${tasksIncluded.map(t => `• ${t.title} (Rs. ${Number(t.payment_amount).toLocaleString('en-IN')})`).join('\n')}\n\nPlease process this payout request. Thank you!`
 
 window.open(`https://wa.me/917795811341?text=${encodeURIComponent(waText)}`, '_blank')
 }
 }

 const handleMarkPaid = async (payoutId: string) => {
 setMarkingPaidId(payoutId)
 const res = await markPayoutAsReceived(payoutId)
 if (res.error) {
 alert("Failed to update payout: " + res.error)
 } else {
 setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'paid', paid_at: new Date().toISOString() } : p))
 setTasks(prev => prev.map(t => t.payout_status === 'payout_requested' ? { ...t, payout_status: 'paid' } : t))
 }
 setMarkingPaidId(null)
 }

 return (
 <div className="flex flex-col gap-6 w-full relative">
 <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
 <div>
 <h1 className="text-2xl font-syne font-bold text-foreground">My Earnings</h1>
 <p className="text-sm text-muted-foreground mt-0.5">Track your task payments and payout history.</p>
 </div>

 {/* Date Filters */}
 <div className="flex items-center gap-1.5 p-1 bg-input border border-border rounded-full w-full sm:w-fit overflow-x-auto mobile-scroll-x">
 {(["30 Days", "60 Days", "90 Days", "All Time"] as DateFilter[]).map((f) => {
 const isActive = filter === f
 return (
 <button
 key={f}
 onClick={() => setFilter(f)}
 className={`relative px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
 isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground/70"
 }`}
 >
 {isActive && (
 <motion.div
 layoutId="earnings-filter-pill"
 className="absolute inset-0 bg-primary/20 border border-border hover:border-primary/30 rounded-full shadow-sm"
 transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
 />
 )}
 <span className="relative z-10">{f}</span>
 </button>
 )
 })}
 </div>
 </div>

 {/* Summary Cards */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
 {[
 { label: "Total Earned", value: `₹${totalEarned.toLocaleString('en-IN')}`, icon: IndianRupee, color: "text-foreground", bg: "bg-muted", border: "border-border" },
 { label: "Paid Out", value: `₹${totalPaid.toLocaleString('en-IN')}`, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/5", border: "border-emerald-500/20" },
 { 
 label: "Pending", 
 value: `₹${totalPending.toLocaleString('en-IN')}`, 
 icon: Clock, 
 color: "text-yellow-400", 
 bg: "bg-yellow-500/5", 
 border: "border-yellow-500/20",
 interactive: true
 },
 { label: "Tasks Done", value: totalTasksDone, icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/5", border: "border-violet-500/20" },
 ].map((card) => {
 const Icon = card.icon
 const Wrapper = card.interactive ? motion.button : motion.div
 return (
 <Wrapper
 key={card.label}
 onClick={card.interactive ? () => setIsModalOpen(true) : undefined}
 whileHover={card.interactive ? { scale: 1.02 } : {}}
 whileTap={card.interactive ? { scale: 0.98 } : {}}
 className={`p-5 rounded-2xl border ${card.border} ${card.bg} flex flex-col gap-3 relative overflow-hidden group text-left ${card.interactive ? 'cursor-pointer hover:shadow-sm' : ''} transition-shadow duration-300`}
 >
 <div className={`w-8 h-8 rounded-full ${card.bg} border ${card.border} flex items-center justify-center`}>
 <Icon className={`w-4 h-4 ${card.color}`} />
 </div>
 <div>
 <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">{card.label}</p>
 <p className={`text-2xl font-syne font-bold tracking-tight ${card.color}`}>
 {card.value}
 </p>
 </div>
 {card.interactive && (
 <div className="absolute top-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
 <ArrowRight className={`w-4 h-4 ${card.color}`} />
 </div>
 )}
 </Wrapper>
 )
 })}
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
 {/* Completed Tasks Table */}
 <div className="lg:col-span-2 flex flex-col gap-4">
 <div className="enterprise-card border border-border rounded-2xl overflow-hidden shadow-md">
 <div className="px-5 py-4 border-b border-border bg-card/[0.01]">
 <h2 className="font-semibold text-foreground text-sm">Completed Tasks</h2>
 <p className="text-[11px] text-muted-foreground mt-0.5">Tasks you've completed and their payout status.</p>
 </div>
 <div className="mobile-scroll-x">
 <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
 {filteredTasks.length === 0 ? (
 <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
 <FileText className="w-8 h-8 mb-3 opacity-20" />
 <p className="text-sm font-medium">No completed tasks in this period.</p>
 </div>
 ) : (
 filteredTasks.map((task) => (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 key={task.id} 
 className="px-5 py-4 flex items-center gap-4 hover:bg-card/[0.02] transition-colors group"
 >
 <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center shrink-0">
 <CheckCircle2 className="w-4 h-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-semibold text-muted-foreground truncate">{task.title}</p>
 <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
 {task.client?.name || 'No client'} <span className="mx-1.5 opacity-50">•</span> 
 {safeFormatDate(task.completed_at)}
 </p>
 </div>
 <div className="flex flex-col items-end shrink-0 gap-1.5">
 <p className="text-sm font-bold text-emerald-400 ">
 {formatINR(safeNum(task.payment_amount))}
 </p>
 <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
 task.payout_status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
 task.payout_status === 'payout_requested' ? 'bg-blue-500/10 text-muted-foregroundlue-400 border-blue-500/20' :
 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20 animate-pulse'
 }`}>
 {task.payout_status === 'paid' ? 'Paid' : task.payout_status === 'payout_requested' ? 'Requested' : 'Pending'}
 </span>
 </div>
 </motion.div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Payout History */}
 <div className="flex flex-col gap-4">
 <div className="enterprise-card border border-border rounded-2xl overflow-hidden shadow-md">
 <div className="px-5 py-4 border-b border-border bg-card/[0.01]">
 <h2 className="font-semibold text-foreground text-sm">Recent Payouts</h2>
 <p className="text-[11px] text-muted-foreground mt-0.5">Your requested and paid earnings.</p>
 </div>
 <div className="divide-y divide-white/5 max-h-[500px] overflow-y-auto">
 {filteredPayouts.length === 0 ? (
 <div className="py-12 flex flex-col items-center justify-center text-muted-foreground px-6 text-center">
 <IndianRupee className="w-8 h-8 mb-3 opacity-20" />
 <p className="text-sm font-medium">No payouts yet.</p>
 <p className="text-[10px] mt-1 opacity-60">Click the Pending card to request your first payout.</p>
 </div>
 ) : (
 filteredPayouts.map((payout) => (
 <div key={payout.id} className="px-5 py-4 flex flex-col gap-3 hover:bg-card/[0.02] transition-colors">
 <div className="flex items-start justify-between">
 <div>
 <p className="text-muted-foregroundase font-bold text-foreground">{formatINR(safeNum(payout.total_amount))}</p>
 <p className="text-[10px] text-muted-foreground mt-0.5">
 Req: {safeFormatDate(payout.requested_at, { day: 'numeric', month: 'short' })}
 </p>
 </div>
 <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
 payout.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
 payout.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
 'bg-blue-500/10 text-muted-foregroundlue-400 border-blue-500/20'
 }`}>
 {payout.status}
 </span>
 </div>

 {payout.status === 'requested' && (
 <div className="pt-2 border-t border-border">
 <button
 onClick={() => handleMarkPaid(payout.id)}
 disabled={markingPaidId === payout.id}
 className="flex items-center justify-center gap-2 w-full py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors text-[11px] font-bold"
 >
 {markingPaidId === payout.id ? (
 <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
 ) : (
 <><CheckCircle2 className="w-3.5 h-3.5" /> Mark as Paid</>
 )}
 </button>
 </div>
 )}
 </div>
 ))
 )}
 </div>
 </div>
 </div>
 </div>

 {/* Payout Modal */}
 <AnimatePresence>
 {isModalOpen && (
 <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-muted ">
 <motion.div
 initial={{ opacity: 0, y: 40 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 40 }}
 transition={{ type: "spring", damping: 28, stiffness: 300 }}
 className="bg-card border border-border hover:border-primary/30 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-md overflow-hidden pb-[env(safe-area-inset-bottom,0px)]"
 >
 <div className="p-6 border-b border-border">
 <h2 className="text-lg font-syne font-bold text-foreground">Request Payout</h2>
 <p className="text-[11px] text-muted-foreground mt-1">Review your unpaid tasks before submitting.</p>
 </div>

 <div className="p-6 bg-muted flex flex-col gap-4 max-h-[40vh] overflow-y-auto">
 {unpaidTasks.length === 0 ? (
 <div className="text-center py-6">
 <CheckCircle2 className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
 <p className="text-sm font-medium text-muted-foreground">You're all caught up!</p>
 <p className="text-xs text-muted-foreground mt-1">No pending tasks to request payout for.</p>
 </div>
 ) : (
 <>
 <div className="flex items-center justify-between p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
 <div>
 <p className="text-[10px] uppercase tracking-wider font-semibold text-yellow-500/70">Total Selected</p>
 <p className="text-2xl font-bold text-yellow-400 mt-0.5">
 {formatINR(safeNum(selectedAmount))}
 </p>
 </div>
 <div className="text-right">
 <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Tasks</p>
 <p className="text-lg font-bold text-muted-foreground mt-0.5">{selectedTaskIds.length}</p>
 </div>
 </div>

 <div className="space-y-2">
 <div className="flex items-center justify-between pl-1 mb-2">
 <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Select Tasks Included</p>
 <button 
 onClick={() => setSelectedTaskIds(selectedTaskIds.length === unpaidTasks.length ? [] : unpaidTasks.map(t => t.id))}
 className="text-[10px] font-semibold text-muted-foreground hover:text-muted-foreground transition-colors"
 >
 {selectedTaskIds.length === unpaidTasks.length ? "Deselect All" : "Select All"}
 </button>
 </div>
 {unpaidTasks.map(t => {
 const isSelected = selectedTaskIds.includes(t.id)
 return (
 <div 
 key={t.id} 
 onClick={() => setSelectedTaskIds(prev => isSelected ? prev.filter(id => id !== t.id) : [...prev, t.id])}
 className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-card/[0.05] border-border' : 'bg-muted border-border opacity-60 hover:opacity-100'}`}
 >
 <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-emerald-500 border-emerald-500 text-foreground' : 'border-border'}`}>
 {isSelected && <CheckCircle2 className="w-3 h-3" />}
 </div>
 <div className="flex-1 min-w-0">
 <p className={`text-xs font-medium truncate pr-4 ${isSelected ? 'text-muted-foreground' : 'text-muted-foreground'}`}>{t.title}</p>
 </div>
 <p className={`text-xs font-bold shrink-0 ${isSelected ? 'text-emerald-400' : 'text-muted-foreground'}`}>{formatINR(safeNum(t.payment_amount))}</p>
 </div>
 )
 })}
 </div>
 </>
 )}
 </div>

 {requestError && (
 <div className="px-6 py-3 bg-red-500/10 border-t border-red-500/20">
 <p className="text-xs text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> {requestError}</p>
 </div>
 )}

 <div className="p-5 border-t border-border flex flex-col gap-3">
 <div className="flex gap-3">
 <button
 onClick={() => handleRequestPayout('email')}
 disabled={selectedTaskIds.length === 0 || isRequesting}
 className="flex-1 py-3 rounded-xl text-xs font-bold text-muted-foreground bg-card hover:bg-muted disabled:opacity-50 disabled:hover:bg-card transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-sm"
 >
 {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />} 
 Send via Email
 </button>
 <button
 onClick={() => handleRequestPayout('whatsapp')}
 disabled={selectedTaskIds.length === 0 || isRequesting}
 className="flex-1 py-3 rounded-xl text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-sm"
 >
 {isRequesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />} 
 Send via WhatsApp
 </button>
 </div>
 <button
 onClick={() => setIsModalOpen(false)}
 className="w-full mt-1 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-muted-foreground transition-colors"
 >
 Cancel
 </button>
 </div>
 </motion.div>
 </div>
 )}
 </AnimatePresence>
 </div>
 )
}
