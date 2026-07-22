"use client"

import { useEffect, useState, useTransition } from "react"
import { Shield, Plus, Mail, User as UserIcon, UserCog, MoreVertical, CheckCircle2, XCircle, Trash2, ShieldAlert } from "lucide-react"
import { getAllowedUsers, addAllowedUser, updateAllowedUserStatus, updateAllowedUserRole, removeAllowedUser } from "./actions"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type AllowedUser = {
  id: string
  email: string
  full_name: string
  role: string
  designation: string
  status: 'active' | 'inactive'
  created_at: string
}

export default function AccessControlPage() {
  const [users, setUsers] = useState<AllowedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState("employee")
  const [designation, setDesignation] = useState("")

  useEffect(() => {
    loadUsers()
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    // NextAuth role check - fallback if layout doesn't block it
    // Note: session data might be structured differently depending on adapter
  }

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await getAllowedUsers()
      setUsers(data as AllowedUser[])
    } catch (error) {
      toast.error("Failed to load allowed users")
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const formData = new FormData()
      formData.append("email", email)
      formData.append("full_name", fullName)
      formData.append("role", role)
      formData.append("designation", designation)

      const result = await addAllowedUser(formData)
      if (result.success) {
        toast.success("User added to allowlist successfully")
        setShowAddForm(false)
        setEmail("")
        setFullName("")
        setRole("employee")
        setDesignation("")
        loadUsers()
      } else {
        toast.error(result.error || "Failed to add user")
      }
    })
  }

  const handleToggleStatus = (id: string, currentStatus: string) => {
    startTransition(async () => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      const result = await updateAllowedUserStatus(id, newStatus)
      if (result.success) {
        toast.success(`User status updated to ${newStatus}`)
        loadUsers()
      } else {
        toast.error(result.error || "Failed to update status")
      }
    })
  }

  const handleUpdateRole = (id: string, newRole: string) => {
    startTransition(async () => {
      const result = await updateAllowedUserRole(id, newRole)
      if (result.success) {
        toast.success("User role updated successfully")
        loadUsers()
      } else {
        toast.error(result.error || "Failed to update role")
      }
    })
  }

  const handleRemoveUser = (id: string) => {
    if (!confirm("Are you sure you want to completely remove this user from the allowlist? They will not be able to log in.")) return
    startTransition(async () => {
      const result = await removeAllowedUser(id)
      if (result.success) {
        toast.success("User removed from allowlist")
        loadUsers()
      } else {
        toast.error(result.error || "Failed to remove user")
      }
    })
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card/40 backdrop-blur-md p-6 rounded-3xl border border-border/50 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
            <ShieldAlert className="w-6 h-6 text-primary" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Access Control</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage Google OAuth Allowlist & Roles</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
        >
          {showAddForm ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showAddForm ? "Cancel" : "Add Authorized User"}
        </button>
      </div>

      {/* Add User Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddUser} className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm flex flex-col gap-6">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" /> New Authorized User
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      required 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Email (@groitup.com)</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="email" 
                      required 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@groitup.com"
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Role</label>
                  <div className="relative">
                    <UserCog className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select 
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-11 pl-10 pr-4 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none"
                    >
                      <option value="employee">Employee</option>
                      <option value="admin_ops">Admin (Ops)</option>
                      <option value="admin_finance">Admin (Finance)</option>
                      <option value="admin">Admin (Full)</option>
                      <option value="managing_director">Managing Director</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1">Designation</label>
                  <input 
                    type="text" 
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="e.g. Software Engineer"
                    className="w-full h-11 px-4 rounded-xl bg-background border border-border text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2">
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="h-11 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all flex items-center justify-center disabled:opacity-50"
                >
                  {isPending ? "Adding..." : "Add User"}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users Table */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">User</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider">Added On</th>
                <th className="px-6 py-4 font-semibold text-muted-foreground text-xs uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading users...
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No users found in the allowlist.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary/30 flex items-center justify-center text-secondary-foreground font-bold text-xs uppercase">
                          {user.full_name.substring(0,2)}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{user.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        disabled={isPending}
                        className="bg-transparent text-sm text-foreground focus:outline-none border-b border-transparent focus:border-border cursor-pointer appearance-none hover:bg-muted px-2 py-1 rounded"
                      >
                        <option value="employee">Employee</option>
                        <option value="admin_ops">Admin (Ops)</option>
                        <option value="admin_finance">Admin (Finance)</option>
                        <option value="admin">Admin (Full)</option>
                        <option value="managing_director">Managing Director</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                      }`}>
                        {user.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {user.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(user.created_at).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleToggleStatus(user.id, user.status)}
                          disabled={isPending}
                          className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
                        >
                          {user.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                        <button 
                          onClick={() => handleRemoveUser(user.id)}
                          disabled={isPending}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
