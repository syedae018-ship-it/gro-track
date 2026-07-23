"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

import { sendNotification } from '@/lib/notifications/service'


export async function createTaskAction(formData: FormData) {
  const supabase = await createClient()
  
  const title = formData.get('title') as string
  const type = formData.get('type') as string
  const client_id = formData.get('client_id') as string
  const custom_client_name = formData.get('custom_client_name') as string
  const assigned_to = formData.get('assigned_to') as string
  const priority = formData.get('priority') as string
  const payment_amount = formData.get('payment_amount') as string
  const deadline = formData.get('deadline') as string
  const use_global_settings = formData.get('use_global_settings') === 'true'
  const deadline_notifications_enabled = formData.get('deadline_notifications_enabled') === 'true'
  const automatic_reminder_timings = formData.get('automatic_reminder_timings') ? JSON.parse(formData.get('automatic_reminder_timings') as string) : []
  const manual_reminders = formData.get('manual_reminders') ? JSON.parse(formData.get('manual_reminders') as string) : []

  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { data: task, error } = await supabase.from('tasks').insert({
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
    status: 'todo',
    use_global_settings,
    deadline_notifications_enabled,
    automatic_reminder_timings
  }).select().single()

  if (error) {
    return { error: error.message }
  }

  const { notifyTaskAssigned, scheduleTaskReminders } = await import('@/lib/notifications/service')

  if (assigned_to) {
    await notifyTaskAssigned(task.id, assigned_to, user.user_metadata?.full_name || 'An Admin')
  }

  await scheduleTaskReminders(task.id, automatic_reminder_timings, manual_reminders)

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}


export async function updateTaskStatus(taskId: string, newStatus: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
  if (error) return { error: error.message }

  const { cancelTaskReminders } = await import('@/lib/notifications/service')

  // Cancel future reminders if task is marked completed or approved
  if (['completed', 'approved'].includes(newStatus)) {
    await cancelTaskReminders(taskId)
  }

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
  const supabase = await createClient();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  
  if (!user) return { error: 'Not authenticated' }

  // Fetch task info to notify creator
  const { data: task } = await supabase
    .from('tasks')
    .select('title, created_by, assigned_to')
    .eq('id', taskId)
    .single()

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

  const { cancelTaskReminders, notifyTaskCompleted } = await import('@/lib/notifications/service')

  // Cancel all pending reminders for this completed task
  await cancelTaskReminders(taskId)

  // Notify creator/admin
  if (task && task.created_by) {
    await notifyTaskCompleted(
      taskId, 
      user.id, 
      task.created_by, 
      user.user_metadata?.full_name || 'An employee'
    )
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}

// Called by admins — approves task and marks payout pending
export async function approveTask(taskId: string) {
  const supabase = await createClient();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
    if (!user) return { error: 'Not authenticated' }

  // Fetch the task to get employee and payment amount
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('id, assigned_to, payment_amount, client_id')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) return { error: 'Task not found' }

  // Fetch task details for name and amount
  const { data: taskDetail } = await supabase
    .from('tasks')
    .select('title, payment_amount')
    .eq('id', taskId)
    .single()

  // Mark task as approved
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'approved' })
    .eq('id', taskId)

  if (error) return { error: error.message }

  const { cancelTaskReminders, notifyTaskApproved } = await import('@/lib/notifications/service')

  // Cancel all pending reminders for this approved task
  await cancelTaskReminders(taskId)

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

    // Notify employee of approval
    await notifyTaskApproved(taskId, task.assigned_to, user.user_metadata?.full_name || 'An Admin')
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}

// Allows editing a task's details and automatically rescheduling its reminder notifications
export async function editTaskAction(taskId: string, formData: FormData) {
  const supabase = await createClient();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
    if (!user) return { error: 'Not authenticated' }

  const title = formData.get('title') as string
  const deadline = formData.get('deadline') as string
  const priority = formData.get('priority') as string
  const assigned_to = formData.get('assigned_to') as string
  const use_global_settings = formData.get('use_global_settings') === 'true'
  const deadline_notifications_enabled = formData.get('deadline_notifications_enabled') === 'true'
  const automatic_reminder_timings = formData.get('automatic_reminder_timings') ? JSON.parse(formData.get('automatic_reminder_timings') as string) : []
  const manual_reminders = formData.get('manual_reminders') ? JSON.parse(formData.get('manual_reminders') as string) : []

  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      title,
      deadline: deadline || null,
      priority: priority || 'medium',
      assigned_to: assigned_to || null,
      use_global_settings,
      deadline_notifications_enabled,
      automatic_reminder_timings
    })
    .eq('id', taskId)

  if (updateError) return { error: updateError.message }

  const { rescheduleTaskReminders } = await import('@/lib/notifications/service')
  
  await rescheduleTaskReminders(taskId, automatic_reminder_timings, manual_reminders)

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}

export async function deleteTaskAction(taskId: string) {
  const supabase = await createClient();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
    if (!user) return { error: 'Not authenticated' }

  // 1. Delete reminders
  const { error: remErr } = await supabase.from('task_reminders').delete().eq('task_id', taskId)
  if (remErr) {
    console.error(`[Delete Task] Failed to delete reminders for task ${taskId}:`, remErr.message)
  }

  // 2. Clear related notifications
  const { error: notifErr } = await supabase.from('notifications').delete().like('link', `%${taskId}%`)
  if (notifErr) {
    console.error(`[Delete Task] Failed to delete notifications for task ${taskId}:`, notifErr.message)
  }

  // 3. Delete task itself
  const { error: taskErr } = await supabase.from('tasks').delete().eq('id', taskId)
  if (taskErr) {
    console.error(`[Delete Task] Failed to delete task ${taskId}:`, taskErr.message)
    return { error: taskErr.message }
  }

  console.log(`[Delete Task] Task ${taskId} successfully deleted.`)

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true }
}
