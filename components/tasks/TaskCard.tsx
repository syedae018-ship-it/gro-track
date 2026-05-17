"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  CheckCircle2, ChevronDown, ChevronUp,
  Link2, FileText, AlertTriangle, Clock
} from "lucide-react"
import { employeeCompleteTask } from "@/app/(dashboard)/dashboard/tasks/employee-actions"
import { PRIORITY_CONFIG } from "@/lib/utils/roles"

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function pad(n: number) { return String(n).padStart(2, "0") }

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function fmtDuration(startedAt?: string | null, completedAt?: string | null) {
  if (!startedAt || !completedAt) return null
  const mins = Math.max(0, Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000))
  if (mins < 1) return "< 1m"
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  const remH = h % 24
  return remH > 0 ? `${d}d ${remH}h` : `${d}d`
}

function liveRunningDuration(createdAt?: string | null) {
  if (!createdAt) return null
  const mins = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000))
  if (mins < 1) return "< 1m"
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24)
  const remH = h % 24
  return remH > 0 ? `${d}d ${remH}h` : `${d}d`
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
}

function motiveBadge(startedAt?: string | null, completedAt?: string | null) {
  if (!startedAt || !completedAt) return null
  const mins = Math.round((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60000)
  if (mins < 20) return { icon: "⚡", label: "Lightning Fast" }
  if (mins < 60) return { icon: "🔥", label: "Fast Delivery" }
  if (mins < 180) return { icon: "🏆", label: "Solid Work" }
  return { icon: "💪", label: "Deep Work" }
}

function LiveDuration({ createdAt }: { createdAt: string }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60000) // Update every minute
    return () => clearInterval(id)
  }, [])
  return <span>{liveRunningDuration(createdAt)}</span>
}

/* ── Component ───────────────────────────────────────────────────────────── */

interface TaskCardProps {
  task: any
  currentUserId: string
  onUpdate: (task: any) => void
  variant: "pending" | "completed"
}

export const TaskCard = React.memo(function TaskCard({ task, currentUserId, onUpdate, variant }: TaskCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [deliveryLink, setDeliveryLink] = useState(task.delivery_link || "")
  const [notes, setNotes] = useState(task.notes || "")
  const [completing, setCompleting] = useState(false)
  const [flash, setFlash] = useState(false)

  const isMyTask = task.assigned_to === currentUserId
  const isPending = variant === "pending"
  
  // Overdue logic using simple Date comparison (ignores hours/minutes)
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  const isOverdue = isPending && task.deadline && task.deadline.split('T')[0] < todayStr
  
  const priConf = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
  const badge = motiveBadge(task.created_at, task.completed_at)
  
  // Total duration from creation to completion
  const duration = fmtDuration(task.created_at, task.completed_at)
  
  // Permanent overdue completion history tracking (date only)
  const completedLate = variant === "completed" && task.deadline && task.completed_at && task.completed_at.split('T')[0] > task.deadline.split('T')[0]
  const lateDuration = completedLate ? fmtDuration(task.deadline, task.completed_at) : null
  const missedByDuration = isOverdue ? fmtDuration(task.deadline, new Date().toISOString()) : null

  /* ── Handlers ─────────────────────────────────────────────────────────── */

  async function handleComplete() {
    if (completing || !isMyTask) return
    setCompleting(true)
    const res = await employeeCompleteTask(task.id, deliveryLink, notes, undefined)
    if (!res.error) {
      setFlash(true)
      setTimeout(() => {
        onUpdate({
          ...task,
          status: "completed",
          completed_at: res.completedAt ?? new Date().toISOString(),
          delivery_link: deliveryLink || null,
          notes: notes || null,
        })
        setFlash(false)
      }, 700)
    }
    setCompleting(false)
    setShowForm(false)
  }

  /* ── Styles ──────────────────────────────────────────────────────────── */

  const cardBorder = isPending
    ? isOverdue
      ? "border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.12)]"
      : "border-red-500/12"
    : completedLate
      ? "border-amber-500/20"
      : "border-green-500/18"

  const cardGlow = isPending
    ? isOverdue
      ? "hover:shadow-[0_0_25px_rgba(239,68,68,0.18)]"
      : "hover:shadow-[0_0_20px_rgba(239,68,68,0.06)]"
    : "hover:shadow-[0_0_20px_rgba(34,197,94,0.06)]"

  const accentBar = isPending
    ? isOverdue ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-red-500/50"
    : completedLate ? "bg-amber-500/60" : "bg-green-500/60"

  return (
    <motion.div
      layout
      className={`relative bg-[#0f0f14] border ${cardBorder} rounded-2xl overflow-hidden group transition-shadow duration-300 ${cardGlow}`}
    >
      {/* Accent left bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${accentBar}`} />

      {/* Completion flash overlay */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 bg-green-950/70 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-2"
          >
            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 280 }}>
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </motion.div>
            <p className="text-sm font-bold text-white">🏆 Task Completed!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="pl-5 pr-4 pt-3.5 pb-3">

        {/* Row 1: badges + payment */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {priConf && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${priConf.bg} ${priConf.color}`}>
                {priConf.label}
              </span>
            )}
            {isOverdue && (
              <div className="flex items-center gap-1.5 animate-pulse">
                <span className="flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-lg tracking-wide">
                  🚨 OVERDUE
                </span>
                {missedByDuration && (
                  <span className="text-[10px] text-red-400/80 font-medium">
                    Missed by {missedByDuration}
                  </span>
                )}
              </div>
            )}
            {isPending && task.created_at && !isOverdue && (
              <span className="text-[10px] font-medium text-violet-300/80 bg-violet-500/10 border border-violet-500/15 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-[0_0_8px_rgba(139,92,246,0.15)] animate-pulse">
                ⏱ Running: <LiveDuration createdAt={task.created_at} />
              </span>
            )}
            {completedLate && lateDuration && (
              <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                ⚠️ Completed {lateDuration} late
              </span>
            )}
            {variant === "completed" && badge && !completedLate && (
              <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-semibold">
                {badge.icon} {badge.label}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {task.payment_amount > 0 && (
              <span className="text-sm font-bold text-emerald-400">
                ₹{Number(task.payment_amount).toLocaleString("en-IN")}
              </span>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="text-white/20 hover:text-white/50 transition-colors p-0.5"
              aria-label="Toggle details"
            >
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Row 2: title */}
        <h3 className="text-sm font-semibold text-white/85 group-hover:text-white transition-colors leading-snug mb-1.5">
          {task.title}
        </h3>

        {/* Row 3: meta */}
        <div className="flex items-center gap-2 text-[11px] text-white/30">
          {(task.client?.name || task.custom_client_name) && <span className="text-white/40 font-medium">{task.client?.name || task.custom_client_name}</span>}
          {(task.client?.name || task.custom_client_name) && (task.deadline || task.created_at) && <span>·</span>}
          {task.deadline && (
            <span className={isOverdue ? "text-red-400 font-medium" : ""}>
              Due {new Date(task.deadline).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </span>
          )}
          {!task.deadline && task.created_at && (
            <span>Added {new Date(task.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
          )}
        </div>

        {/* Completed: timing info */}
        {variant === "completed" && task.completed_at && (
          <div className="flex items-center justify-between gap-3 mt-2.5 pt-2 border-t border-white/5 text-[11px]">
            <span className="flex items-center gap-1 text-white/25">
              <Clock className="w-3 h-3" />
              {fmtTime(task.completed_at)}
            </span>
            {duration && (
              <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                ⚡ Finished in {duration}
              </span>
            )}
          </div>
        )}

        {/* Pending: action buttons */}
        {isPending && isMyTask && (
          <div className="flex items-center gap-2 mt-3">
            <button
              id={`complete-${task.id}`}
              onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-green-400 bg-green-500/8 hover:bg-green-500/15 border border-green-500/20 px-2.5 py-1.5 rounded-xl transition-all"
            >
              <CheckCircle2 className="w-3 h-3" />
              Mark Complete
            </button>
          </div>
        )}

        {/* Complete form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
                <input
                  type="url"
                  value={deliveryLink}
                  onChange={e => setDeliveryLink(e.target.value)}
                  placeholder="Delivery link — Google Drive, Figma…"
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/10 transition-all"
                />
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Notes for admin (optional)"
                  rows={2}
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-all resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2 rounded-xl border border-white/8 text-xs text-white/35 hover:text-white/60 hover:bg-white/4 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={completing}
                    className="flex-[2] py-2 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-xs font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {completing ? "Saving…" : "Complete Task"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-col gap-2">
                {task.delivery_link ? (
                  <a
                    href={task.delivery_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors truncate"
                  >
                    <Link2 className="w-3 h-3 shrink-0" />
                    <span className="truncate">{task.delivery_link}</span>
                  </a>
                ) : null}
                {task.notes ? (
                  <p className="flex items-start gap-1.5 text-xs text-white/35">
                    <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                    {task.notes}
                  </p>
                ) : null}
                {!task.delivery_link && !task.notes && (
                  <p className="text-xs text-white/15">No notes or links added yet.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})
