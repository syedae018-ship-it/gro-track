"use client"

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
 LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
 XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts"
import {
 TrendingUp, CheckCircle2, ListTodo, IndianRupee,
 Clock, Users, ChevronRight, ArrowLeft, Flame,
 BarChart2, Target, Activity, X
} from "lucide-react"
import { Avatar } from "@/components/shared/Avatar"
import { formatINR, safeNum } from "@/lib/utils/currency"

type FilterRange = "7" | "30" | "60" | "90" | "all"

const ROLE_LABELS: Record<string, string> = {
 employee: "Team Member",
 admin: "Admin",
 admin_ops: "Ops Admin",
 admin_finance: "Finance Admin",
 managing_director: "Managing Director",
}

const GRADIENTS = [
 "from-violet-600 to-blue-600",
 "from-pink-600 to-rose-500",
 "from-amber-500 to-orange-500",
 "from-emerald-500 to-teal-500",
 "from-cyan-500 to-blue-500",
 "from-purple-600 to-pink-500",
]

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#ec4899"]

const DARK_TOOLTIP = {
  contentStyle: {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "14px",
    color: "hsl(var(--foreground))",
    fontSize: 12,
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  },
  cursor: { fill: "hsl(var(--muted))" },
}

function filterByDays(items: any[], dateField: string, days: FilterRange) {
 if (days === "all") return items
 const cutoff = new Date()
 cutoff.setDate(cutoff.getDate() - parseInt(days))
 return items.filter(i => i[dateField] && new Date(i[dateField]) >= cutoff)
}

function avgTurnaround(tasks: any[]) {
 const done = tasks.filter(t => t.completed_at && t.created_at)
 if (!done.length) return null
 const mins = done.reduce((s, t) => {
 return s + (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 60000
 }, 0) / done.length
 if (mins < 60) return `${Math.round(mins)}m`
 if (mins < 1440) return `${Math.round(mins / 60)}h`
 return `${Math.round(mins / 1440)}d`
}

function buildMonthlyEarnings(tasks: any[]) {
 const map: Record<string, number> = {}
 tasks.filter(t => t.completed_at).forEach(t => {
 const month = new Date(t.completed_at).toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
 map[month] = (map[month] || 0) + Number(t.payment_amount || 0)
 })
 return Object.entries(map).slice(-6).map(([name, value]) => ({ name, value }))
}

interface Props {
  employees: any[]
  tasks: any[]
  payouts: any[]
  attendance?: any[]
}

export const AnalyticsDashboard = React.memo(function AnalyticsDashboard({ employees, tasks, payouts, attendance }: Props) {
 const [selectedEmployee, setSelectedEmployee] = useState<any | null>(null)
 const [filterRange, setFilterRange] = useState<FilterRange>("30")

 // ── Agency-level stats ────────────────────────────────────────────────────
 const agencyStats = useMemo(() => {
 const completedAll = tasks.filter(t => ["completed", "approved"].includes(t.status))
 const revenue = completedAll.reduce((s, t) => s + Number(t.payment_amount || 0), 0)
 const totalPaid = payouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.total_amount || 0), 0)
 return {
 revenue,
 totalPaid,
 totalTasks: tasks.length,
 completedCount: completedAll.length,
 pendingCount: tasks.filter(t => !["completed", "approved"].includes(t.status)).length,
 completionRate: tasks.length ? Math.round((completedAll.length / tasks.length) * 100) : 0,
 }
 }, [tasks, payouts])

 // ── Per-employee summary ──────────────────────────────────────────────────
 const employeeSummaries = useMemo(() => {
 return employees.map((emp, idx) => {
 const empTasks = tasks.filter(t => t.assigned_to === emp.id)
 const completed = empTasks.filter(t => ["completed", "approved"].includes(t.status))
 const earnings = completed.reduce((s, t) => s + Number(t.payment_amount || 0), 0)
 const productivity = empTasks.length ? Math.round((completed.length / empTasks.length) * 100) : 0
 
 const empLogs = (attendance || []).filter(log => log.employee_id === emp.id)
 const totalMins = empLogs.reduce((s, log) => s + (log.duration_minutes || 0), 0)
 const workedHours = Number((totalMins / 60).toFixed(1))

 return {
 ...emp,
 activeTasks: empTasks.filter(t => !["completed", "approved"].includes(t.status)).length,
 completedTasks: completed.length,
 totalEarnings: earnings,
 productivity,
 workedHours,
 gradient: GRADIENTS[idx % GRADIENTS.length],
 }
 })
 }, [employees, tasks, attendance])

 // ── Selected employee detail ──────────────────────────────────────────────
 const empDetail = useMemo(() => {
 if (!selectedEmployee) return null
 const emp = selectedEmployee

 const allEmpTasks = tasks.filter(t => t.assigned_to === emp.id)
 const filtered = filterByDays(allEmpTasks, "created_at", filterRange)
 const completed = filtered.filter(t => ["completed", "approved"].includes(t.status))
 const active = filtered.filter(t => !["completed", "approved"].includes(t.status))

 const totalEarnings = completed.reduce((s, t) => s + Number(t.payment_amount || 0), 0)
 const empPayouts = payouts.filter(p => p.employee_id === emp.id)
 const pendingPayout = empPayouts.filter(p => p.status === "requested").reduce((s, p) => s + Number(p.total_amount || 0), 0)
 const paidOut = empPayouts.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.total_amount || 0), 0)

 const productivity = filtered.length ? Math.round((completed.length / filtered.length) * 100) : 0
 const turnaround = avgTurnaround(completed)
 const revisionCount = filtered.reduce((s, t) => s + (t.revision_count || 0), 0)

 // Revenue generated = sum of completed task payment_amounts for this period
 const revenueGenerated = totalEarnings

 // Monthly earnings chart
 const monthlyEarnings = buildMonthlyEarnings(allEmpTasks)

 // Client distribution pie
 const clientMap: Record<string, number> = {}
 completed.forEach(t => {
 const name = t.client?.name || "Internal"
 clientMap[name] = (clientMap[name] || 0) + Number(t.payment_amount || 0)
 })
 const clientPie = Object.entries(clientMap).map(([name, value]) => ({ name, value }))

 // Weekly performance bar (last 8 weeks)
 const weeklyData: Record<string, number> = {}
 for (let i = 7; i >= 0; i--) {
 const d = new Date()
 d.setDate(d.getDate() - i * 7)
 const label = `W${8 - i}`
 weeklyData[label] = 0
 }
 completed.forEach(t => {
 if (!t.completed_at) return
 const weeksAgo = Math.floor((Date.now() - new Date(t.completed_at).getTime()) / (7 * 24 * 3600 * 1000))
 if (weeksAgo < 8) {
 const label = `W${8 - weeksAgo}`
 weeklyData[label] = (weeklyData[label] || 0) + 1
 }
 })
 const weeklyChart = Object.entries(weeklyData).map(([name, tasks]) => ({ name, tasks }))

    // worked hours for selected employee in period
    const periodLogs = filterByDays((attendance || []).filter(log => log.employee_id === emp.id), "check_in", filterRange)
    const totalPeriodMins = periodLogs.reduce((s, log) => s + (log.duration_minutes || 0), 0)
    const periodWorkedHours = Number((totalPeriodMins / 60).toFixed(1))

 return {
 emp,
 completed,
 active,
 totalEarnings,
 pendingPayout,
 paidOut,
 productivity,
 turnaround,
 revisionCount,
 revenueGenerated,
 monthlyEarnings,
 clientPie,
 weeklyChart,
 periodWorkedHours,
 }
 }, [selectedEmployee, tasks, payouts, attendance, filterRange])

 // ── Render ────────────────────────────────────────────────────────────────
 return (
 <div className="flex flex-col gap-8">

 {/* ── Agency Top Stats ── */}
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
 {[
 { label: "Total Revenue", value: formatINR(safeNum(agencyStats.revenue)), color: "text-emerald-400", icon: IndianRupee, border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
 { label: "Paid Out", value: formatINR(safeNum(agencyStats.totalPaid)), color: "text-primary", icon: TrendingUp, border: "border-border hover:border-primary/30", bg: "bg-primary/5" },
 { label: "Total Tasks", value: agencyStats.totalTasks, color: "text-foreground", icon: BarChart2, border: "border-border", bg: "bg-muted" },
 { label: "Completed", value: agencyStats.completedCount, color: "text-emerald-400", icon: CheckCircle2, border: "border-emerald-500/10", bg: "bg-emerald-500/5" },
 { label: "Active", value: agencyStats.pendingCount, color: "text-yellow-400", icon: ListTodo, border: "border-yellow-500/10", bg: "bg-yellow-500/5" },
 { label: "Completion Rate", value: `${agencyStats.completionRate}%`, color: "text-blue-400", icon: Target, border: "border-blue-500/10", bg: "bg-blue-500/5" },
 ].map(s => (
 <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-4 flex flex-col gap-1.5`}>
 <s.icon className={`w-3.5 h-3.5 ${s.color} opacity-70`} />
 <span className={`text-xl font-black ${s.color}`}>{s.value}</span>
 <span className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground">{s.label}</span>
 </div>
 ))}
 </div>

 {/* ── Employee Cards (drill-down) ── */}
 <div>
 <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
 <Users className="w-4 h-4" /> Team Performance — Click to drill down
 </h2>
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
 {employeeSummaries.map((emp, i) => (
 <motion.button
 key={emp.id}
 initial={{ opacity: 0, y: 12 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: i * 0.04 }}
 onClick={() => setSelectedEmployee(emp)}
 className="text-left enterprise-card hover:border-border hover:border-primary/30 hover:shadow-md p-4 group transition-all duration-300"
 >
 <div className="flex items-center gap-3 mb-4">
 <Avatar initials={emp.full_name} src={emp.avatar_url} size="md" />
 <div className="flex-1 min-w-0">
 <p className="font-bold text-foreground text-sm truncate">{emp.full_name}</p>
 <p className="text-[10px] text-muted-foreground">{ROLE_LABELS[emp.role] || emp.role}</p>
 </div>
 <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
 </div>

  <div className="grid grid-cols-4 gap-2 mb-3">
    <div className="text-center">
      <span className="text-base font-bold text-yellow-400">{emp.activeTasks}</span>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Active</p>
    </div>
    <div className="text-center">
      <span className="text-base font-bold text-emerald-400">{emp.completedTasks}</span>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Done</p>
    </div>
    <div className="text-center">
      <span className="text-base font-bold text-violet-400">{emp.productivity}%</span>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Score</p>
    </div>
    <div className="text-center">
      <span className="text-base font-bold text-blue-400">{emp.workedHours || 0}h</span>
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Worked</p>
    </div>
  </div>

 {/* Productivity bar */}
 <div className="flex items-center gap-2">
 <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
 <div
 className={`h-full rounded-full ${emp.gradient}`}
 style={{ width: `${emp.productivity}%`, transition: "width 1s ease" }}
 />
 </div>
 <span className="text-[10px] text-muted-foreground font-semibold">{emp.productivity}%</span>
 </div>
 </motion.button>
 ))}
 </div>
 </div>

 {/* ── Employee Detail Modal ── */}
 <AnimatePresence>
 {empDetail && (
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 z-50 bg-background/80 flex items-end sm:items-start justify-center sm:p-4 sm:pt-8 overflow-y-auto"
 onClick={(e) => { if (e.target === e.currentTarget) setSelectedEmployee(null) }}
 >
 <motion.div
 initial={{ opacity: 0, y: 24, scale: 0.97 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 16, scale: 0.97 }}
 transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
 className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden mb-0 sm:mb-8"
 >
 {/* Modal Header */}
 <div className="flex items-center gap-6 py-5 border-b border-border px-6">
 <div className="flex items-center gap-3 flex-1 min-w-0 flex-wrap">
 <Avatar initials={empDetail.emp.full_name} src={empDetail.emp.avatar_url} size="md" />
 <div>
 <h2 className="font-syne font-bold text-foreground text-lg">{empDetail.emp.full_name}</h2>
 <p className="text-xs text-muted-foreground">{ROLE_LABELS[empDetail.emp.role] || empDetail.emp.role} · Analytics</p>
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
 {/* Filter Tabs */}
 <div className="flex gap-1 bg-muted border border-border rounded-xl p-1 overflow-x-auto">
 {(["7", "30", "60", "90", "all"] as FilterRange[]).map(f => (
 <button
 key={f}
 onClick={() => setFilterRange(f)}
 className={`text-[10px] px-2.5 py-1.5 rounded-lg font-bold transition-all ${
 filterRange === f
 ? "bg-muted text-foreground shadow-sm"
 : "text-muted-foreground hover:text-muted-foreground"
 }`}
 >
 {f === "all" ? "All" : `${f}d`}
 </button>
 ))}
 </div>
 <button
 onClick={() => setSelectedEmployee(null)}
 className="w-8 h-8 rounded-xl bg-muted hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 </div>

 <div className="p-6 flex flex-col gap-6">

 {/* KPI Row */}
 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
 {[
 { label: "Total Earnings", value: formatINR(safeNum(empDetail.totalEarnings)), color: "text-emerald-400", sub: "from completed tasks" },
 { label: "Pending Payout", value: formatINR(safeNum(empDetail.pendingPayout)), color: "text-amber-400", sub: "awaiting payment" },
 { label: "Paid Out", value: formatINR(safeNum(empDetail.paidOut)), color: "text-primary", sub: "total paid" },
 { label: "Revenue Generated", value: formatINR(safeNum(empDetail.revenueGenerated)), color: "text-secondary", sub: "for agency" },
 ].map(k => (
 <div key={k.label} className="bg-card/[0.03] border border-border rounded-2xl p-4">
 <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block mb-1">{k.label}</span>
 <span className={`text-lg font-black ${k.color}`}>{k.value}</span>
 <p className="text-[9px] text-muted-foreground mt-0.5">{k.sub}</p>
 </div>
 ))}
 </div>

  {/* Metrics Row */}
  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
    {[
      { label: "Completed Tasks", value: empDetail.completed.length, icon: CheckCircle2, color: "text-emerald-400" },
      { label: "Active Tasks", value: empDetail.active.length, icon: ListTodo, color: "text-yellow-400" },
      { label: "Productivity", value: `${empDetail.productivity}%`, icon: TrendingUp, color: "text-violet-400" },
      { label: "Avg Turnaround", value: empDetail.turnaround || "—", icon: Clock, color: "text-blue-400" },
      { label: "Hours Worked", value: `${empDetail.periodWorkedHours}h`, icon: Clock, color: "text-pink-400" },
    ].map(m => (
      <div key={m.label} className="bg-card/[0.03] border border-border rounded-2xl p-4 flex flex-col gap-2">
        <m.icon className={`w-4 h-4 ${m.color}`} />
        <span className={`text-xl font-black ${m.color}`}>{m.value}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{m.label}</span>
      </div>
    ))}
  </div>

 {/* Charts Row */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

 {/* Monthly Earnings Line Chart */}
 <div className="bg-card/[0.02] border border-border rounded-2xl p-5">
 <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
 <Activity className="w-4 h-4 text-violet-400" /> Monthly Earnings
 </h3>
 {empDetail.monthlyEarnings.length > 0 ? (
 <ResponsiveContainer width="100%" height={160}>
 <LineChart data={empDetail.monthlyEarnings}>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
 <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
 <Tooltip {...DARK_TOOLTIP} formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, "Earnings"]} />
 <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "hsl(var(--primary))" }} />
 </LineChart>
 </ResponsiveContainer>
 ) : (
 <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No earnings data yet</div>
 )}
 </div>

 {/* Weekly Tasks Bar Chart */}
 <div className="bg-card/[0.02] border border-border rounded-2xl p-5">
 <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
 <BarChart2 className="w-4 h-4 text-blue-400" /> Weekly Output (Last 8 weeks)
 </h3>
 <ResponsiveContainer width="100%" height={160}>
 <BarChart data={empDetail.weeklyChart} barSize={14}>
 <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
 <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
 <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
 <Tooltip {...DARK_TOOLTIP} formatter={(v: any) => [v, "Tasks"]} />
 <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
 </BarChart>
 </ResponsiveContainer>
 </div>

 {/* Client Distribution Pie */}
 {empDetail.clientPie.length > 0 && (
 <div className="bg-card/[0.02] border border-border rounded-2xl p-5">
 <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
 <Users className="w-4 h-4 text-emerald-400" /> Client Revenue Split
 </h3>
 <div className="flex items-center gap-4">
 <ResponsiveContainer width={120} height={120}>
 <PieChart>
 <Pie
 data={empDetail.clientPie}
 cx="50%" cy="50%"
 innerRadius={32} outerRadius={52}
 paddingAngle={3}
 dataKey="value"
 >
 {empDetail.clientPie.map((_: any, idx: number) => (
 <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
 ))}
 </Pie>
 <Tooltip {...DARK_TOOLTIP} formatter={(v: any) => [`₹${Number(v).toLocaleString('en-IN')}`, ""]} />
 </PieChart>
 </ResponsiveContainer>
 <div className="flex flex-col gap-1.5 flex-1">
 {empDetail.clientPie.map((c: any, idx: number) => (
 <div key={idx} className="flex items-center justify-between gap-2">
 <div className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
 <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">{c.name}</span>
 </div>
 <span className="text-[11px] font-bold text-emerald-400">₹{c.value.toLocaleString("en-IN")}</span>
 </div>
 ))}
 </div>
 </div>
 </div>
 )}

 {/* Additional KPIs */}
 <div className="bg-card/[0.02] border border-border rounded-2xl p-5 flex flex-col gap-4">
 <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
 <Target className="w-4 h-4 text-pink-400" /> Performance Metrics
 </h3>
 <div className="flex flex-col gap-3">
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground">Productivity Score</span>
 <div className="flex items-center gap-2">
 <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
 <div className="h-full rounded-full bg-violet-500" style={{ width: `${empDetail.productivity}%` }} />
 </div>
 <span className="text-xs font-bold text-violet-400">{empDetail.productivity}%</span>
 </div>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground">Completion Rate</span>
 <div className="flex items-center gap-2">
 <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
 <div className="h-full rounded-full bg-emerald-500" style={{ width: `${empDetail.productivity}%` }} />
 </div>
 <span className="text-xs font-bold text-emerald-400">{empDetail.productivity}%</span>
 </div>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground">Avg. Turnaround</span>
 <span className="text-xs font-bold text-blue-400">{empDetail.turnaround || "—"}</span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground">Revision Count</span>
 <span className={`text-xs font-bold ${empDetail.revisionCount > 0 ? "text-amber-400" : "text-muted-foreground"}`}>
 {empDetail.revisionCount} revisions
 </span>
 </div>
 <div className="flex items-center justify-between">
 <span className="text-xs text-muted-foreground">Active Clients</span>
 <span className="text-xs font-bold text-pink-400">{empDetail.clientPie.length}</span>
 </div>
 </div>
 </div>

 </div>
 </div>
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
})
