export default function DemoDashboardPage() {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      <div>
        <h1 className="text-3xl font-syne font-bold text-foreground">Overview</h1>
        <p className="text-muted text-sm mt-1">
          This is a read-only guest demo. Explore the UI without modifying production data.
        </p>
      </div>

      {/* Mock Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-xl border border-border bg-muted flex flex-col gap-2">
          <span className="text-sm text-secondary uppercase tracking-wider">Total Revenue</span>
          <span className="text-3xl font-bold text-foreground">$45,231.00</span>
          <span className="text-xs text-green-400">↑ +12.5% this month</span>
        </div>
        <div className="p-6 rounded-xl border border-border bg-muted flex flex-col gap-2">
          <span className="text-sm text-secondary uppercase tracking-wider">Active Tasks</span>
          <span className="text-3xl font-bold text-foreground">12</span>
          <span className="text-xs text-yellow-400">3 due today</span>
        </div>
        <div className="p-6 rounded-xl border border-border bg-muted flex flex-col gap-2">
          <span className="text-sm text-secondary uppercase tracking-wider">Pending Invoices</span>
          <span className="text-3xl font-bold text-foreground">4</span>
          <span className="text-xs text-red-400">$12,000 outstanding</span>
        </div>
      </div>

      {/* Mock Recent Tasks */}
      <div className="mt-4">
        <h2 className="text-xl font-bold text-foreground mb-4">Recent Tasks</h2>
        <div className="flex flex-col gap-3">
          {["Design Mockups for Acme Co.", "SEO Audit Report – Phase 1", "Social Media Calendar Q3"].map((task, i) => (
            <div key={i} className="p-4 rounded-lg border border-border bg-muted flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-foreground font-medium">{task}</span>
                <span className="text-xs text-muted">Due in {i + 2} days</span>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                i === 0 ? 'bg-primary/20 text-primary' : 
                i === 1 ? 'bg-yellow-500/20 text-yellow-400' : 
                'bg-green-500/20 text-green-400'
              }`}>
                {i === 0 ? 'In Progress' : i === 1 ? 'In Review' : 'Done'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
