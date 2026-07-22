"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion } from "framer-motion"
import { X, Plus, Loader2, CheckCircle2, Bell, Trash2, Clock } from "lucide-react"
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
  const [taskPayType, setTaskPayType] = useState<"hourly" | "fixed">("fixed")
  const [taskRate, setTaskRate] = useState("")
  const [hoursWorked, setHoursWorked] = useState("")
  const [status, setStatus] = useState<"todo" | "completed">("todo")
  const [deadline, setDeadline] = useState("")
  const [deadlineTime, setDeadlineTime] = useState("")
  const [showTimeInput, setShowTimeInput] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  const [useGlobalSettings, setUseGlobalSettings] = useState(true)
  const [deadlineNotificationsEnabled, setDeadlineNotificationsEnabled] = useState(false)
  const [automaticReminderTimings, setAutomaticReminderTimings] = useState<number[]>([])
  const [manualReminders, setManualReminders] = useState<{ reminder_time: string; note?: string }[]>([])
  const [newManualReminderDate, setNewManualReminderDate] = useState("")
  const [newManualReminderTime, setNewManualReminderTime] = useState("")
  const [newManualReminderNote, setNewManualReminderNote] = useState("")

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
    if (!taskRate || parseFloat(taskRate) <= 0) { setError("Task rate/payment amount is required"); return }
    if (taskPayType === 'hourly' && (!hoursWorked || parseFloat(hoursWorked) <= 0)) { setError("Hours worked is required for hourly tasks"); return }
    if (!deadline) { setError("Approximate deadline is required"); return }
    setError("")
    setLoading(true)

    const result = await employeeCreateTask({
      title: title.trim(),
      client_id: clientSelection.client_id || undefined,
      custom_client_name: clientSelection.custom_client_name || undefined,
      task_pay_type: taskPayType,
      task_rate: taskRate,
      hours_worked: hoursWorked,
      status,
      deadline: deadline ? new Date(`${deadline}T${deadlineTime || '23:59:59'}`).toISOString() : undefined,
      use_global_settings: useGlobalSettings,
      deadline_notifications_enabled: deadlineNotificationsEnabled,
      automatic_reminder_timings: automaticReminderTimings,
      manual_reminders: manualReminders,
    })

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const tRate = taskRate ? parseFloat(taskRate) : 0
    const hWorked = hoursWorked ? parseFloat(hoursWorked) : 0
    const pAmount = taskPayType === 'hourly' ? tRate * hWorked : tRate

    // Optimistic card — show client name immediately
    const optimistic = {
      id: result.taskId || `opt-${Date.now()}`,
      title: title.trim(),
      client: clientSelection.client_id ? { name: clientSelection.displayName } : null,
      custom_client_name: clientSelection.custom_client_name || null,
      task_pay_type: taskPayType,
      task_rate: tRate,
      hours_worked: hWorked,
      payment_amount: pAmount,
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
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-muted "
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.975 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.975 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card border border-border rounded-2xl w-full max-w-[420px] shadow-2xl overflow-hidden"
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
            <p className="text-foreground font-semibold text-sm">Task Added!</p>
            <p className="text-muted-foreground text-xs">Your workspace is updated.</p>
          </motion.div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-600/30 to-blue-600/30 border border-violet-500/20 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Add Task</h2>
                  <p className="text-[10px] text-muted-foreground">Quick capture in seconds</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Fields */}
            <div className="px-5 py-4 flex flex-col gap-3.5 max-h-[68vh] overflow-y-auto">

              {/* Task Title */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Task Title <span className="text-red-400">*</span>
                </label>
                <input
                  ref={titleRef}
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSave() }}
                  placeholder="e.g. Edit reel for campaign"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                />
              </div>

              {/* Client — shared combobox */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Client
                </label>
                <ClientCombobox
                  onChange={setClientSelection}
                  placeholder="Select or type client name…"
                  compact
                />
              </div>

              {/* Pay Type + Rate row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Pay Type
                  </label>
                  <select
                    value={taskPayType}
                    onChange={e => setTaskPayType(e.target.value as "hourly" | "fixed")}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="fixed" className="bg-background text-foreground">Fixed Rate</option>
                    <option value="hourly" className="bg-background text-foreground">Hourly Rate</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    {taskPayType === 'hourly' ? 'Rate per Hour (₹)' : 'Total Payment (₹)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={taskRate}
                      onChange={e => setTaskRate(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder={taskPayType === 'hourly' ? "1000" : "5000"}
                      className="w-full bg-muted border border-border rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Status and optionally Hours Worked row */}
              <div className="grid grid-cols-2 gap-3">
                {taskPayType === 'hourly' ? (
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Hours Worked
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={hoursWorked}
                      onChange={e => setHoursWorked(e.target.value.replace(/[^0-9.]/g, ""))}
                      placeholder="e.g. 2.5"
                      className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                    />
                  </div>
                ) : (
                  <div /> /* Empty placeholder to keep status on the right if wanted, or shift status left. Let's just put Status. */
                )}
                <div>
                  <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as "todo" | "completed")}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-violet-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="todo" className="bg-background text-foreground">⏳ Pending</option>
                    <option value="completed" className="bg-background text-foreground">✅ Completed</option>
                  </select>
                </div>
              </div>

              {/* Approximate Deadline (Custom Picker) */}
              <div>
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
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
                            : "bg-muted border-border text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {p.label}
                      </button>
                    )
                  })}
                </div>

                {/* Time selector toggle & input */}
                <div className="mb-2.5 bg-background border border-border rounded-xl p-3 shadow-inner flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-violet-400" /> Set Deadline Time
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={showTimeInput}
                        onChange={e => {
                          setShowTimeInput(e.target.checked);
                          if (!e.target.checked) setDeadlineTime("");
                        }}
                      />
                      <div className="w-8 h-4.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-violet-500"></div>
                    </label>
                  </div>
                  {showTimeInput && (
                    <div className="flex items-center gap-2 mt-0.5 border-t border-border/40 pt-2.5">
                      <input
                        type="time"
                        value={deadlineTime}
                        onChange={e => setDeadlineTime(e.target.value)}
                        className="w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                      />
                    </div>
                  )}
                </div>

                {/* Custom Month View */}
                <div className="bg-background border border-border rounded-xl p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-muted-foreground pl-1">
                      {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                        className="w-6 h-6 rounded-lg bg-muted hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs transition-colors"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                        className="w-6 h-6 rounded-lg bg-muted hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground text-xs transition-colors"
                      >
                        ›
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-1.5">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(d => (
                      <span key={d} className="text-[9px] font-semibold text-muted-foreground uppercase">{d}</span>
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
                              ? "bg-gradient-to-br from-violet-600 to-blue-600 text-foreground font-bold shadow-md shadow-violet-500/20"
                              : isToday
                                ? "border border-violet-500/30 text-violet-300 bg-violet-500/5 hover:bg-muted"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {d}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Reminders & Notifications & Time */}
              <div className="flex flex-col gap-3 border-t border-border/40 pt-3.5">
                {!deadline ? (
                  <div className="text-[10px] text-muted-foreground/60 italic bg-muted/40 rounded-xl p-3 border border-dashed border-border/80 text-center">
                    💡 Select a deadline date above to customize reminders & notifications.
                  </div>
                ) : (
                  <>
                    <div className="bg-background border border-border rounded-xl p-3 shadow-inner flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold text-foreground">Task Notifications</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Use Global Settings</span>
                        <input
                          type="checkbox"
                          className="w-3 h-3 accent-violet-500 rounded bg-muted border-border"
                          checked={useGlobalSettings}
                          onChange={e => setUseGlobalSettings(e.target.checked)}
                        />
                      </div>
                    </div>

                    {useGlobalSettings ? (
                      <div className="text-[9px] text-muted-foreground italic bg-muted/40 rounded-lg p-2 border border-border/60">
                        Applying assignee's default global settings. Configure defaults in settings.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 border-t border-border/40 pt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enable Deadline Warnings</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={deadlineNotificationsEnabled} onChange={e => setDeadlineNotificationsEnabled(e.target.checked)} />
                            <div className="w-8 h-4.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-violet-500"></div>
                          </label>
                        </div>

                        {deadlineNotificationsEnabled && (
                          <div className="flex flex-col gap-3 border-t border-border/40 pt-2">
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                Automatic Reminder Timings
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  { label: "5m before", value: 5 },
                                  { label: "15m before", value: 15 },
                                  { label: "30m before", value: 30 },
                                  { label: "1h before", value: 60 },
                                  { label: "6h before", value: 360 },
                                  { label: "1d before", value: 1440 },
                                  { label: "1w before", value: 10080 }
                                ].map(opt => {
                                  const isSel = automaticReminderTimings.includes(opt.value);
                                  return (
                                    <button
                                      key={opt.value}
                                      type="button"
                                      onClick={() => setAutomaticReminderTimings(prev => isSel ? prev.filter(v => v !== opt.value) : [...prev, opt.value])}
                                      className={`px-2 py-1 text-[10px] rounded-lg font-medium border transition-all ${
                                        isSel
                                          ? "bg-violet-500/15 border-violet-500/40 text-violet-300"
                                          : "bg-muted border-border text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      {opt.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Manual Reminders */}
                            <div className="flex flex-col gap-2 border-t border-border/40 pt-2">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Add Manual Reminder
                              </label>
                              <div className="flex gap-2">
                                <input type="date" value={newManualReminderDate} onChange={e => setNewManualReminderDate(e.target.value)} className="flex-1 bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground [color-scheme:dark]" />
                                <input type="time" value={newManualReminderTime} onChange={e => setNewManualReminderTime(e.target.value)} className="w-24 bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground [color-scheme:dark]" />
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={newManualReminderNote} 
                                  onChange={e => setNewManualReminderNote(e.target.value)} 
                                  placeholder="Optional reminder note" 
                                  className="flex-1 bg-muted border border-border rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50" 
                                />
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    if(newManualReminderDate && newManualReminderTime) {
                                      const iso = new Date(`${newManualReminderDate}T${newManualReminderTime}`).toISOString();
                                      setManualReminders(prev => [...prev, { reminder_time: iso, note: newManualReminderNote.trim() || undefined }]);
                                      setNewManualReminderDate("");
                                      setNewManualReminderTime("");
                                      setNewManualReminderNote("");
                                    }
                                  }}
                                  className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0 hover:bg-violet-700 transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {manualReminders.length > 0 && (
                                <div className="flex flex-col gap-1.5 mt-1 max-h-[120px] overflow-y-auto pr-1">
                                  {manualReminders.map((rem, i) => (
                                    <div key={i} className="flex flex-col gap-0.5 bg-muted rounded-lg p-2 border border-border text-left">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-violet-400"/> 
                                          {new Date(rem.reminder_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                        <button type="button" onClick={() => setManualReminders(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                      {rem.note && (
                                        <span className="text-[10px] text-muted-foreground/60 italic pl-4 truncate">Note: {rem.note}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
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
                className="flex-1 h-11 rounded-xl border border-border text-sm text-muted-foreground hover:text-muted-foreground hover:bg-muted transition-all font-medium"
              >
                Cancel
              </button>
              <button
                id="save-quick-task"
                onClick={handleSave}
                disabled={loading || !title.trim() || !taskRate || !deadline}
                className="flex-[2] h-11 rounded-xl from-violet-600 to-blue-600 text-sm font-bold text-foreground hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-35 shadow-lg shadow-violet-500/20"
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
