import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { ArrowLeft, Briefcase, Mail, CheckCircle2, ListTodo, Users, Clock, Flame } from "lucide-react"
import Link from "next/link"

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
 const supabase = await createClient()
 
 const { data: client } = await supabase
 .from('clients')
 .select(`
 *,
 tasks(
 id, title, status, priority, payment_amount, deadline, created_at, completed_at,
 assigned_to,
 assignee:profiles!tasks_assigned_to_fkey(full_name, avatar_initials)
 )
 `)
 .eq('id', params.id)
 .single()

 if (!client) {
 notFound()
 }

 const tasks = client.tasks || []
 const completedTasks = tasks.filter((t: any) => t.status === 'completed' || t.status === 'approved')
 const activeTasks = tasks.filter((t: any) => !['completed', 'approved'].includes(t.status))
 const revenue = completedTasks.reduce((sum: number, t: any) => sum + Number(t.payment_amount || 0), 0)
 
 const uniqueEmployees = Array.from(new Map(tasks.filter((t: any) => t.assignee).map((t: any) => [t.assigned_to, t.assignee])).values())

 return (
 <div className="flex flex-col gap-6 w-full pb-12">
 {/* Header */}
 <div className="flex flex-col gap-4">
 <Link href="/dashboard/clients" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
 <ArrowLeft className="w-4 h-4" /> Back to Clients
 </Link>
 <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
 <div className="flex items-center gap-4">
 <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-border flex items-center justify-center text-3xl font-syne font-bold text-foreground shadow-xl shadow-violet-500/10">
 {client.name.charAt(0).toUpperCase()}
 </div>
 <div>
 <h1 className="text-3xl font-syne font-bold text-foreground flex items-center gap-3">
 {client.name}
 <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
 client.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
 client.status === 'on_hold' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
 'bg-muted text-muted-foreground border border-border'
 }`}>
 {client.status.replace('_', ' ')}
 </span>
 </h1>
 <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
 <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {client.industry || 'General Industry'}</span>
 <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {client.contact_email || 'No email provided'}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Stats Grid */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
 <div className="bg-card border border-emerald-500/20 rounded-2xl p-5 relative overflow-hidden">
 <div className="absolute inset-0 bg-emerald-500/5" />
 <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500/70 mb-1 block relative">Total Revenue</span>
 <span className="text-2xl font-black text-emerald-400 relative">₹{revenue.toLocaleString('en-IN')}</span>
 </div>
 <div className="bg-card border border-border rounded-2xl p-5">
 <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
 <ListTodo className="w-3.5 h-3.5 text-yellow-400" /> Active Tasks
 </span>
 <span className="text-2xl font-bold text-foreground">{activeTasks.length}</span>
 </div>
 <div className="bg-card border border-border rounded-2xl p-5">
 <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
 <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed
 </span>
 <span className="text-2xl font-bold text-foreground">{completedTasks.length}</span>
 </div>
 <div className="bg-card border border-border rounded-2xl p-5">
 <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
 <Users className="w-3.5 h-3.5 text-violet-400" /> Team Members
 </span>
 <span className="text-2xl font-bold text-foreground">{uniqueEmployees.length}</span>
 </div>
 </div>

 {/* Two Column Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 
 {/* Main Content: Tasks */}
 <div className="lg:col-span-2 flex flex-col gap-6">
 {/* Active Tasks */}
 <div className="bg-card border border-border rounded-2xl p-6">
 <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm" />
 Active Tasks
 </h2>
 <div className="flex flex-col gap-3">
 {activeTasks.length === 0 ? (
 <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">No active tasks</div>
 ) : (
 activeTasks.map((task: any) => (
 <div key={task.id} className="bg-muted border border-border rounded-xl p-4 flex items-center justify-between">
 <div>
 <h3 className="text-sm font-semibold text-foreground mb-1">{task.title}</h3>
 <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
 {task.assignee ? (
 <span className="flex items-center gap-1 text-violet-300">
 <div className="w-4 h-4 rounded-full bg-violet-500/20 flex items-center justify-center text-[8px]">{task.assignee.full_name.charAt(0)}</div>
 {task.assignee.full_name}
 </span>
 ) : 'Unassigned'}
 {task.deadline && <span className="text-red-400/80 flex items-center gap-1"><Clock className="w-3 h-3" /> Due {new Date(task.deadline).toLocaleDateString()}</span>}
 </div>
 </div>
 {task.payment_amount > 0 && <span className="text-xs font-bold text-emerald-400">₹{task.payment_amount.toLocaleString('en-IN')}</span>}
 </div>
 ))
 )}
 </div>
 </div>

 {/* Completed Tasks */}
 <div className="bg-card border border-border rounded-2xl p-6">
 <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm" />
 Recent Completions
 </h2>
 <div className="flex flex-col gap-3">
 {completedTasks.length === 0 ? (
 <div className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-xl">No completed tasks yet</div>
 ) : (
 completedTasks.slice(0, 10).map((task: any) => (
 <div key={task.id} className="bg-muted border border-border rounded-xl p-4 flex items-center justify-between opacity-80">
 <div>
 <h3 className="text-sm font-semibold text-muted-foreground mb-1 line-through decoration-white/20">{task.title}</h3>
 <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
 {task.assignee && (
 <span className="flex items-center gap-1 text-violet-300/80">
 {task.assignee.full_name}
 </span>
 )}
 {task.completed_at && <span className="flex items-center gap-1 text-emerald-400/80"><CheckCircle2 className="w-3 h-3" /> {new Date(task.completed_at).toLocaleDateString()}</span>}
 </div>
 </div>
 {task.payment_amount > 0 && <span className="text-xs font-bold text-emerald-500">₹{task.payment_amount.toLocaleString('en-IN')}</span>}
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 {/* Sidebar: Team & Info */}
 <div className="flex flex-col gap-6">
 <div className="bg-card border border-border rounded-2xl p-6">
 <h2 className="text-sm font-bold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
 <Users className="w-4 h-4 text-violet-400" /> Assigned Team
 </h2>
 <div className="flex flex-col gap-3">
 {uniqueEmployees.length === 0 ? (
 <div className="text-sm text-muted-foreground">No employees assigned</div>
 ) : (
 uniqueEmployees.map((emp: any, idx: number) => (
 <div key={idx} className="flex items-center gap-3 bg-muted p-2 rounded-xl border border-border">
 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-border flex items-center justify-center text-xs font-bold text-foreground">
 {emp.full_name.charAt(0)}
 </div>
 <span className="text-sm font-medium text-muted-foreground">{emp.full_name}</span>
 </div>
 ))
 )}
 </div>
 </div>
 </div>

 </div>
 </div>
 )
}
