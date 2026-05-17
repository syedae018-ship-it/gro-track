import { SupabaseClient } from '@supabase/supabase-js'

export async function seedDemoData(supabase: SupabaseClient, userId: string) {
  // Check if already seeded
  const { count } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', userId)

  if (count && count > 0) {
    return // Already seeded
  }

  console.log("Seeding demo data for new user...")

  // 1. Seed Clients
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .insert([
      { created_by: userId, name: 'Nike Creative', industry: 'Retail/Fashion', contact_email: 'marketing@nike.demo', status: 'active', total_billed: 125000 },
      { created_by: userId, name: 'Zara Social Media', industry: 'Fashion', contact_email: 'social@zara.demo', status: 'active', total_billed: 45000 },
      { created_by: userId, name: 'Tesla Promo Edit', industry: 'Automotive', contact_email: 'creative@tesla.demo', status: 'on_hold', total_billed: 250000 },
      { created_by: userId, name: 'Spotify Brand Reel', industry: 'Technology', contact_email: 'brand@spotify.demo', status: 'completed', total_billed: 89000 }
    ])
    .select()

  if (clientsError || !clients) {
    console.error("Failed to seed clients", clientsError)
    return
  }

  // 2. Seed Projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .insert([
      { created_by: userId, client_id: clients[0].id, name: 'Summer Campaign 2026', status: 'active', progress: 65, start_date: '2026-05-01', end_date: '2026-08-01' },
      { created_by: userId, client_id: clients[1].id, name: 'Q3 TikTok Strategy', status: 'planning', progress: 10, start_date: '2026-07-01', end_date: '2026-09-30' },
      { created_by: userId, client_id: clients[2].id, name: 'Model Y Promo Video', status: 'paused', progress: 40, start_date: '2026-04-01', end_date: '2026-06-01' },
      { created_by: userId, client_id: clients[3].id, name: 'Year in Review 2025 Animation', status: 'completed', progress: 100, start_date: '2025-11-01', end_date: '2025-12-15' }
    ])
    .select()

  if (projectsError || !projects) {
    console.error("Failed to seed projects", projectsError)
    return
  }

  // 3. Seed Tasks
  const { error: tasksError } = await supabase
    .from('tasks')
    .insert([
      { created_by: userId, project_id: projects[0].id, client_id: clients[0].id, assigned_to: userId, title: 'Storyboarding Summer Ad', type: 'Design', deadline: '2026-05-15', priority: 'high', status: 'in_progress', payment_amount: 5000 },
      { created_by: userId, project_id: projects[0].id, client_id: clients[0].id, assigned_to: userId, title: 'Motion Graphics Setup', type: 'Video', deadline: '2026-05-20', priority: 'medium', status: 'todo', payment_amount: 3000 },
      { created_by: userId, project_id: projects[1].id, client_id: clients[1].id, assigned_to: userId, title: 'Influencer Outreach', type: 'Marketing', deadline: '2026-06-01', priority: 'high', status: 'todo', payment_amount: 2000 },
      { created_by: userId, project_id: projects[2].id, client_id: clients[2].id, assigned_to: userId, title: 'Drone Footage Review', type: 'Video', deadline: '2026-05-01', priority: 'medium', status: 'review', payment_amount: 1500 },
      { created_by: userId, project_id: projects[3].id, client_id: clients[3].id, assigned_to: userId, title: 'Final Export & Delivery', type: 'Delivery', deadline: '2025-12-10', priority: 'low', status: 'completed', payment_amount: 10000 }
    ])

  if (tasksError) console.error("Failed to seed tasks", tasksError)

  // 4. Seed Payments
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .insert([
      { created_by: userId, client_id: clients[0].id, employee_id: userId, period_start: '2026-04-01', period_end: '2026-04-30', total_amount: 12500, status: 'paid', paid_at: new Date().toISOString() },
      { created_by: userId, client_id: clients[1].id, employee_id: userId, period_start: '2026-05-01', period_end: '2026-05-31', total_amount: 8000, status: 'pending' },
      { created_by: userId, client_id: clients[3].id, employee_id: userId, period_start: '2025-12-01', period_end: '2025-12-31', total_amount: 25000, status: 'paid', paid_at: '2025-12-15T10:00:00Z' }
    ])
    .select()

  if (paymentsError || !payments) {
    console.error("Failed to seed payments", paymentsError)
    return
  }

  // 5. Seed Invoices
  const { error: invoicesError } = await supabase
    .from('invoices')
    .insert([
      { created_by: userId, payment_id: payments[0].id, client_id: clients[0].id, invoice_number: 'INV-2026-001', amount: 12500, status: 'paid' },
      { created_by: userId, payment_id: payments[1].id, client_id: clients[1].id, invoice_number: 'INV-2026-002', amount: 8000, status: 'sent' },
      { created_by: userId, payment_id: payments[2].id, client_id: clients[3].id, invoice_number: 'INV-2025-099', amount: 25000, status: 'paid' }
    ])

  if (invoicesError) console.error("Failed to seed invoices", invoicesError)

  // 6. Seed Activity Logs
  await supabase.from('activity_logs').insert([
    { created_by: userId, user_id: userId, action: 'Workspace Created', entity_type: 'System', details: { message: 'Welcome to AgencyOS!' } },
    { created_by: userId, user_id: userId, action: 'Client Added', entity_type: 'Client', entity_id: clients[0].id, details: { client_name: 'Nike Creative' } }
  ])

  console.log("Demo data seeded successfully.")
}
