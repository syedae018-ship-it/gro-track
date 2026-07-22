"use client"

import React, { useState } from "react"
import { createTaskAction, editTaskAction } from "@/app/(dashboard)/dashboard/tasks/actions"
import { Button } from "@/components/ui/button"
import { Bell, Trash2, Clock, Plus } from "lucide-react"
import { ClientCombobox, type ClientSelection } from "@/components/ui/ClientCombobox"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface TaskModalProps {
  clients: { id: string; name: string }[]
  employees: { id: string; full_name: string }[]
  isPersonal?: boolean
  currentUserId?: string
  task?: any // If provided, we are in Edit Mode
  trigger?: React.ReactNode // Custom trigger button
  onSuccess?: () => void
}

export function TaskModal({ clients, employees, isPersonal, currentUserId, task, trigger, onSuccess }: TaskModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [title, setTitle] = useState(task?.title || "")
  const [type, setType] = useState(task?.type || (isPersonal ? "Personal" : ""))
  const [paymentAmount, setPaymentAmount] = useState(task?.payment_amount?.toString() || "0")
  const [priority, setPriority] = useState(task?.priority || "medium")
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || "")
  
  const initialDeadlineStr = task?.deadline ? task.deadline.split('T')[0] : ""
  const initialDeadlineTime = task?.deadline && task.deadline.includes('T') ? task.deadline.split('T')[1].slice(0, 5) : ""

  const [deadlineStr, setDeadlineStr] = useState(initialDeadlineStr)
  const [deadlineTime, setDeadlineTime] = useState(initialDeadlineTime)
  const [showTimeInput, setShowTimeInput] = useState(!!initialDeadlineTime)
  const [useGlobalSettings, setUseGlobalSettings] = useState(task ? !!task.use_global_settings : true)
  const [deadlineNotificationsEnabled, setDeadlineNotificationsEnabled] = useState(task ? !!task.deadline_notifications_enabled : false)
  const [automaticReminderTimings, setAutomaticReminderTimings] = useState<number[]>(task?.automatic_reminder_timings || [])
  const [manualReminders, setManualReminders] = useState<{ reminder_time: string; note?: string }[]>([])
  const [newManualReminderDate, setNewManualReminderDate] = useState("")
  const [newManualReminderTime, setNewManualReminderTime] = useState("")
  const [newManualReminderNote, setNewManualReminderNote] = useState("")

  const [clientSelection, setClientSelection] = useState<ClientSelection>(() => {
    if (task) {
      if (task.client_id) {
        return {
          client_id: task.client_id,
          custom_client_name: null,
          displayName: task.client?.name || "Selected Client",
        }
      } else if (task.custom_client_name) {
        return {
          client_id: null,
          custom_client_name: task.custom_client_name,
          displayName: task.custom_client_name,
        }
      }
    }
    return {
      client_id: null,
      custom_client_name: null,
      displayName: "",
    }
  })

  async function handleOpen() {
    setError("")
    if (task) {
      setTitle(task.title || "")
      setType(task.type || "")
      setPaymentAmount(task.payment_amount?.toString() || "0")
      setPriority(task.priority || "medium")
      setAssignedTo(task.assigned_to || "")
      const dStr = task.deadline ? task.deadline.split('T')[0] : ""
      const dTime = task.deadline && task.deadline.includes('T') ? task.deadline.split('T')[1].slice(0, 5) : ""
      setDeadlineStr(dStr)
      setDeadlineTime(dTime)
      setShowTimeInput(!!dTime)
      setUseGlobalSettings(!!task.use_global_settings)
      setDeadlineNotificationsEnabled(!!task.deadline_notifications_enabled)
      setAutomaticReminderTimings(task.automatic_reminder_timings || [])
      setClientSelection({
        client_id: task.client_id || null,
        custom_client_name: task.custom_client_name || null,
        displayName: task.client?.name || task.custom_client_name || "",
      })

      // Fetch manual reminders
      const supabase = createClient()
      const { data, error: rErr } = await supabase
        .from('task_reminders')
        .select('*')
        .eq('task_id', task.id)
        .eq('type', 'manual')

      if (rErr) {
        console.error("Error fetching manual reminders:", rErr.message)
      } else if (data) {
        setManualReminders(data.map(r => ({ reminder_time: r.reminder_time, note: r.note || undefined })))
      }
    } else {
      setTitle("")
      setType(isPersonal ? "Personal" : "")
      setPaymentAmount("0")
      setPriority("medium")
      setAssignedTo("")
      setClientSelection({ client_id: null, custom_client_name: null, displayName: "" })
      setDeadlineStr("")
      setDeadlineTime("")
      setShowTimeInput(false)
      setUseGlobalSettings(true)
      setDeadlineNotificationsEnabled(false)
      setAutomaticReminderTimings([])
      setManualReminders([])
    }
    setNewManualReminderDate("")
    setNewManualReminderTime("")
    setNewManualReminderNote("")
    setIsOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)

    // Inject client selection from combobox state
    formData.delete("client_id")
    formData.delete("custom_client_name")
    if (clientSelection.client_id) {
      formData.set("client_id", clientSelection.client_id)
    } else if (clientSelection.custom_client_name) {
      formData.set("custom_client_name", clientSelection.custom_client_name)
    }

    // Personal tasks: self-assign, zero payment
    if (isPersonal && currentUserId) {
      formData.set("assigned_to", currentUserId)
      formData.set("payment_amount", "0")
    }

    // Handle deadlines and reminders
    if (deadlineStr) {
      formData.set("deadline", new Date(`${deadlineStr}T${deadlineTime || '23:59:59'}`).toISOString())
    }
    formData.set("use_global_settings", useGlobalSettings.toString())
    formData.set("deadline_notifications_enabled", deadlineNotificationsEnabled.toString())
    formData.set("automatic_reminder_timings", JSON.stringify(automaticReminderTimings))
    formData.set("manual_reminders", JSON.stringify(manualReminders))

    const result = task
      ? await editTaskAction(task.id, formData)
      : await createTaskAction(formData)

    if (result.error) {
      setError(result.error)
    } else {
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success(task ? "Task updated successfully!" : "Task created successfully!")
      }
      setIsOpen(false)
      if (onSuccess) onSuccess()
    }
    setLoading(false)
  }

  return (
    <>
      {trigger ? (
        <span onClick={handleOpen} className="cursor-pointer">{trigger}</span>
      ) : (
        <Button onClick={handleOpen}>
          {isPersonal ? "Add Personal Task" : "Create Team Task"}
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-muted border border-border rounded-2xl w-full max-w-lg shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-border/50">
              <h2 className="text-lg font-syne font-bold text-foreground">
                {isPersonal ? "Add Personal Task" : "Create Team Task"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isPersonal
                  ? "Internal task — only you can see this."
                  : "Assign a task to a team member."}
              </p>
            </div>

            {error && (
              <div className="mx-6 mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task Title *</label>
                <input
                  required
                  name="title"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Edit reel for Woosh campaign"
                  className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                />
              </div>

              {/* Type + Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Task Type *</label>
                  <input
                    required
                    name="type"
                    value={type}
                    onChange={e => setType(e.target.value)}
                    placeholder="Design, Video…"
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Deadline</label>
                  <input
                    type="date"
                    name="deadline_ignore"
                    value={deadlineStr}
                    onChange={e => setDeadlineStr(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <div className="bg-muted border border-border rounded-xl p-3 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
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
                      <div className="flex items-center gap-2 mt-0.5 border-t border-border/50 pt-2.5">
                        <input
                          type="time"
                          value={deadlineTime}
                          onChange={e => setDeadlineTime(e.target.value)}
                          className="w-full bg-muted border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-violet-500/50 [color-scheme:dark]"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Reminders & Notifications */}
              <div className="flex flex-col gap-3">
                {!deadlineStr ? (
                  <div className="text-[10px] text-muted-foreground italic bg-muted/50 rounded-xl p-3.5 border border-dashed border-border text-center">
                    💡 Select a deadline date above to customize reminders & notifications.
                  </div>
                ) : (
                  <div className="bg-muted border border-border rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-violet-400" />
                        <span className="text-xs font-bold text-foreground font-syne uppercase tracking-wider">Task Notifications</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Use Global Settings</span>
                          <input
                            type="checkbox"
                            className="w-3.5 h-3.5 accent-violet-500 rounded bg-muted border-border"
                            checked={useGlobalSettings}
                            onChange={e => setUseGlobalSettings(e.target.checked)}
                          />
                        </div>
                      </div>
                    </div>

                    {useGlobalSettings ? (
                      <div className="text-[10px] text-muted-foreground italic bg-muted/50 rounded-lg p-2 border border-border/50 mt-1">
                        Applying assignee's default global reminder settings. Configure defaults in settings.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 mt-1 pt-2 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Enable Deadline Warnings</span>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" checked={deadlineNotificationsEnabled} onChange={e => setDeadlineNotificationsEnabled(e.target.checked)} />
                            <div className="w-8 h-4.5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-violet-500"></div>
                          </label>
                        </div>

                        {deadlineNotificationsEnabled && (
                          <div className="flex flex-col gap-3 border-t border-border/50 pt-2">
                            <div>
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
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
                                          ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
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
                            <div className="flex flex-col gap-2 border-t border-border/50 pt-2">
                              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                                Add Manual Reminder
                              </label>
                              <div className="flex gap-2">
                                <input type="date" value={newManualReminderDate} onChange={e => setNewManualReminderDate(e.target.value)} className="flex-1 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground [color-scheme:dark]" />
                                <input type="time" value={newManualReminderTime} onChange={e => setNewManualReminderTime(e.target.value)} className="w-24 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground [color-scheme:dark]" />
                              </div>
                              <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  value={newManualReminderNote} 
                                  onChange={e => setNewManualReminderNote(e.target.value)} 
                                  placeholder="Optional reminder note" 
                                  className="flex-1 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50" 
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
                                <div className="flex flex-col gap-1.5 mt-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  {manualReminders.map((rem, i) => (
                                    <div key={i} className="flex flex-col gap-1 bg-muted rounded-lg p-2 border border-border text-left">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-foreground/70 font-semibold flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-violet-400"/> 
                                          {new Date(rem.reminder_time).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                        <button type="button" onClick={() => setManualReminders(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                      {rem.note && (
                                        <span className="text-[10px] text-muted-foreground italic pl-4 truncate">Note: {rem.note}</span>
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
                )}
              </div>

              {/* Team-only fields */}
              {!isPersonal && (
                <>
                  {/* Client Combobox */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Client</label>
                    <ClientCombobox
                      initialClients={clients}
                      onChange={setClientSelection}
                      selectedValue={clientSelection}
                      placeholder="Select or type client name…"
                    />
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assign To *</label>
                    <select
                      required
                      name="assigned_to"
                      value={assignedTo}
                      onChange={e => setAssignedTo(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
                    >
                      <option value="">Select Employee</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.full_name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Priority + Payment */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Priority</label>
                  <select
                    name="priority"
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full bg-muted border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                {!isPersonal && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Payment (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        name="payment_amount"
                        value={paymentAmount}
                        onChange={e => setPaymentAmount(e.target.value)}
                        className="w-full bg-muted border border-border rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-foreground focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving…" : "Save Task"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
