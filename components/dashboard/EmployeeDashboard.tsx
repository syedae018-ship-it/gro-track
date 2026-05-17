"use client"

import React, { useState, useMemo } from "react"
import { motion } from "framer-motion"
import { CheckCircle2, Clock, AlertTriangle, Zap, IndianRupee, TrendingUp, Flame, Eye, ChevronRight } from "lucide-react"
import { TASK_STATUSES, PRIORITY_CONFIG } from "@/lib/utils/roles"
import { QuickCompleteModal } from "./QuickCompleteModal"
import { formatINR, safeNum } from "@/lib/utils/currency"

interface EmployeeDashboardProps {
  userName: string
  tasksDoneTotal: number
  tasksDoneThisWeek: number
  overdueTasks: number
  inReview: number
  inProgress: number
  pending: number
  totalEarnings: number
  totalPaid: number
  pendingEarnings: number
  avgTurnaroundHours: number | null
  activeTasks: any[]
}

export const EmployeeDashboard = React.memo(function EmployeeDashboard(props: EmployeeDashboardProps) {
  const [earningsFilter, setEarningsFilter] = useState<'30' | '60' | '90' | 'all'>('all')
  const [completeTask, setCompleteTask] = useState<any | null>(null)

  const firstName = props.userName.split(' ')[0]

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-syne font-bold text-white">
            Hey, {firstName} {props.overdueTasks > 0 ? "⚠️" : "🎯"}
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            {props.overdueTasks > 0
              ? `You have ${props.overdueTasks} overdue task${props.overdueTasks > 1 ? 's' : ''} — let's clear them.`
              : props.inReview > 0
              ? `${props.inReview} task${props.inReview > 1 ? 's are' : ' is'} waiting for approval.`
              : `${props.tasksDoneThisWeek} task${props.tasksDoneThisWeek !== 1 ? 's' : ''} completed this week. Keep going!`}
          </p>
        </div>

        {/* Streak badge */}
        {props.tasksDoneThisWeek >= 3 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-2"
          >
            <Flame className="w-4 h-4 text-orange-400" />
            <div>
              <p className="text-xs font-bold text-orange-400">{props.tasksDoneThisWeek} tasks</p>
              <p className="text-[10px] text-orange-400/60">this week 🔥</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Task Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {useMemo(() => [
          { label: "In Progress", value: props.inProgress, icon: Zap, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { label: "In Review", value: props.inReview, icon: Eye, color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
          { label: "Overdue", value: props.overdueTasks, icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
          { label: "Done Total", value: props.tasksDoneTotal, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20" },
        ], [props.inProgress, props.inReview, props.overdueTasks, props.tasksDoneTotal]).map((card, i) => {
          const Icon = card.icon
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`p-4 rounded-xl border ${card.border} ${card.bg} flex flex-col gap-2`}
            >
              <div className={`${card.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-syne font-bold text-white">{card.value}</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wider">{card.label}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Earnings + Turnaround */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Earnings Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white/[0.02] border border-white/5 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              Payment Overview
            </h2>
            <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
              {(['30', '60', '90', 'all'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setEarningsFilter(f)}
                  className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${
                    earningsFilter === f ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {f === 'all' ? 'All' : `${f}d`}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-xl glass-card">
              <p className="text-2xl font-syne font-bold text-foreground">{formatINR(safeNum(props.totalEarnings))}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Total Earnings</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
              <p className="text-2xl font-syne font-bold text-emerald-400">{formatINR(safeNum(props.totalPaid))}</p>
              <p className="text-[11px] text-emerald-400/60 mt-1">Paid Out</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <p className="text-2xl font-syne font-bold text-amber-400">{formatINR(safeNum(props.pendingEarnings))}</p>
              <p className="text-[11px] text-amber-400/60 mt-1">Pending</p>
            </div>
          </div>

          {props.pendingEarnings > 0 && (
            <div className="mt-4 text-xs text-amber-400/70 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatINR(safeNum(props.pendingEarnings))} awaiting admin approval
            </div>
          )}
        </motion.div>

        {/* Productivity Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white/[0.02] border border-white/5 rounded-xl p-5 flex flex-col gap-4"
        >
          <h2 className="font-semibold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-violet-400" />
            Productivity
          </h2>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">Completed this week</p>
              <p className="text-sm font-bold text-white">{props.tasksDoneThisWeek}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">All time done</p>
              <p className="text-sm font-bold text-white">{props.tasksDoneTotal}</p>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-white/40">Avg. turnaround</p>
              <p className="text-sm font-bold text-white">
                {props.avgTurnaroundHours != null
                  ? props.avgTurnaroundHours < 24
                    ? `${Math.round(props.avgTurnaroundHours)}h`
                    : `${Math.round(props.avgTurnaroundHours / 24)}d`
                  : '—'}
              </p>
            </div>
            {props.tasksDoneThisWeek >= 5 && (
              <div className="mt-1 flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-xs text-orange-300 font-medium">On fire this week!</span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Active Tasks — Quick Complete */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <h2 className="font-semibold text-white">My Active Tasks</h2>
          <a href="/dashboard/tasks" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">View all →</a>
        </div>

        <div className="divide-y divide-white/5">
          {props.activeTasks.length === 0 && (
            <div className="py-12 text-center text-white/30 text-sm">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-400/40" />
              All caught up! No active tasks.
            </div>
          )}

          {props.activeTasks.slice(0, 6).map((task: any) => {
            const statusConf = TASK_STATUSES.find(s => s.id === task.status)
            const priConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
            const isOverdue = task.deadline && new Date(task.deadline) < new Date()

            return (
              <div key={task.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {isOverdue && <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />}
                    <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-white/30">
                    <span>{task.client?.name || 'No client'}</span>
                    {task.deadline && (
                      <><span>·</span>
                      <span className={isOverdue ? 'text-red-400' : ''}>
                        Due {new Date(task.deadline).toLocaleDateString()}
                      </span></>
                    )}
                    {task.payment_amount > 0 && (
                      <><span>·</span><span className="text-emerald-400 font-bold drop-shadow-[0_0_6px_rgba(52,211,153,0.4)]">{formatINR(safeNum(task.payment_amount))}</span></>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {priConf && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold uppercase hidden sm:inline ${priConf.bg} ${priConf.color}`}>
                      {priConf.label}
                    </span>
                  )}
                  {statusConf && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusConf.bg} ${statusConf.color}`}>
                      {statusConf.label}
                    </span>
                  )}

                  {/* Quick complete button — only for non-review/completed/approved */}
                  {!['review', 'completed', 'approved'].includes(task.status) && (
                    <button
                      onClick={() => setCompleteTask(task)}
                      className="flex items-center gap-1 text-[11px] font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Done</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Quick Complete Modal */}
      {completeTask && (
        <QuickCompleteModal
          task={completeTask}
          onClose={() => setCompleteTask(null)}
        />
      )}
    </div>
  )
})
