import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { createClient } from "@/lib/supabase/server"
import { sendGoogleChatWebhook } from "@/lib/notifications/google"

export async function calculatePayroll(employeeId: string, startDate: string, endDate: string) {
  const supabase = await createClient()
  
  // Verify Admin
  const supabase = await createClient();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
    if (!user) return { error: "Not authenticated" }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin_ops', 'admin_finance', 'managing_director'].includes(profile.role)) {
    return { error: "Unauthorized" }
  }

  // Fetch completed tasks for the employee in the date range
  let { data: tasks, error } = await supabase
    .from('tasks')
    .select('id, title, payment_amount, task_pay_type, task_rate, hours_worked, completed_at, status')
    .eq('assigned_to', employeeId)
    .eq('status', 'completed')
    .gte('completed_at', `${startDate}T00:00:00.000Z`)
    .lte('completed_at', `${endDate}T23:59:59.999Z`)

  if (error && error.code === 'PGRST204') {
    // Fallback if the database migration hasn't been applied yet
    const fallback = await supabase
      .from('tasks')
      .select('id, title, payment_amount, completed_at, status')
      .eq('assigned_to', employeeId)
      .eq('status', 'completed')
      .gte('completed_at', `${startDate}T00:00:00.000Z`)
      .lte('completed_at', `${endDate}T23:59:59.999Z`)
      
    tasks = fallback.data;
    error = fallback.error;
  }

  if (error) return { error: error.message }

  if (!tasks || tasks.length === 0) {
    return { totalAmount: 0, tasks: [] }
  }

  // The calculated payment is already stored in payment_amount via task creation,
  // but we can sum it up here for the mixed payment support.
  let totalAmount = 0;
  tasks.forEach(t => {
    totalAmount += parseFloat(t.payment_amount || 0);
  });

  return { totalAmount, tasks }
}

export async function generatePayrollRecord(employeeId: string, startDate: string, endDate: string, taskIds: string[], totalAmount: number) {
  const supabase = await createClient();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
    if (!user) return { error: "Not authenticated" }

  // 1. Create payment/payout record
  const { data: payment, error: pError } = await supabase
    .from('payments')
    .insert({
      employee_id: employeeId,
      period_start: startDate,
      period_end: endDate,
      total_amount: totalAmount,
      tasks_included: taskIds,
      status: 'approved',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    })
    .select('id')
    .single()

  if (pError) return { error: pError.message }

  // 2. Update task payout_status if necessary (assuming payout_status column exists on tasks for linking)
  await supabase
    .from('tasks')
    .update({ payout_status: 'paid' })
    .in('id', taskIds)

  await sendGoogleChatWebhook(`💰 *Payroll Generated*\n${user.user_metadata?.full_name || 'Admin'} generated payroll for employee *${employeeId}* (Total: ₹${totalAmount})`)

  return { success: true, paymentId: payment.id }
}
