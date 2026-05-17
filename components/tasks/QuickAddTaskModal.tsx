"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { X, Plus, Loader2, CheckCircle2 } from "lucide-react"
import { employeeCreateTask } from "@/app/(dashboard)/dashboard/tasks/employee-actions"
import { ClientCombobox, type ClientSelection } from "@/components/ui/ClientCombobox"

interface QuickAddTaskModalProps {
  onClose: () => void
  onAdd: (task: any) => void
  currentUserId: string
}

export function QuickAddTaskModal({ onClose, onAdd, currentUserId }: QuickAddTaskModalProps) {
  const [title, setTitle] = useState("")
  const [clientSelection, setClientSelection] = useState<ClientSelection>({ client_id: null, custom_client_name: null, displayName: "" })
  const [paymentAmount, setPaymentAmount] = useState("")
  const [status, setStatus] = useState<"todo" | "completed">("todo")
  const [deadline, setDeadline] = useState("")
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const titleRef = useRef<HTMLInputElement>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const blanks = Array.from({ length: firstDayOfWeek }, (_, i) => i)
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Autofocus title strictly ONCE when modal opens
  useEffect(() => {
    const timer = setTimeout(() => titleRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [])

  // Escape key listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])



  async function handleSave() {
    if (!title.trim()) { setError("Task title is required"); return }
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) { setError("Payment amount is required"); return }
    if (!deadline) { setError("Approximate deadline is required"); return }
    setError("")
    setLoading(true)

    const result = await employeeCreateTask({
      title: title.trim(),
      client_id: clientSelection.client_id || undefined,
      custom_client_name: clientSelection.custom_client_name || undefined,
      payment_amount: paymentAmount,
      status,
      deadline: deadline || undefined,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Optimistic card — show client name immediately
    const optimistic = {
      id: result.taskId || `opt-${Date.now()}`,
      title: title.trim(),
      client: clientSelection.client_id ? { name: clientSelection.displayName } : null,
      custom_client_name: clientSelection.custom_client_name || null,
      payment_amount: paymentAmount ? parseFloat(paymentAmount) : 0,
      status: status === "completed" ? "completed" : "todo",
      priority: "medium",
      deadline: deadline || null,
      created_at: new Date().toISOString(),
      completed_at: status === "completed" ? new Date().toISOString() : null,
      assigned_to: currentUserId,
      delivery_link: null,
      notes: null,
    }

    onAdd(optimistic)
    setDone(true)
    setTimeout(onClose, 850)
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.975 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.975 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-[#0f0f14] border border-white/10 rounded-2xl w-full max-w-[420px] shadow-2xl shadow-black/60 overflow-hidden"
      >
        {done ? (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center py-14 gap-3"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-500/12 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-violet-400" />
            </div>
            <p className="text-white font-semibold text-sm">Task Added!</p>
            <p className="text-white/30 text-xs">Your workspace is updated.</p>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/20 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white">Add Task</h2>
                  <p className="text-[10px] text-white/25">Quick capture in seconds</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fields */}
            <div className="px-5 py-4 flex flex-col gap-3.5">

              {/* Task Title */}
              <div>
                <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1.5 block">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave() }}
                  placeholder="e.g. Edit reel for campaign"
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                />
              </div>

              {/* Client — shared combobox */}
              <div>
                <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1.5 block">
                  Client
                </label>
                <ClientCombobox
                  onChange={setClientSelection}
                  placeholder="Select or type client name…"
                  compact
                />
              </div>

              {/* Payment + Status row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1.5 block">
                    Payment (₹)
                  </label>
                  {/* inputmode="decimal" removes spinners on mobile; type="text" removes on desktop */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25 text-sm">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={paymentAmount}
                      onChange={e => {
                        const val = e.target.value.replace(/[^0-9.]/g, "")
                        setPaymentAmount(val)
                      }}
                      placeholder="5000"
                      className="w-full bg-white/4 border border-white/8 rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-white placeholder:text-white/18 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1.5 block">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as "todo" | "completed")}
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="todo" className="bg-[#15151c] text-white">⏳ Pending</option>
                    <option value="completed" className="bg-[#15151c] text-white">✅ Completed</option>
                  </select>
                </div>
              </div>

              {/* Approximate Deadline (Custom Picker) */}
              <div>
                <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider mb-1.5 block">
                  Approximate Deadline <span className="text-red-400">*</span>
                </label>
                
                {/* Presets */}
                <div className="flex gap-1.5 mb-2.5">
                  {[
                    { label: "Today", date: new Date() },
                    { label: "Tomorrow", date: new Date(Date.now() + 86400000) },
                    { label: "Next Week", date: new Date(Date.now() + 86400000 * 7) },
                  ].map(p => {
                    const ds = new Date(p.date.getTime() - p.date.getTimezoneOffset() * 60000).toISOString().split("T")[0]
                    const isSel = deadline === ds
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => { setDeadline(ds); setCurrentMonth(new Date(p.date.getFullYear(), p.date.getMonth(), 1)) }}
                        className={`flex-1 py-1.5 text-xs rounded-xl font-medium border transition-all ${
                          isSel
                            ? "bg-violet-500/15 border-violet-500/40 text-violet-300 shadow-sm shadow-violet-500/10"
                            : "bg-white/4 border-white/8 text-white/40 hover:text-white/70 hover:bg-white/6"
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>

                {/* Custom Month View */}
                <div className="bg-[#15151c] border border-white/8 rounded-xl p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white/80 pl-1">
                      {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                        className="w-6 h-6 rounded-lg bg-white/4 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white text-xs transition-colors"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                        className="w-6 h-6 rounded-lg bg-white/4 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white text-xs transition-colors"
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                      <span key={d} className="text-[9px] font-semibold text-white/20 uppercase">{d}</span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {blanks.map(b => (
                      <div key={`blank-${b}`} className="h-7" />
                    ))}
                    {days.map(d => {
                      // Adjust to avoid timezone shifts
                      const localD = new Date(year, month, d)
                      const ds = new Date(localD.getTime() - localD.getTimezoneOffset() * 60000).toISOString().split("T")[0]
                      const isSel = deadline === ds
                      const isToday = ds === new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0]
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDeadline(ds)}
                          className={`h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                            isSel
                              ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white font-bold shadow-md shadow-violet-500/20"
                              : isToday
                                ? "border border-violet-500/30 text-violet-300 bg-violet-500/5 hover:bg-white/10"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex gap-2.5">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-white/8 text-sm text-white/35 hover:text-white/70 hover:bg-white/4 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                id="save-quick-task"
                onClick={handleSave}
                disabled={loading || !title.trim() || !paymentAmount || !deadline}
                className="flex-[2] h-11 rounded-xl bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-bold text-white hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-35 shadow-lg shadow-violet-500/20"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Plus className="w-4 h-4" /> Add Task</>
                }
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
