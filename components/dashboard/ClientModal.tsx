"use client"

import { useState } from "react"
import { createClientAction } from "@/app/(dashboard)/dashboard/clients/actions"
import { Button } from "@/components/ui/button"

export function ClientModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")
    
    const formData = new FormData(e.currentTarget)
    const result = await createClientAction(formData)
    
    if (result.error) {
      setError(result.error)
    } else {
      setIsOpen(false)
    }
    setLoading(false)
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Add Client</Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-white/10 rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Create New Client</h2>
            
            {error && <div className="text-red-500 text-sm mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-secondary">Client Name</label>
                <input required name="name" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-secondary">Industry</label>
                <input name="industry" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-secondary">Contact Email</label>
                <input type="email" name="contact_email" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-secondary">Status</label>
                <select name="status" className="w-full bg-white/5 border border-white/10 rounded p-2 text-white">
                  <option value="active">Active</option>
                  <option value="on_hold">On Hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save Client"}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
