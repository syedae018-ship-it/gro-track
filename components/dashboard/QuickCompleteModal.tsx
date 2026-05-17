"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, X, Link2, FileText, Loader2 } from "lucide-react"
import { quickCompleteTask } from "@/app/(dashboard)/dashboard/tasks/actions"

interface QuickCompleteModalProps {
  task: { id: string; title: string; payment_amount: number }
  onClose: () => void
}

export function QuickCompleteModal({ task, onClose }: QuickCompleteModalProps) {
  const [deliveryLink, setDeliveryLink] = useState("")
  const [notes, setNotes] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus delivery link on open
    setTimeout(() => inputRef.current?.focus(), 100)
    // Close on Escape
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleComplete() {
    setLoading(true)
    const result = await quickCompleteTask(task.id, deliveryLink, notes)
    if (!result.error) {
      setDone(true)
      setTimeout(onClose, 1200)
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        >
          {done ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center py-12 gap-3"
            >
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-white font-semibold">Task Submitted!</p>
              <p className="text-white/40 text-sm">Awaiting admin review.</p>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <div className="px-5 pt-5 pb-4 border-b border-white/5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Mark Complete</p>
                  </div>
                  <h3 className="font-semibold text-white leading-snug">{task.title}</h3>
                  {task.payment_amount > 0 && (
                    <p className="text-xs text-emerald-400 mt-0.5">${Number(task.payment_amount).toLocaleString()} on approval</p>
                  )}
                </div>
                <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors shrink-0 mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-4 flex flex-col gap-3">
                {/* Delivery link — primary field */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-white/50 mb-1.5">
                    <Link2 className="w-3 h-3" />
                    Delivery Link <span className="text-white/20">(optional)</span>
                  </label>
                  <input
                    ref={inputRef}
                    type="url"
                    value={deliveryLink}
                    onChange={e => setDeliveryLink(e.target.value)}
                    placeholder="https://drive.google.com/... or Figma link"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleComplete() }}
                  />
                </div>

                {/* Notes — secondary */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs text-white/50 mb-1.5">
                    <FileText className="w-3 h-3" />
                    Note <span className="text-white/20">(optional)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Anything the admin should know..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 pb-5 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 h-10 rounded-lg border border-white/10 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="flex-2 min-w-[140px] h-10 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 text-sm font-semibold text-white hover:opacity-90 active:opacity-75 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Submit for Review</>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
