"use server"

import { createClient } from "@/lib/supabase/server"
import { sendNotification } from "@/lib/notifications/service"

export async function requestPayout(taskIds: string[], totalAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: "Not authenticated" }

  // 1. Create payout record
  const { data: payout, error: payoutError } = await supabase
    .from('payouts')
    .insert({
      employee_id: user.id,
      total_amount: totalAmount,
      status: 'requested',
    })
    .select('id')
    .single()

  if (payoutError) return { error: payoutError.message }

  // 2. Link eligible tasks to the new payout record and update their payout_status
  const payoutTasks = taskIds.map(taskId => ({
    payout_id: payout.id,
    task_id: taskId
  }))

  const { error: ptError } = await supabase
    .from('payout_tasks')
    .insert(payoutTasks)

  if (ptError) {
    // Attempt rollback
    await supabase.from('payouts').delete().eq('id', payout.id)
    return { error: ptError.message }
  }

  // 3. Update tasks payout_status
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ payout_status: 'payout_requested', payout_id: payout.id })
    .in('id', taskIds)
    .eq('assigned_to', user.id)

  if (updateError) return { error: updateError.message }

  // Create notification for the employee
  await sendNotification({
    userId: user.id,
    title: 'Payout Request Submitted 💸',
    message: `Your request for ₹${totalAmount} has been sent for approval.`,
    category: 'payments',
    link: '/dashboard/earnings',
    type: 'info'
  })

  // Create notifications for all admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['managing_director', 'admin_finance', 'admin_ops'])

  if (admins && admins.length > 0) {
    const promises = admins.map(adm => 
      sendNotification({
        userId: adm.id,
        title: 'New Payout Request 💰',
        message: `${user.user_metadata?.full_name || 'An employee'} requested a payout of ₹${totalAmount}.`,
        category: 'payments',
        link: '/dashboard/payments',
        type: 'info'
      })
    )
    await Promise.all(promises)
  }

  // TODO: Send Email (Resend or similar) - We will just log for now to avoid hard crash without API keys
  console.log(`Email Sent: Payout Request from ${user.email} for $${totalAmount}`)

  return { success: true, payoutId: payout.id }
}

export async function markPayoutAsReceived(payoutId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: "Not authenticated" }

  // Fetch payout details for notifications
  const { data: payout } = await supabase
    .from('payouts')
    .select('total_amount')
    .eq('id', payoutId)
    .single()

  const amount = payout?.total_amount || 0

  // 1. Update payout status
  const { error: payoutError } = await supabase
    .from('payouts')
    .update({ status: 'paid', paid_at: new Date().toISOString(), payment_proof_url: null })
    .eq('id', payoutId)
    .eq('employee_id', user.id)

  if (payoutError) return { error: payoutError.message }

  // 2. Update linked tasks
  const { error: taskError } = await supabase
    .from('tasks')
    .update({ payout_status: 'paid' })
    .eq('payout_id', payoutId)
    .eq('assigned_to', user.id)

  if (taskError) return { error: taskError.message }

  // Notify employee
  await sendNotification({
    userId: user.id,
    title: 'Payout Confirmed Received! 🎉',
    message: `You marked your payout of ₹${amount} as received.`,
    category: 'payments',
    link: '/dashboard/earnings',
    type: 'success'
  })

  // Notify admins
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['managing_director', 'admin_finance', 'admin_ops'])

  if (admins && admins.length > 0) {
    const promises = admins.map(adm => 
      sendNotification({
        userId: adm.id,
        title: 'Payout Confirmed Received 🤝',
        message: `${user.user_metadata?.full_name || 'An employee'} confirmed receipt of ₹${amount}.`,
        category: 'payments',
        link: '/dashboard/payments',
        type: 'success'
      })
    )
    await Promise.all(promises)
  }

  return { success: true }
}

