"use server"

import { createClient } from "@/lib/supabase/server"

export async function requestPayout(taskIds: string[], totalAmount: number) {
  const supabase = createClient()
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

  // TODO: Send Email (Resend or similar) - We will just log for now to avoid hard crash without API keys
  console.log(`Email Sent: Payout Request from ${user.email} for $${totalAmount}`)

  return { success: true, payoutId: payout.id }
}

export async function markPayoutAsReceived(payoutId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: "Not authenticated" }

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

  return { success: true }
}
