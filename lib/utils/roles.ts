export type UserRole = 'employee' | 'admin_ops' | 'admin_finance' | 'managing_director' | 'admin'

// We treat all admin tiers as full identical admins now to simplify workflow
export const ADMIN_ROLES: UserRole[] = ['admin_ops', 'admin_finance', 'managing_director', 'admin']

export function isAdmin(role: string | undefined): boolean {
  return ADMIN_ROLES.includes(role as UserRole)
}

export function getRole(user: any): string {
  return user?.user_metadata?.role || 'employee'
}

export const TASK_STATUSES = [
  { id: 'todo', label: 'To Do', color: 'text-slate-400', bg: 'bg-slate-500/20' },
  { id: 'in_progress', label: 'In Progress', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  { id: 'review', label: 'Review', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  { id: 'completed', label: 'Completed', color: 'text-green-400', bg: 'bg-green-500/20' },
  { id: 'approved', label: 'Approved', color: 'text-purple-400', bg: 'bg-purple-500/20' },
]

export const PRIORITY_CONFIG = {
  high: { label: 'High', color: 'text-red-400', bg: 'bg-red-500/20 border-red-500/30' },
  medium: { label: 'Medium', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' },
  low: { label: 'Low', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/30' },
}
