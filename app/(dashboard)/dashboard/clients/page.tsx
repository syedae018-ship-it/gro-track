import { createClient } from "@/lib/supabase/server"
import { ClientModal } from "@/components/dashboard/ClientModal"
import { Briefcase, Mail, CheckCircle2, ListTodo, Users, ArrowRight } from "lucide-react"
import Link from "next/link"

export default async function ClientsPage() {
  const supabase = await createClient()
  
  // Fetch clients with related tasks to calculate metrics dynamically
  const { data: clients } = await supabase
    .from('clients')
    .select(`
      *,
      tasks(id, status, payment_amount, assigned_to)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-syne font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted mt-1">Manage agency clients, track revenue, and view performance.</p>
        </div>
        <ClientModal />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients?.length === 0 && (
          <div className="col-span-full p-12 text-center text-muted border border-border rounded-2xl bg-muted border-dashed">
            No clients found. Click "Add Client" to get started.
          </div>
        )}
        {clients?.map((client) => {
          const completedTasks = client.tasks?.filter((t: any) => t.status === 'completed' || t.status === 'approved') || []
          const activeTasks = client.tasks?.filter((t: any) => !['completed', 'approved'].includes(t.status)) || []
          const revenue = completedTasks.reduce((sum: number, t: any) => sum + Number(t.payment_amount || 0), 0)
          const uniqueEmployees = new Set(client.tasks?.map((t: any) => t.assigned_to).filter(Boolean)).size

          return (
            <Link key={client.id} href={`/dashboard/clients/${client.id}`} className="block">
              <div className="bg-card border border-border rounded-2xl p-6 hover:border-violet-500/30 transition-all group relative overflow-hidden h-full flex flex-col hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-bl-full -z-10 group-hover:bg-violet-500/10 transition-colors" />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-border flex items-center justify-center text-xl font-syne font-bold text-foreground shadow-lg">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold ${
                    client.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                    client.status === 'on_hold' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                    'bg-muted text-muted-foreground border border-border'
                  }`}>
                    {client.status.replace('_', ' ')}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-1">{client.name}</h3>
                
                <div className="flex items-center gap-2 text-xs text-muted mb-4">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{client.industry || 'General Industry'}</span>
                  <span className="mx-1">•</span>
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{client.contact_email || 'No email'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
                  <div className="bg-muted border border-border rounded-xl p-3">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      <ListTodo className="w-3 h-3 text-yellow-400" /> Active Tasks
                    </span>
                    <span className="text-lg font-bold text-foreground">{activeTasks.length}</span>
                  </div>
                  <div className="bg-muted border border-border rounded-xl p-3">
                    <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Completed
                    </span>
                    <span className="text-lg font-bold text-foreground">{completedTasks.length}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-500/70 mb-0.5">Total Revenue</span>
                    <span className="text-lg font-black text-emerald-400">₹{revenue.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-violet-400/70 mb-0.5 flex items-center gap-1">
                      <Users className="w-3 h-3" /> Team
                    </span>
                    <span className="text-sm font-bold text-violet-300">{uniqueEmployees} Assigned</span>
                  </div>
                </div>
                
                <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
