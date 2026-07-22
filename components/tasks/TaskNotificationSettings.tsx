"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, BellOff, Volume2, VolumeX, AlertTriangle, ArrowUp, ArrowDown, Trash2, Plus, HelpCircle, Save } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"

interface TaskNotificationSettingsProps {
  userId: string
  onClose?: () => void
}

interface NotificationSettingsData {
  deadline_notifications_enabled: boolean
  default_reminder_timings: number[] // array of minutes
  apply_to_future_tasks: boolean
  disable_all_reminders: boolean
  default_reminder_note: string
  sound: boolean
  vibration: boolean
  allow_multiple_reminders: boolean
  priority: "low" | "medium" | "high"
}

const PRESET_TIMINGS = [
  { label: "5 minutes before", value: 5 },
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before", value: 60 },
  { label: "2 hours before", value: 120 },
  { label: "3 hours before", value: 180 },
  { label: "6 hours before", value: 360 },
  { label: "12 hours before", value: 720 },
  { label: "1 day before", value: 1440 },
  { label: "2 days before", value: 2880 },
  { label: "1 week before", value: 10080 },
]

export function TaskNotificationSettings({ userId, onClose }: TaskNotificationSettingsProps) {
  const [settings, setSettings] = useState<NotificationSettingsData>({
    deadline_notifications_enabled: true,
    default_reminder_timings: [60, 1440], // default 1 hour & 1 day
    apply_to_future_tasks: true,
    disable_all_reminders: false,
    default_reminder_note: "",
    sound: true,
    vibration: true,
    allow_multiple_reminders: true,
    priority: "medium",
  })
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customValue, setCustomValue] = useState("")
  const [customUnit, setCustomUnit] = useState("minutes") // minutes, hours, days, weeks

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("profiles")
        .select("notification_settings")
        .eq("id", userId)
        .single()

      if (error) {
        console.error("Error loading notification settings:", error.message)
      } else if (data?.notification_settings) {
        const ns = data.notification_settings as any
        setSettings({
          deadline_notifications_enabled: ns.deadline_notifications_enabled !== false,
          default_reminder_timings: Array.isArray(ns.default_reminder_timings) ? ns.default_reminder_timings : [60, 1440],
          apply_to_future_tasks: ns.apply_to_future_tasks !== false,
          disable_all_reminders: !!ns.disable_all_reminders,
          default_reminder_note: ns.default_reminder_note || "",
          sound: ns.sound !== false,
          vibration: ns.vibration !== false,
          allow_multiple_reminders: ns.allow_multiple_reminders !== false,
          priority: ns.priority || "medium",
        })
      }
      setLoading(false)
    }

    if (userId) {
      loadSettings()
    }
  }, [userId])

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({ notification_settings: settings })
      .eq("id", userId)

    setSaving(false)
    if (error) {
      toast.error("Failed to save notification settings: " + error.message)
    } else {
      toast.success("Default task notification preferences updated successfully!")
      if (onClose) onClose()
    }
  }

  // Format timings into a human-readable format
  function formatTiming(mins: number) {
    if (mins === 0) return "At deadline time"
    if (mins % 10080 === 0) return `${mins / 10080} week(s) before`
    if (mins % 1440 === 0) return `${mins / 1440} day(s) before`
    if (mins % 60 === 0) return `${mins / 60} hour(s) before`
    return `${mins} minute(s) before`
  }

  function handleAddPreset(mins: number) {
    if (settings.default_reminder_timings.includes(mins)) return
    if (!settings.allow_multiple_reminders && settings.default_reminder_timings.length > 0) {
      toast.warning("Multiple reminders are disabled. Please enable them first or remove the existing timing.")
      return
    }
    setSettings(prev => ({
      ...prev,
      default_reminder_timings: [...prev.default_reminder_timings, mins]
    }))
  }

  function handleAddCustom() {
    const val = parseInt(customValue)
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid positive number.")
      return
    }
    let mins = val
    if (customUnit === "hours") mins = val * 60
    if (customUnit === "days") mins = val * 1440
    if (customUnit === "weeks") mins = val * 10080

    handleAddPreset(mins)
    setCustomValue("")
  }

  function handleDeleteTiming(idx: number) {
    setSettings(prev => ({
      ...prev,
      default_reminder_timings: prev.default_reminder_timings.filter((_, i) => i !== idx)
    }))
  }

  function handleMoveTiming(idx: number, direction: "up" | "down") {
    const timings = [...settings.default_reminder_timings]
    if (direction === "up" && idx > 0) {
      const temp = timings[idx]
      timings[idx] = timings[idx - 1]
      timings[idx - 1] = temp
    } else if (direction === "down" && idx < timings.length - 1) {
      const temp = timings[idx]
      timings[idx] = timings[idx + 1]
      timings[idx + 1] = temp
    }
    setSettings(prev => ({
      ...prev,
      default_reminder_timings: timings
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="text-sm text-muted-foreground animate-pulse">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col gap-6 max-w-4xl mx-auto my-4 transition-all">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-bold font-syne text-foreground uppercase tracking-wider flex items-center gap-2">
            <Bell className="w-5 h-5 text-violet-400" /> Task Notification Settings
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure global default preferences for all your future tasks.
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            Close
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: General Settings */}
        <div className="flex flex-col gap-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">General Preferences</h3>

          {/* Disable all reminders */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">Disable All Reminders</span>
              <span className="text-[10px] text-muted-foreground">Globally silence all notifications for tasks</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.disable_all_reminders}
                onChange={e => setSettings(prev => ({ ...prev, disable_all_reminders: e.target.checked }))}
              />
              <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          <div className={`flex flex-col gap-4 transition-all ${settings.disable_all_reminders ? "opacity-40 pointer-events-none" : ""}`}>
            {/* Enable Deadline Notifications */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Enable Deadline Alerts</span>
                <span className="text-[10px] text-muted-foreground">Send notifications leading up to deadlines</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.deadline_notifications_enabled}
                  onChange={e => setSettings(prev => ({ ...prev, deadline_notifications_enabled: e.target.checked }))}
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Apply to all future tasks */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Apply to All Future Tasks</span>
                <span className="text-[10px] text-muted-foreground">Automatically link new tasks to these preferences</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.apply_to_future_tasks}
                  onChange={e => setSettings(prev => ({ ...prev, apply_to_future_tasks: e.target.checked }))}
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Sound & Vibration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-2 bg-muted/20 border border-border rounded-lg">
                <span className="text-xs font-semibold text-foreground">Sound Alert</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.sound}
                    onChange={e => setSettings(prev => ({ ...prev, sound: e.target.checked }))}
                  />
                  <div className="w-7 h-4 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted/20 border border-border rounded-lg">
                <span className="text-xs font-semibold text-foreground">Vibration</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.vibration}
                    onChange={e => setSettings(prev => ({ ...prev, vibration: e.target.checked }))}
                  />
                  <div className="w-7 h-4 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {/* Allow Multiple Reminders */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-foreground">Allow Multiple Reminders</span>
                <span className="text-[10px] text-muted-foreground">Receive reminders at multiple timings before deadline</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.allow_multiple_reminders}
                  onChange={e => {
                    const checked = e.target.checked
                    setSettings(prev => ({
                      ...prev,
                      allow_multiple_reminders: checked,
                      // If false, keep only the first timing if there are multiple
                      default_reminder_timings: checked ? prev.default_reminder_timings : prev.default_reminder_timings.slice(0, 1)
                    }))
                  }}
                />
                <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-background after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            {/* Priority */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground">Notification Priority</span>
              <select
                value={settings.priority}
                onChange={e => setSettings(prev => ({ ...prev, priority: e.target.value as any }))}
                className="bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-violet-500/50"
              >
                <option value="low">Low Priority (Silent banner)</option>
                <option value="medium">Medium Priority (Standard alert)</option>
                <option value="high">High Priority (Urgent sound & persistent banner)</option>
              </select>
            </div>

            {/* Default Reminder Note */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground">Default Reminder Note</span>
              <textarea
                value={settings.default_reminder_note}
                onChange={e => setSettings(prev => ({ ...prev, default_reminder_note: e.target.value }))}
                placeholder="e.g. Please remember to check and verify all criteria before submission."
                rows={3}
                className="bg-muted border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Right Side: Reminder Schedules & Timings */}
        <div className={`flex flex-col gap-5 transition-all ${settings.disable_all_reminders || !settings.deadline_notifications_enabled ? "opacity-40 pointer-events-none" : ""}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Default Reminder Timings</h3>

          {/* Selected Timings List */}
          <div className="flex flex-col gap-2 bg-muted/20 border border-border rounded-xl p-3 min-h-[160px]">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Scheduled intervals</span>
            {settings.default_reminder_timings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground italic">
                No reminders configured. Always triggers at deadline.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {settings.default_reminder_timings.map((mins, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-card border border-border/60 rounded-lg p-2 text-xs">
                    <span className="font-semibold text-foreground">{formatTiming(mins)}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveTiming(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveTiming(idx, "down")}
                        disabled={idx === settings.default_reminder_timings.length - 1}
                        className="p-1 rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTiming(idx)}
                        className="p-1 rounded text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="text-[9px] text-muted-foreground italic mt-2 border-t border-border/40 pt-2">
              Note: A "Deadline Reached" notification is always triggered at the exact deadline, independent of the settings above.
            </div>
          </div>

          {/* Add Preset Timing */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add Preset Interval</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TIMINGS.map(preset => {
                const alreadyAdded = settings.default_reminder_timings.includes(preset.value);
                return (
                  <button
                    key={preset.value}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => handleAddPreset(preset.value)}
                    className="px-2 py-1 text-[10px] rounded-lg font-medium border border-border/80 bg-muted hover:bg-muted/80 text-foreground disabled:opacity-40 disabled:hover:bg-muted transition-all"
                  >
                    + {preset.label.replace(" before", "")}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Add Custom Timing */}
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Add Custom Interval</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                placeholder="e.g. 10"
                className="bg-muted border border-border rounded-xl px-3 py-1.5 text-xs text-foreground w-20 focus:outline-none focus:border-violet-500/50"
              />
              <select
                value={customUnit}
                onChange={e => setCustomUnit(e.target.value)}
                className="bg-muted border border-border rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-violet-500/50"
              >
                <option value="minutes">Minutes before</option>
                <option value="hours">Hours before</option>
                <option value="days">Days before</option>
                <option value="weeks">Weeks before</option>
              </select>
              <button
                type="button"
                onClick={handleAddCustom}
                className="bg-primary hover:opacity-95 text-primary-foreground font-bold p-1.5 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end border-t border-border pt-4 mt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:opacity-95 text-primary-foreground font-bold rounded-xl text-xs uppercase tracking-wider shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {saving ? (
            "Saving Settings..."
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Default Preferences
            </>
          )}
        </button>
      </div>
    </div>
  )
}
