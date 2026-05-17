"use client"

import { useState } from "react"
import { createTaskAction } from "@/app/(dashboard)/dashboard/tasks/actions"
import { Button } from "@/components/ui/button"
import { ClientCombobox, type ClientSelection } from "@/components/ui/ClientCombobox"

interface TaskModalProps {
  clients: { id: string; name: string }[]
  employees: { id: string; full_name: string }[]
  isPersonal?: boolean
  currentUserId?: string
}

export function TaskModal({ clients, employees, isPersonal, currentUserId }: TaskModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [clientSelection, setClientSelection] = useState<ClientSelection>({
    client_id: null,
    custom_client_name: null,
    displayName: "",
  })

  function handleOpen() {
    setClientSelection({ client_id: null, custom_client_name: null, displayName: "" })
    setError("")
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

    const result = await createTaskAction(formData)

    if (result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
    setLoading(false)
  }

  return (
    <>
      <Button onClick={handleOpen}>
        {isPersonal ? "Add Personal Task" : "Create Team Task"}
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/5">
              <h2 className="text-lg font-syne font-bold text-white">
                {isPersonal ? "Add Personal Task" : "Create Team Task"}
              </h2>
              <p className="text-xs text-white/30 mt-0.5">
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
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Task Title *</label>
                <input
                  required
                  name="title"
                  placeholder="e.g. Edit reel for Woosh campaign"
                  className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                />
              </div>

              {/* Type + Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Task Type *</label>
                  <input
                    required
                    name="type"
                    defaultValue={isPersonal ? "Personal" : ""}
                    placeholder="Design, Video…"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Deadline</label>
                  <input
                    type="date"
                    name="deadline"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Team-only fields */}
              {!isPersonal && (
                <>
                  {/* Client Combobox */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Client</label>
                    <ClientCombobox
                      initialClients={clients}
                      onChange={setClientSelection}
                      placeholder="Select or type client name…"
                    />
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Assign To *</label>
                    <select
                      required
                      name="assigned_to"
                      className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
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
                  <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Priority</label>
                  <select
                    name="priority"
                    defaultValue="medium"
                    className="w-full bg-white/4 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 transition-all appearance-none"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                {!isPersonal && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/40">Payment (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 text-sm">₹</span>
                      <input
                        type="number"
                        step="0.01"
                        name="payment_amount"
                        defaultValue="0"
                        className="w-full bg-white/4 border border-white/8 rounded-xl pl-7 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/10 transition-all"
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
