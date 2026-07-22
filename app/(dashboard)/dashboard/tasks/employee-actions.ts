'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendNotification } from '@/lib/notifications/service'
import { sendGoogleChatWebhook } from '@/lib/notifications/google'
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"

/** Employee starts working on a task — records start timestamp */
export async function startTaskTimer(taskId: string) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return { error: 'Not authenticated' }

  // Only update fields that definitely exist in schema
  const { error } = await supabase
    .from('tasks')
    .update({ status: 'in_progress' })
    .eq('id', taskId)
    .eq('assigned_to', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/tasks')
  return { success: true, startedAt: new Date().toISOString() }
}

/** Update employee attendance status and manage attendance_logs */
export async function updateAttendanceStatus(
  newStatus: 'checked_in' | 'break' | 'checked_out',
  title?: string,
  message?: string
) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return { error: 'Not authenticated' }

  const emoji = newStatus === 'checked_in' ? '🟢' : newStatus === 'break' ? '☕' : '🔴'
  const logAction = newStatus === 'checked_in' ? 'check_in' : newStatus === 'break' ? 'break' : 'check_out'

  try {
    // 1. Update Profile status
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({
        current_status: newStatus,
        status_emoji: emoji,
        last_active: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileErr) throw profileErr

    // 2. Log work session in attendance_logs
    if (newStatus === 'checked_in') {
      // Prevent overlapping active sessions by closing any existing unclosed logs
      const { data: activeLogs } = await supabase
        .from('attendance_logs')
        .select('id, check_in')
        .eq('employee_id', user.id)
        .is('check_out', null)

      if (activeLogs && activeLogs.length > 0) {
        const now = new Date()
        for (const activeLog of activeLogs) {
          const durationMins = Math.round((now.getTime() - new Date(activeLog.check_in).getTime()) / 60000)
          await supabase
            .from('attendance_logs')
            .update({ check_out: now.toISOString(), duration_minutes: durationMins })
            .eq('id', activeLog.id)
        }
      }

      const { error: logErr } = await supabase.from('attendance_logs').insert({
        employee_id: user.id,
        check_in: new Date().toISOString(),
      })
      if (logErr) throw logErr
    } else if (newStatus === 'checked_out' || newStatus === 'break') {
      // Close active log
      const { data: activeLogs, error: findErr } = await supabase
        .from('attendance_logs')
        .select('id, check_in')
        .eq('employee_id', user.id)
        .is('check_out', null)
        .order('check_in', { ascending: false })

      if (findErr) throw findErr

      if (activeLogs && activeLogs.length > 0) {
        const checkOutTime = new Date()
        for (const activeLog of activeLogs) {
          const checkInTime = new Date(activeLog.check_in)
          const durationMins = Math.max(0, Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000))

          const { error: updateErr } = await supabase
            .from('attendance_logs')
            .update({
              check_out: checkOutTime.toISOString(),
              duration_minutes: durationMins,
            })
            .eq('id', activeLog.id)

          if (updateErr) throw updateErr
        }
      }
    }

    // 3. Insert Activity Log
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      owner_id: user.id,
      action: logAction,
      entity_type: 'attendance',
      details: { timestamp: new Date().toISOString(), platform: 'PWA' }
    })

    // 4. Create Notification
    if (title) {
      await supabase.from('notifications').insert({
        user_id: user.id,
        title,
        message,
        type: newStatus === 'checked_in' ? 'success' : 'info',
        link: '/dashboard/overview'
      })
    }

    revalidatePath('/dashboard/overview')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Failed to update attendance' }
  }
}

/** Employee marks task complete */
export async function employeeCompleteTask(
  taskId: string,
  delivery_link: string,
  notes: string,
  localStartedAt?: string
) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()
  const updateData: Record<string, any> = {
    status: 'completed',
    delivery_link: delivery_link || null,
    notes: notes || null,
  }

  // completed_at exists in schema (set by trigger, but we set explicitly too)
  updateData.completed_at = now

  // Fetch payment details and creator to notify
  const { data: task } = await supabase
    .from('tasks')
    .select('title, payment_amount, client_id, created_by')
    .eq('id', taskId)
    .maybeSingle()

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('assigned_to', user.id)

  if (error) return { error: error.message }

  const { cancelTaskReminders, notifyTaskCompleted } = await import('@/lib/notifications/service')

  // Cancel all pending reminders for this task
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

  await sendGoogleChatWebhook(`✅ *Task Completed*\n${user.user_metadata?.full_name || 'An employee'} completed task: *${task?.title || taskId}*`)

  // Track pending earnings dynamically
  if (task && task.payment_amount > 0) {
    const today = new Date().toISOString().split('T')[0]
    const paymentRecord: Record<string, any> = {
      employee_id: user.id,
      period_start: today,
      period_end: today,
      total_amount: task.payment_amount,
      tasks_included: [taskId],
      status: 'pending',
    }
    if (task.client_id) paymentRecord.client_id = task.client_id
    await supabase.from('payments').insert(paymentRecord)
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true, completedAt: now }
}

/** Employee creates their own task (self-assigned) */
export async function employeeCreateTask(formData: {
  title: string
  client_id?: string
  custom_client_name?: string
  task_pay_type?: string
  task_rate?: string
  hours_worked?: string
  status: 'todo' | 'completed'
  deadline?: string
  use_global_settings?: boolean
  deadline_notifications_enabled?: boolean
  automatic_reminder_timings?: number[]
  manual_reminders?: { reminder_time: string; note?: string }[]
}) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()
  const isCompleted = formData.status === 'completed'

  const taskRate = formData.task_rate ? parseFloat(formData.task_rate) : 0;
  const hoursWorked = formData.hours_worked ? parseFloat(formData.hours_worked) : 0;
  const taskPayType = formData.task_pay_type || 'per_task';
  const calculatedPayment = taskPayType === 'hourly' ? taskRate * hoursWorked : taskRate;

  const insertData: Record<string, any> = {
    title: formData.title.trim(),
    type: 'general',
    assigned_to: user.id,
    assigned_by: user.id,
    priority: 'medium',
    task_pay_type: taskPayType,
    task_rate: taskRate,
    hours_worked: hoursWorked,
    payment_amount: calculatedPayment,
    status: isCompleted ? 'completed' : 'todo',
    use_global_settings: formData.use_global_settings ?? true,
    deadline_notifications_enabled: formData.use_global_settings ? null : (formData.deadline_notifications_enabled || false),
    automatic_reminder_timings: formData.use_global_settings ? null : (formData.automatic_reminder_timings || [])
  }

  // Link to DB client (affects revenue tracking) OR store custom name (display only)
  if (formData.client_id) insertData.client_id = formData.client_id
  if (formData.custom_client_name) insertData.custom_client_name = formData.custom_client_name
  if (formData.deadline) insertData.deadline = formData.deadline
  if (isCompleted) insertData.completed_at = now

  let { data: newTask, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select('id')
    .single()

  // Graceful fallback if the business_spec_upgrade migration hasn't been applied to the database yet
  if (error && error.code === 'PGRST204') {
    delete insertData.task_pay_type;
    delete insertData.task_rate;
    delete insertData.hours_worked;
    
    const fallbackResult = await supabase
      .from('tasks')
      .insert(insertData)
      .select('id')
      .single()
      
    newTask = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) return { error: error.message }
  
  if (!newTask?.id) return { error: 'Task creation failed' }

  const { scheduleTaskReminders } = await import('@/lib/notifications/service')
  
  await scheduleTaskReminders(newTask.id, formData.automatic_reminder_timings || [], formData.manual_reminders || [])

  // Automatically add to pending earnings tracking if completed immediately
  if (isCompleted && insertData.payment_amount > 0 && newTask?.id) {
    const today = new Date().toISOString().split('T')[0]
    const paymentRecord: Record<string, any> = {
      employee_id: user.id,
      period_start: today,
      period_end: today,
      total_amount: insertData.payment_amount,
      tasks_included: [newTask.id],
      status: 'pending',
    }
    if (formData.client_id) paymentRecord.client_id = formData.client_id
    await supabase.from('payments').insert(paymentRecord)
    
    await sendGoogleChatWebhook(`✅ *Task Completed*\n${user.user_metadata?.full_name || 'An employee'} completed task: *${insertData.title}*`)
  } else {
    await sendGoogleChatWebhook(`📝 *Task Created*\n${user.user_metadata?.full_name || 'An employee'} created a new task: *${insertData.title}*`)
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true, taskId: newTask?.id }
}

/** Fetch clients list for autocomplete */
export async function fetchClientSuggestions(query: string) {
  const supabase = await createClient()
  if (!query.trim()) return []
  const { data } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(5)
  return data || []
}


// --- REMINDERS MANAGEMENT ACTIONS ---

export async function fetchTaskReminders(taskId: string) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return { error: 'Not authenticated' }

  // Check user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdminUser = profile && ['admin_ops', 'admin_finance', 'managing_director'].includes(profile.role)

  let query = supabase
    .from('task_reminders')
    .select('id, reminder_time, type, status, note, owner_id, profiles ( full_name )')
    .eq('task_id', taskId)

  if (!isAdminUser) {
    query = query.eq('owner_id', user.id)
  }

  const { data, error } = await query.order('reminder_time', { ascending: true })

  if (error) return { error: error.message }
  return { reminders: data }
}

export async function addTaskReminder(
  taskId: string, 
  reminderTime: string, 
  type: 'automatic' | 'manual' = 'manual', 
  note?: string,
  ownerId?: string
) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return { error: 'Not authenticated' }

  // Check user role to see if they can assign reminders to others
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdminUser = profile && ['admin_ops', 'admin_finance', 'managing_director'].includes(profile.role)
  const targetOwnerId = (isAdminUser && ownerId) ? ownerId : user.id

  const { data, error } = await supabase
    .from('task_reminders')
    .insert({
      task_id: taskId,
      owner_id: targetOwnerId,
      reminder_time: reminderTime,
      type: type,
      status: 'pending',
      note: note || null
    })
    .select('id, reminder_time, type, status, note, owner_id, profiles ( full_name )')
    .single()

  if (error) return { error: error.message }
  return { reminder: data }
}

export async function deleteTaskReminder(reminderId: string) {
  const supabase = await createClient()
  const session = await getServerSession(authOptions)
  const user = session?.user as any
  if (!user) return { error: 'Not authenticated' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdminUser = profile && ['admin_ops', 'admin_finance', 'managing_director'].includes(profile.role)

  let query = supabase
    .from('task_reminders')
    .delete()
    .eq('id', reminderId)

  if (!isAdminUser) {
    query = query.eq('owner_id', user.id)
  }

  const { error } = await query

  if (error) return { error: error.message }
  return { success: true }
}
