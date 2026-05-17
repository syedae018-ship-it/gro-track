"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2, Clock, X, ChevronRight, DollarSign,
  Calendar, User, Briefcase, ClipboardList, TrendingUp, Banknote
} from "lucide-react"
import { Avatar } from "@/components/shared/Avatar"

type FilterRange = "30" | "60" | "90" | "all"

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

function avatarGradient(name: string) {
  const idx = name.charCodeAt(0) % GRADIENTS.length
  return GRADIENTS[idx]
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function fmtAmount(n: number) {
  return `₹${n.toLocaleString("en-IN")}`
}

interface PaymentsDashboardProps {
  payouts: any[]
}

export function PaymentsDashboard({ payouts }: PaymentsDashboardProps) {
  const [filterRange, setFilterRange] = useState<FilterRange>("all")
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null)
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all")

  const filtered = useMemo(() => {
    let list = payouts
    if (filterRange !== "all") {
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() - parseInt(filterRange))
      list = list.filter(p => p.requested_at && new Date(p.requested_at) >= cutoff)
    }
    if (statusFilter !== "all") {
      list = list.filter(p => {
        if (statusFilter === "paid") return p.status === "paid"
        if (statusFilter === "pending") return ["requested", "pending"].includes(p.status)
        return true
      })
    }
    return list
  }, [payouts, filterRange, statusFilter])

  const totalPaid = useMemo(() => filtered.filter(p => p.status === "paid").reduce((s, p) => s + Number(p.total_amount || 0), 0), [filtered])
  const totalPending = useMemo(() => filtered.filter(p => ["requested","pending"].includes(p.status)).reduce((s, p) => s + Number(p.total_amount || 0), 0), [filtered])
  const paidCount = useMemo(() => filtered.filter(p => p.status === "paid").length, [filtered])
  const pendingCount = useMemo(() => filtered.filter(p => ["requested","pending"].includes(p.status)).length, [filtered])

  // Extract unique clients from a payout's tasks
  function getPayoutClients(payout: any): string[] {
    const set = new Set<string>()
    payout.payout_tasks?.forEach((pt: any) => {
      const name = pt.task?.client?.name || pt.task?.custom_client_name
      if (name) set.add(name)
    })
    return Array.from(set)
  }

  function getTaskCount(payout: any) {
    return payout.payout_tasks?.length || 0
  }

  const isPaid = (p: any) => p.status === "paid"
  const isPending = (p: any) => ["requested", "pending"].includes(p.status)

  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Status pills */}
        <div className="flex gap-1.5 bg-white/[0.03] border border-white/5 p-1 rounded-xl">
          {(["all", "pending", "paid"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                statusFilter === s
                  ? s === "paid" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : s === "pending" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-white/10 text-white"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {s === "all" ? "All" : s === "paid" ? "✓ Paid" : "⏳ Pending"}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-xl">
          {(["30", "60", "90", "all"] as FilterRange[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterRange(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterRange === f
                  ? "bg-white/10 text-white"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              {f === "all" ? "All Time" : `${f}d`}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
          className="bg-[#0f1a13] border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/3" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/60">Total Paid</span>
            </div>
            <p className="text-2xl font-black text-emerald-400">{fmtAmount(totalPaid)}</p>
            <p className="text-[10px] text-emerald-500/40 mt-1">{paidCount} payout{paidCount !== 1 ? "s" : ""}</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-[#1a1500] border border-amber-500/20 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-amber-500/3" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-500/60">Pending</span>
            </div>
            <p className="text-2xl font-black text-amber-400">{fmtAmount(totalPending)}</p>
            <p className="text-[10px] text-amber-500/40 mt-1">{pendingCount} payout{pendingCount !== 1 ? "s" : ""} outstanding</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-violet-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Total Volume</span>
          </div>
          <p className="text-2xl font-black text-white">{fmtAmount(totalPaid + totalPending)}</p>
          <p className="text-[10px] text-white/20 mt-1">{filtered.length} total transactions</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
              <Banknote className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Avg Payout</span>
          </div>
          <p className="text-2xl font-black text-white">
            {filtered.length ? fmtAmount(Math.round((totalPaid + totalPending) / filtered.length)) : "₹0"}
          </p>
          <p className="text-[10px] text-white/20 mt-1">per transaction</p>
        </motion.div>
      </div>

      {/* ── Payout Table ── */}
      <div className="bg-[#0d0d12] border border-white/5 rounded-2xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr_1fr_1fr] px-4 py-3 border-b border-white/5 gap-4">
          {["Employee", "Clients", "Tasks", "Requested", "Paid On", "Amount", "Status"].map(h => (
            <span key={h} className="text-[9px] font-bold uppercase tracking-widest text-white/25">{h}</span>
          ))}
        </div>

        {/* Table Body */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
              <Banknote className="w-7 h-7 text-white/15" />
            </div>
            <p className="text-sm font-semibold text-white/25">No payout transactions yet.</p>
            <p className="text-xs text-white/15">Transactions will appear here after employees request payouts.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((payout, i) => {
              const clients = getPayoutClients(payout)
              const taskCount = getTaskCount(payout)
              const paid = isPaid(payout)
              const pending = isPending(payout)
              const employeeName = payout.employee?.full_name || "Unknown"
              const gradient = avatarGradient(employeeName)

              return (
                <motion.button
                  key={payout.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedPayout(payout)}
                  className="w-full grid grid-cols-[2fr_2fr_1fr_1.5fr_1.5fr_1fr_1fr] px-4 py-3.5 gap-4 hover:bg-white/[0.03] transition-colors text-left group items-center"
                >
                  {/* Employee */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar initials={employeeName} src={payout.employee?.avatar_url} size="sm" className="w-7 h-7 rounded-lg" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{employeeName}</p>
                      <p className="text-[9px] text-white/30">{ROLE_LABELS[payout.employee?.role] || "—"}</p>
                    </div>
                  </div>

                  {/* Clients */}
                  <div className="flex flex-wrap gap-1 min-w-0">
                    {clients.length === 0 ? (
                      <span className="text-[10px] text-white/20">—</span>
                    ) : (
                      <>
                        {clients.slice(0, 2).map(c => (
                          <span key={c} className="text-[9px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            {c}
                          </span>
                        ))}
                        {clients.length > 2 && (
                          <span className="text-[9px] text-white/25">+{clients.length - 2}</span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Tasks */}
                  <div className="flex items-center gap-1">
                    <ClipboardList className="w-3 h-3 text-white/25" />
                    <span className="text-xs font-semibold text-white/70">{taskCount}</span>
                  </div>

                  {/* Requested */}
                  <span className="text-xs text-white/40">{fmtDate(payout.requested_at)}</span>

                  {/* Paid On */}
                  <span className={`text-xs ${paid ? "text-white/50" : "text-white/20"}`}>{fmtDate(payout.paid_at)}</span>

                  {/* Amount */}
                  <span className={`text-sm font-black ${paid ? "text-emerald-400" : "text-amber-400"}`}>
                    {fmtAmount(Number(payout.total_amount))}
                  </span>

                  {/* Status */}
                  <div className="flex items-center gap-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${
                      paid
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {paid ? "Paid" : "Pending"}
                    </span>
                    <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30 transition-colors ml-auto" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Payout Detail Modal ── */}
      <AnimatePresence>
        {selectedPayout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center p-4 pt-10 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) setSelectedPayout(null) }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0d0d12] border border-white/8 rounded-3xl w-full max-w-xl shadow-2xl shadow-black/60 overflow-hidden mb-8"
            >
              {(() => {
                const p = selectedPayout
                const paid = isPaid(p)
                const pending = isPending(p)
                const clients = getPayoutClients(p)
                const taskCount = getTaskCount(p)
                const tasks = p.payout_tasks?.map((pt: any) => pt.task).filter(Boolean) || []
                const gradient = avatarGradient(p.employee?.full_name || "")

                return (
                  <>
                    {/* Accent bar */}
                    <div className={`h-1 w-full ${paid ? "bg-emerald-500" : "bg-amber-500"}`} />

                    <div className="p-6">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <Avatar initials={p.employee?.full_name || "?"} src={p.employee?.avatar_url} size="lg" className="w-12 h-12 rounded-2xl" />
                          <div>
                            <h2 className="text-xl font-syne font-bold text-white">{p.employee?.full_name || "Unknown"}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-white/40">{ROLE_LABELS[p.employee?.role] || "—"}</span>
                              <span className="text-white/20">·</span>
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                paid
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}>
                                {paid ? "✓ Paid" : "⏳ Pending"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedPayout(null)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Amount highlight */}
                      <div className={`rounded-2xl p-5 mb-5 ${paid ? "bg-emerald-500/8 border border-emerald-500/15" : "bg-amber-500/8 border border-amber-500/15"}`}>
                        <p className="text-[10px] uppercase tracking-widest font-bold mb-1 ${paid ? 'text-emerald-500/50' : 'text-amber-500/50'}">Payout Amount</p>
                        <p className={`text-4xl font-black ${paid ? "text-emerald-400" : "text-amber-400"}`}>
                          {fmtAmount(Number(p.total_amount))}
                        </p>
                      </div>

                      {/* Timeline + Meta */}
                      <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          <p className="text-[9px] uppercase tracking-wider font-bold text-white/25 mb-1 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Requested
                          </p>
                          <p className="text-xs font-semibold text-white">{fmtDate(p.requested_at)}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          <p className="text-[9px] uppercase tracking-wider font-bold text-white/25 mb-1 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Paid On
                          </p>
                          <p className={`text-xs font-semibold ${paid ? "text-white" : "text-white/25"}`}>
                            {paid ? fmtDate(p.paid_at) : "Not yet paid"}
                          </p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          <p className="text-[9px] uppercase tracking-wider font-bold text-white/25 mb-1 flex items-center gap-1">
                            <ClipboardList className="w-3 h-3" /> Tasks
                          </p>
                          <p className="text-xs font-semibold text-white">{taskCount} task{taskCount !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                          <p className="text-[9px] uppercase tracking-wider font-bold text-white/25 mb-1 flex items-center gap-1">
                            <Briefcase className="w-3 h-3" /> Clients
                          </p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {clients.length === 0 ? (
                              <span className="text-xs text-white/20">—</span>
                            ) : clients.map(c => (
                              <span key={c} className="text-[9px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">{c}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Task Breakdown */}
                      {tasks.length > 0 && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                          <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/30 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5" /> Task Breakdown
                          </h3>
                          <div className="flex flex-col divide-y divide-white/5">
                            {tasks.map((task: any) => (
                              <div key={task.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-white/80 truncate">{task.title}</p>
                                  {(task.client?.name || task.custom_client_name) && (
                                    <p className="text-[10px] text-violet-400/70 mt-0.5">{task.client?.name || task.custom_client_name}</p>
                                  )}
                                </div>
                                {task.payment_amount > 0 && (
                                  <span className="text-xs font-bold text-emerald-400 shrink-0">
                                    {fmtAmount(Number(task.payment_amount))}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
