"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { X, Plus, Loader2, Bell, Trash2, Clock } from "lucide-react"
import { fetchTaskReminders, addTaskReminder, deleteTaskReminder } from "@/app/(dashboard)/dashboard/tasks/employee-actions"

interface ManageRemindersModalProps {
  taskId: string
  taskTitle: string
  onClose: () => void
}

export function ManageRemindersModal({ taskId, taskTitle, onClose }: ManageRemindersModalProps) {
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  const [newDate, setNewDate] = useState("")
  const [newTime, setNewTime] = useState("")
  const [newNote, setNewNote] = useState("")

  useEffect(() => {
    async function load() {
      const res = await fetchTaskReminders(taskId)
      if (res.error) setError(res.error)
      else setReminders(res.reminders || [])
      setLoading(false)
    }
    load()
  }, [taskId])

  // Escape key listener
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  async function handleAdd() {
    if (!newDate || !newTime) {
      setError("Please select both date and time")
      return
    }
    setError("")
    setAdding(true)
    const iso = new Date(`${newDate}T${newTime}`).toISOString()
    const res = await addTaskReminder(taskId, iso, 'manual', newNote.trim() || undefined)
    
    if (res.error) {
      setError(res.error)
    } else if (res.reminder) {
      setReminders(prev => [...prev, res.reminder].sort((a, b) => new Date(a.reminder_time).getTime() - new Date(b.reminder_time).getTime()))
      setNewDate("")
      setNewTime("")
      setNewNote("")
    }
    setAdding(false)
  }

  async function handleDelete(id: string) {
    setReminders(prev => prev.filter(r => r.id !== id))
    await deleteTaskReminder(id)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-muted/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.975 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.975 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-card border border-border rounded-2xl w-full max-w-[360px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Reminders</h2>
              <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{taskTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 shrink-0">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scheduled Reminders</label>
                {reminders.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic bg-muted/50 rounded-lg p-3 text-center border border-dashed border-border">No reminders set for this task.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {reminders.map(r => {
                      const isPast = new Date(r.reminder_time) < new Date()
                      return (
                        <div key={r.id} className={`flex flex-col gap-1.5 rounded-xl px-3 py-2 border ${isPast ? 'bg-muted/50 border-border/50' : 'bg-background border-border shadow-sm'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className={`text-xs font-medium flex items-center gap-1.5 ${isPast ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                <Clock className="w-3 h-3 text-violet-400" />
                                {new Date(r.reminder_time).toLocaleString("en-IN", {
                                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                                })}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] text-muted-foreground uppercase tracking-widest">{r.type}</span>
                                {r.profiles?.full_name && (
                                  <span className="text-[9px] text-violet-400 font-semibold truncate max-w-[120px]">User: {r.profiles.full_name}</span>
                                )}
                              </div>
                            </div>
                            {!isPast && (
                              <button onClick={() => handleDelete(r.id)} className="w-6 h-6 flex items-center justify-center text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                          {r.note && (
                            <div className="text-[10px] text-muted-foreground italic pl-4 border-t border-border/40 pt-1.5">
                              Note: {r.note}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add Reminder</label>
                <div className="flex gap-2">
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="flex-1 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-violet-500/50 [color-scheme:dark]" />
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-24 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-violet-500/50 [color-scheme:dark]" />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newNote} 
                    onChange={e => setNewNote(e.target.value)} 
                    placeholder="Optional note" 
                    className="flex-1 bg-muted border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-violet-500/50" 
                  />
                  <button 
                    onClick={handleAdd}
                    disabled={adding || !newDate || !newTime}
                    className="w-9 h-9 shrink-0 rounded-lg bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white disabled:opacity-50 transition-colors"
                  >
                    {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
