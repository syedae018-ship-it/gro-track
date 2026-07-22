"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, ListTodo, TrendingUp, DollarSign, Users } from "lucide-react"
import { Avatar } from "@/components/shared/Avatar"

const ROLE_LABELS: Record<string, string> = {
 employee: "Team Member",
 admin: "Admin",
 admin_ops: "Admin — Ops",
 admin_finance: "Admin — Finance",
 managing_director: "Managing Director",
}

const GRADIENT_MAP = [
 "from-violet-600 to-blue-600",
 "from-pink-600 to-rose-500",
 "from-amber-500 to-orange-500",
 "from-emerald-500 to-teal-500",
 "from-cyan-500 to-blue-500",
 "from-purple-600 to-pink-500",
]

interface EmployeeGridProps {
 employees: any[]
 tasks: any[]
 payouts: any[]
}

export function EmployeeGrid({ employees, tasks, payouts }: EmployeeGridProps) {
 const enriched = useMemo(() => {
 return employees.map((emp, idx) => {
 const empTasks = tasks.filter(t => t.assigned_to === emp.id)
 const completedTasks = empTasks.filter(t => ['completed', 'approved'].includes(t.status))
 const activeTasks = empTasks.filter(t => !['completed', 'approved'].includes(t.status))

 const totalEarnings = completedTasks.reduce((s, t) => s + Number(t.payment_amount || 0), 0)

 const empPayouts = payouts.filter(p => p.employee_id === emp.id)
 const pendingPayouts = empPayouts
 .filter(p => p.status === 'requested')
 .reduce((s, p) => s + Number(p.total_amount || 0), 0)

 const productivity = empTasks.length > 0
 ? Math.round((completedTasks.length / empTasks.length) * 100)
 : 0

 // Unique clients this employee has worked with
 const clientSet = new Map<string, string>()
 empTasks.forEach(t => {
 if (t.client?.id) clientSet.set(t.client.id, t.client.name)
 })
 const clients = Array.from(clientSet.values())

 return {
 ...emp,
 completedCount: completedTasks.length,
 activeCount: activeTasks.length,
 totalEarnings,
 pendingPayouts,
 productivity,
 clients,
 gradient: GRADIENT_MAP[idx % GRADIENT_MAP.length],
 }
 })
 }, [employees, tasks, payouts])

 return (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
 {enriched.map((emp, i) => (
 <motion.div
 key={emp.id}
 initial={{ opacity: 0, y: 16 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.05, duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
 className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 hover:border-border hover:shadow-lg hover:shadow-black/30 transition-all group"
 >
 {/* Header */}
 <div className="flex items-start gap-3">
 <Avatar initials={emp.full_name} src={emp.avatar_url} size="md" />
 <div className="flex-1 min-w-0">
 <p className="font-bold text-foreground text-[15px] leading-tight">{emp.full_name}</p>
 <p className="text-[11px] text-muted-foreground mt-0.5">{ROLE_LABELS[emp.role] || emp.role}</p>
 </div>
 <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
 emp.is_active
 ? 'bg-green-500/10 text-green-400 border-green-500/20'
 : 'bg-red-500/10 text-red-400 border-red-500/20'
 }`}>
 {emp.is_active ? 'Active' : 'Inactive'}
 </span>
 </div>

 {/* Stats Row */}
 <div className="grid grid-cols-3 gap-2">
 <div className="bg-card/[0.03] border border-border rounded-xl p-2.5 flex flex-col items-center text-center">
 <ListTodo className="w-3.5 h-3.5 text-yellow-400 mb-1" />
 <span className="text-muted-foregroundase font-bold text-foreground">{emp.activeCount}</span>
 <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Active</span>
 </div>
 <div className="bg-card/[0.03] border border-border rounded-xl p-2.5 flex flex-col items-center text-center">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mb-1" />
 <span className="text-muted-foregroundase font-bold text-foreground">{emp.completedCount}</span>
 <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Done</span>
 </div>
 <div className="bg-card/[0.03] border border-border rounded-xl p-2.5 flex flex-col items-center text-center">
 <TrendingUp className="w-3.5 h-3.5 text-violet-400 mb-1" />
 <span className="text-muted-foregroundase font-bold text-foreground">{emp.productivity}%</span>
 <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</span>
 </div>
 </div>

 {/* Earnings */}
 <div className="grid grid-cols-2 gap-2">
 <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3">
 <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-500/60 block mb-0.5">Total Earned</span>
 <span className="text-sm font-black text-emerald-400">₹{emp.totalEarnings.toLocaleString('en-IN')}</span>
 </div>
 <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3">
 <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foregroundmber-500/60 block mb-0.5">Pending Payout</span>
 <span className="text-sm font-black text-muted-foregroundmber-400">₹{emp.pendingPayouts.toLocaleString('en-IN')}</span>
 </div>
 </div>

 {/* Client Chips */}
 {emp.clients.length > 0 && (
 <div>
 <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground mb-2 flex items-center gap-1">
 <Users className="w-3 h-3" /> Assigned Clients
 </p>
 <div className="flex flex-wrap gap-1.5">
 {emp.clients.map((client: string, ci: number) => (
 <span
 key={ci}
 className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full"
 >
 {client}
 </span>
 ))}
 </div>
 </div>
 )}

 {/* Joined */}
 <div className="pt-3 border-t border-border flex items-center justify-between">
 <span className="text-[10px] text-muted-foreground">
 Joined {new Date(emp.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
 </span>
 <div className="flex items-center gap-1.5">
 <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
 <div
 className="h-full rounded-full from-violet-500 to-blue-500"
 style={{ width: `${emp.productivity}%` }}
 />
 </div>
 <span className="text-[10px] font-bold text-violet-400">{emp.productivity}%</span>
 </div>
 </div>
 </motion.div>
 ))}
 </div>
 )
}
