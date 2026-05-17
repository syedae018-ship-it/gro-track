'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTaskAction(formData: FormData) {
  const supabase = createClient()
  
  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const client_id = formData.get('client_id') as string
  const custom_client_name = formData.get('custom_client_name') as string
  const assigned_to = formData.get('assigned_to') as string
  const priority = formData.get('priority') as string
  const payment_amount = formData.get('payment_amount') as string
  const deadline = formData.get('deadline') as string
  
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('tasks').insert({
    title,
    type,
    client_id: client_id || null,
    custom_client_name: custom_client_name || null,
    assigned_to: assigned_to || null,
    assigned_by: user.id,
    created_by: user.id,
    priority: priority || 'medium',
    payment_amount: payment_amount ? parseFloat(payment_amount) : 0,
    deadline: deadline || null,
    status: 'todo'
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}

export async function updateTaskStatus(taskId: string, newStatus: string) {
  const supabase = createClient()
  const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}

// Called by employees via QuickCompleteModal — moves task to "review"
export async function quickCompleteTask(
  taskId: string,
  delivery_link: string,
  notes: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('tasks')
    .update({
      status: 'completed',
      delivery_link: delivery_link || null,
      notes: notes || null,
      // completed_at is set by the DB trigger when status = 'completed'
    })
    .eq('id', taskId)
    .eq('assigned_to', user.id) // ensure employee can only complete their own tasks

  if (error) return { error: error.message }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}

// Called by admins — approves task and marks payout pending
export async function approveTask(taskId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Fetch the task to get employee and payment amount
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, assigned_to, payment_amount, client_id')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) return { error: 'Task not found' }

  // Mark task as approved
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'approved' })
    .eq('id', taskId)

  if (error) return { error: error.message }

  // If employee and payment amount exist, create/update a pending payment record
  if (task.assigned_to && task.payment_amount > 0) {
    await supabase.from('payments').insert({
      created_by: user.id,
      client_id: task.client_id,
      employee_id: task.assigned_to,
      period_start: new Date().toISOString().split('T')[0],
      period_end: new Date().toISOString().split('T')[0],
      total_amount: task.payment_amount,
      tasks_included: [taskId],
      status: 'pending',
    })
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}
