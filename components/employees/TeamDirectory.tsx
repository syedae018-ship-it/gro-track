"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Phone, Mail, Calendar, CreditCard, Users,
  Briefcase, X, ChevronRight, ExternalLink, MessageSquare,
  ClipboardList, BarChart2, Building2, CheckCircle2, ListTodo,
  UserCircle2, Banknote, Link2
} from "lucide-react"
import { Avatar } from "@/components/shared/Avatar"

const ROLE_LABELS: Record<string, string> = {
  employee: "Team Member",
  admin: "Admin",
  admin_ops: "Ops Admin",
  admin_finance: "Finance Admin",
  managing_director: "Managing Director",
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  other: "Other",
}

const GRADIENTS = [
  "from-violet-600 to-blue-600",
  "from-pink-600 to-rose-500",
  "from-amber-500 to-orange-500",
  "from-emerald-500 to-teal-500",
  "from-cyan-500 to-blue-500",
  "from-purple-600 to-pink-500",
]

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

interface Employee {
  id: string
  full_name: string
  role: string
  is_active: boolean
  created_at: string
  phone?: string | null
  email?: string | null
  specialization?: string | null
  upi_id?: string | null
  bank_name?: string | null
  account_holder_name?: string | null
  payment_method?: string | null
  notes?: string | null
  avatar_url?: string | null
}

interface TeamDirectoryProps {
  employees: Employee[]
  tasks: any[]
}

export function TeamDirectory({ employees, tasks }: TeamDirectoryProps) {
  const [search, setSearch] = useState("")
  const [filterRole, setFilterRole] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterClient, setFilterClient] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)

  // Build per-employee client list from tasks
  const employeeClients = useMemo(() => {
    const map = new Map<string, Map<string, string>>() // empId -> clientId -> clientName
    tasks.forEach(t => {
      if (!t.assigned_to || !t.client) return
      if (!map.has(t.assigned_to)) map.set(t.assigned_to, new Map())
      map.get(t.assigned_to)!.set(t.client.id, t.client.name)
    })
    const result: Record<string, { id: string; name: string }[]> = {}
    map.forEach((clients, empId) => {
      result[empId] = Array.from(clients.entries()).map(([id, name]) => ({ id, name }))
    })
    return result
  }, [tasks])

  // All unique clients (for filter dropdown)
  const allClients = useMemo(() => {
    const set = new Map<string, string>()
    tasks.forEach(t => { if (t.client) set.set(t.client.id, t.client.name) })
    return Array.from(set.entries()).map(([id, name]) => ({ id, name }))
  }, [tasks])

  const filtered = useMemo(() => {
    return employees.filter(emp => {
      if (search) {
        const q = search.toLowerCase()
        const match = emp.full_name.toLowerCase().includes(q)
          || emp.email?.toLowerCase().includes(q)
          || emp.phone?.includes(q)
          || emp.specialization?.toLowerCase().includes(q)
        if (!match) return false
      }
      if (filterRole && emp.role !== filterRole) return false
      if (filterStatus === "active" && !emp.is_active) return false
      if (filterStatus === "inactive" && emp.is_active) return false
      if (filterClient) {
        const empClientIds = (employeeClients[emp.id] || []).map(c => c.id)
        if (!empClientIds.includes(filterClient)) return false
      }
      return true
    })
  }, [employees, search, filterRole, filterStatus, filterClient, employeeClients])

  // Recent tasks for selected employee (shown in modal)
  const recentTasks = useMemo(() => {
    if (!selectedEmployee) return []
    return tasks.filter(t => t.assigned_to === selectedEmployee.id).slice(0, 8)
  }, [selectedEmployee, tasks])

  return (
    <>
      {/* ── Filters ── */}
      <div className="flex flex-col md:flex-row gap-3 bg-white/[0.02] border border-white/5 rounded-xl p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, phone, specialization…"
            className="w-full bg-[#0d0d12] border border-white/8 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-violet-500/40 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="bg-[#0d0d12] border border-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-all">
            <option value="">All Roles</option>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#0d0d12] border border-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-all">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="bg-[#0d0d12] border border-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-violet-500/40 transition-all">
            <option value="">All Clients</option>
            {allClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-white/20 border border-dashed border-white/5 rounded-2xl">
            <UserCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No team members match your filters.</p>
          </div>
        )}
        {filtered.map((emp, i) => {
          const clients = employeeClients[emp.id] || []
          const gradient = GRADIENTS[i % GRADIENTS.length]
          const activeTasks = tasks.filter(t => t.assigned_to === emp.id && !['completed','approved'].includes(t.status)).length

          return (
            <motion.div
              key={emp.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0f0f14] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 hover:shadow-lg hover:shadow-black/30 transition-all group"
            >
              {/* Card Header */}
              <div className="p-4 flex items-start gap-3">
                <Avatar initials={emp.full_name} src={emp.avatar_url} size="lg" className="w-12 h-12 rounded-2xl shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-white text-[15px] leading-tight truncate">{emp.full_name}</p>
                      <p className="text-[11px] text-violet-300/80 mt-0.5 font-medium">
                        {emp.specialization || ROLE_LABELS[emp.role] || emp.role}
                      </p>
                    </div>
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      emp.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {emp.is_active ? '● Active' : '● Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Strip */}
              <div className="px-4 pb-3 flex flex-col gap-1.5">
                {emp.phone ? (
                  <a href={`tel:${emp.phone}`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white transition-colors">
                    <Phone className="w-3 h-3 text-white/30 shrink-0" />
                    <span>{emp.phone}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-white/20">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>No phone</span>
                  </div>
                )}
                {emp.email ? (
                  <a href={`mailto:${emp.email}`} className="flex items-center gap-2 text-[11px] text-white/50 hover:text-white transition-colors truncate">
                    <Mail className="w-3 h-3 text-white/30 shrink-0" />
                    <span className="truncate">{emp.email}</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-[11px] text-white/20">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span>No email</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[11px] text-white/30">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>Joined {new Date(emp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Payment Method Badge */}
              {emp.payment_method && (
                <div className="px-4 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-3 h-3 text-white/25" />
                    <span className="text-[10px] text-emerald-400/80 font-semibold">
                      {PAYMENT_METHOD_LABELS[emp.payment_method] || emp.payment_method}
                      {emp.upi_id && emp.payment_method === 'upi' && (
                        <span className="text-white/30 font-normal"> · {emp.upi_id}</span>
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Client Chips */}
              {clients.length > 0 && (
                <div className="px-4 pb-3">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-white/20 mb-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Clients
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {clients.slice(0, 4).map(c => (
                      <span key={c.id} className="text-[10px] font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded-full">
                        {c.name}
                      </span>
                    ))}
                    {clients.length > 4 && (
                      <span className="text-[10px] text-white/30 px-1.5 py-0.5">+{clients.length - 4}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Footer: Active Tasks + Actions */}
              <div className="px-4 py-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-white/35">
                  <ListTodo className="w-3.5 h-3.5 text-yellow-400/60" />
                  <span>{activeTasks} active task{activeTasks !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-1">
                  <a
                    href={`/dashboard/analytics`}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-violet-500/15 hover:text-violet-400 flex items-center justify-center text-white/30 transition-all"
                    title="View Analytics"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => setSelectedEmployee(emp)}
                    className="flex items-center gap-1 text-[10px] font-semibold text-white/30 hover:text-violet-300 bg-white/5 hover:bg-violet-500/10 px-2.5 py-1.5 rounded-lg transition-all"
                  >
                    Profile <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Employee Detail Modal ── */}
      <AnimatePresence>
        {selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center p-4 pt-8 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) setSelectedEmployee(null) }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[#0d0d12] border border-white/8 rounded-3xl w-full max-w-2xl shadow-2xl shadow-black/60 overflow-hidden mb-8"
            >
              {/* Modal Header */}
              {(() => {
                const emp = selectedEmployee
                const clients = employeeClients[emp.id] || []
                const gi = employees.indexOf(emp)
                const gradient = GRADIENTS[gi % GRADIENTS.length]
                const completedCount = tasks.filter(t => t.assigned_to === emp.id && ['completed','approved'].includes(t.status)).length
                const activeCount = tasks.filter(t => t.assigned_to === emp.id && !['completed','approved'].includes(t.status)).length

                return (
                  <>
                    {/* Gradient header band */}
                    <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />

                    <div className="p-6">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex items-center gap-4">
                          <Avatar initials={emp.full_name} src={emp.avatar_url} size="xl" className="w-16 h-16 rounded-2xl shadow-xl" />
                          <div>
                            <h2 className="text-2xl font-syne font-bold text-white">{emp.full_name}</h2>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-violet-300 font-medium">{emp.specialization || ROLE_LABELS[emp.role] || emp.role}</span>
                              <span className="text-white/20">·</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                emp.is_active
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-red-500/10 text-red-400 border-red-500/20'
                              }`}>
                                {emp.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedEmployee(null)}
                          className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Contact Info */}
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                          <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/30 flex items-center gap-2">
                            <UserCircle2 className="w-3.5 h-3.5" /> Contact Information
                          </h3>
                          <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Phone" value={emp.phone} href={emp.phone ? `tel:${emp.phone}` : undefined} />
                          <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={emp.email} href={emp.email ? `mailto:${emp.email}` : undefined} />
                          <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Joined" value={new Date(emp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} />
                          <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Role" value={ROLE_LABELS[emp.role] || emp.role} />
                        </div>

                        {/* Payment Info */}
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
                          <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/30 flex items-center gap-2">
                            <Banknote className="w-3.5 h-3.5" /> Payment Details
                          </h3>
                          <InfoRow icon={<CreditCard className="w-3.5 h-3.5" />} label="Method" value={emp.payment_method ? PAYMENT_METHOD_LABELS[emp.payment_method] : null} />
                          <InfoRow icon={<Link2 className="w-3.5 h-3.5" />} label="UPI ID" value={emp.upi_id} copyable />
                          <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Bank Name" value={emp.bank_name} />
                          <InfoRow icon={<UserCircle2 className="w-3.5 h-3.5" />} label="Account Holder" value={emp.account_holder_name} />
                        </div>

                        {/* Assigned Clients */}
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                          <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/30 mb-3 flex items-center gap-2">
                            <Users className="w-3.5 h-3.5" /> Assigned Clients
                          </h3>
                          {clients.length === 0 ? (
                            <p className="text-xs text-white/20">No clients assigned yet.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {clients.map(c => (
                                <span key={c.id} className="text-xs font-semibold text-violet-300 bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full">
                                  {c.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Quick Stats */}
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                          <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/30 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5" /> Task Overview
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-xl p-3 text-center">
                              <ListTodo className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                              <p className="text-xl font-black text-yellow-400">{activeCount}</p>
                              <p className="text-[9px] text-white/30 uppercase tracking-wider">Active</p>
                            </div>
                            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-3 text-center">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                              <p className="text-xl font-black text-emerald-400">{completedCount}</p>
                              <p className="text-[9px] text-white/30 uppercase tracking-wider">Done</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {emp.notes && (
                        <div className="mt-5 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                          <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/30 mb-2">Admin Notes</h3>
                          <p className="text-sm text-white/60 leading-relaxed">{emp.notes}</p>
                        </div>
                      )}

                      {/* Recent Tasks */}
                      {recentTasks.length > 0 && (
                        <div className="mt-5 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                          <h3 className="text-[10px] uppercase tracking-wider font-bold text-white/30 mb-3 flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5" /> Recent Tasks
                          </h3>
                          <div className="flex flex-col gap-2">
                            {recentTasks.map(t => (
                              <div key={t.id} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${['completed','approved'].includes(t.status) ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                                  <span className="text-white/70 truncate">{t.title}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-white/25">
                                  {t.client?.name && <span className="text-violet-400/60">{t.client.name}</span>}
                                  {t.payment_amount > 0 && <span className="text-emerald-500/70 font-semibold">₹{Number(t.payment_amount).toLocaleString('en-IN')}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="mt-5 flex items-center justify-between">
                        <a
                          href="/dashboard/analytics"
                          className="flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/20 px-3.5 py-2 rounded-xl transition-all"
                        >
                          <BarChart2 className="w-3.5 h-3.5" /> View Full Analytics
                          <ExternalLink className="w-3 h-3 opacity-60" />
                        </a>
                        <button
                          onClick={() => setSelectedEmployee(null)}
                          className="text-xs text-white/30 hover:text-white/60 transition-colors"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ── InfoRow helper ──────────────────────────────────────────────────────────
function InfoRow({
  icon, label, value, href, copyable
}: {
  icon: React.ReactNode
  label: string
  value?: string | null
  href?: string
  copyable?: boolean
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="text-white/25 mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] uppercase tracking-wider font-bold text-white/20 mb-0.5">{label}</p>
        {value ? (
          href ? (
            <a href={href} className="text-xs text-white/70 hover:text-white transition-colors truncate block">{value}</a>
          ) : copyable ? (
            <button onClick={handleCopy} className="text-xs text-white/70 hover:text-white transition-colors text-left truncate w-full">
              {copied ? <span className="text-emerald-400">Copied!</span> : value}
            </button>
          ) : (
            <p className="text-xs text-white/70 truncate">{value}</p>
          )
        ) : (
          <p className="text-xs text-white/20 italic">Not provided</p>
        )}
      </div>
    </div>
  )
}
