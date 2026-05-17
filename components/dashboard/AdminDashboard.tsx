"use client"

import React, { useMemo } from "react"
import { motion } from "framer-motion"
import { IndianRupee, Users, AlertTriangle, Clock, Building2, CheckCircle2, TrendingUp, Loader2 } from "lucide-react"
import { TASK_STATUSES, PRIORITY_CONFIG } from "@/lib/utils/roles"
import { formatINR, safeNum } from "@/lib/utils/currency"

interface AdminDashboardProps {
  totalRevenue: number
  pendingPayouts: number
  activeEmployees: number
  totalClients: number
  overdueTasks: number
  tasksByStatus: Record<string, number>
  recentTasks: any[]
  userName: string
}

const statCards = (props: AdminDashboardProps) => [
  {
    label: "Total Revenue",
    value: formatINR(props.totalRevenue),
    icon: IndianRupee,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    label: "Pending Payouts",
    value: formatINR(props.pendingPayouts),
    icon: Clock,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    label: "Active Employees",
    value: props.activeEmployees,
    icon: Users,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    label: "Active Clients",
    value: props.totalClients,
    icon: Building2,
    color: "text-secondary",
    bg: "bg-secondary/10",
    border: "border-secondary/20",
  },
  {
    label: "Overdue Tasks",
    value: props.overdueTasks,
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/20",
  },
]

const StatusBar = React.memo(function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/50">{label}</span>
        <span className="text-white/70 font-medium">{count}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  )
})

export const AdminDashboard = React.memo(function AdminDashboard(props: AdminDashboardProps) {
  const totalTasks = Object.values(props.tasksByStatus).reduce((a, b) => a + b, 0)
  
  const cards = useMemo(() => statCards(props), [props.totalRevenue, props.pendingPayouts, props.activeEmployees, props.totalClients, props.overdueTasks])

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-syne font-bold text-white">
          Good day, {props.userName.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-white/40 mt-0.5">Here's your agency at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className={`glass-card p-4 sm:p-5 flex flex-col gap-3 relative overflow-hidden group hover:-translate-y-1`}
            >
              <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full blur-[40px] opacity-20 group-hover:opacity-40 transition-all" style={{background: `var(--tw-gradient-from, #8b5cff)`}} />
              <div className={`w-9 h-9 rounded-full ${card.bg} border ${card.border} flex items-center justify-center ${card.color} shadow-luxury-glow`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{card.label}</p>
                <p className={`text-2xl font-syne font-bold ${card.color}`}>{card.value}</p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Tasks breakdown + Recent tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Task Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Task Pipeline</h2>
            <span className="text-xs text-white/30">{totalTasks} total</span>
          </div>
          <div className="flex flex-col gap-3">
            {TASK_STATUSES.map(s => (
              <StatusBar
                key={s.id}
                label={s.label}
                count={props.tasksByStatus[s.id] || 0}
                total={totalTasks}
                color={s.id === 'todo' ? 'bg-slate-500' : s.id === 'in_progress' ? 'bg-blue-500' : s.id === 'review' ? 'bg-yellow-500' : s.id === 'completed' ? 'bg-green-500' : 'bg-violet-500'}
              />
            ))}
          </div>

          <div className="mt-2 pt-3 border-t border-white/5 text-center">
            <div className="flex justify-center gap-6">
              <div className="text-center">
                <p className="text-xl font-syne font-bold text-white">{props.tasksByStatus.review || 0}</p>
                <p className="text-[10px] text-yellow-400 uppercase tracking-wider mt-0.5">Need Review</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-syne font-bold text-white">{props.tasksByStatus.approved || 0}</p>
                <p className="text-[10px] text-violet-400 uppercase tracking-wider mt-0.5">Approved</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <h2 className="font-semibold text-white">Recent Tasks</h2>
            <a href="/dashboard/tasks" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</a>
          </div>

          <div className="divide-y divide-white/5">
            {props.recentTasks.length === 0 && (
              <div className="py-12 text-center text-white/30 text-sm">No tasks yet. Create your first task.</div>
            )}
            {props.recentTasks.map((task: any) => {
              const statusConf = TASK_STATUSES.find(s => s.id === task.status)
              const priConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !['completed','approved'].includes(task.status)
              return (
                <div key={task.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">{task.title}</p>
                      {isOverdue && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-white/30 flex-wrap">
                      <span className="truncate max-w-[120px] sm:max-w-none">{task.client?.name || 'No client'}</span>
                      {task.assignee?.full_name && <><span>·</span><span className="hidden sm:inline">{task.assignee.full_name}</span></>}
                      {task.deadline && <><span>·</span><span className={isOverdue ? 'text-red-400' : ''}>{new Date(task.deadline).toLocaleDateString()}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {task.payment_amount > 0 && (
                      <span className="text-xs font-bold text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.5)]">{formatINR(safeNum(task.payment_amount))}</span>
                    )}
                    {priConf && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase ${priConf.bg} ${priConf.color}`}>
                        {priConf.label}
                      </span>
                    )}
                    {statusConf && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusConf.bg} ${statusConf.color}`}>
                        {statusConf.label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      </div>
    </div>
  )
})
