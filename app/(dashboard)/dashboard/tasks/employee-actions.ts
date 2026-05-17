'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Employee starts working on a task — records start timestamp */
export async function startTaskTimer(taskId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
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

/** Employee marks task complete */
export async function employeeCompleteTask(
  taskId: string,
  delivery_link: string,
  notes: string,
  localStartedAt?: string
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()
  const updateData: Record<string, any> = {
    status: 'completed',
    delivery_link: delivery_link || null,
    notes: notes || null,
  }

  // completed_at exists in schema (set by trigger, but we set explicitly too)
  updateData.completed_at = now

  // Fetch payment amount and client ID to track earnings
  const { data: task } = await supabase
    .from('tasks')
    .select('payment_amount, client_id')
    .eq('id', taskId)
    .maybeSingle()

  const { error } = await supabase
    .from('tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('assigned_to', user.id)

  if (error) return { error: error.message }

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
  payment_amount: string
  status: 'todo' | 'completed'
  deadline?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const now = new Date().toISOString()
  const isCompleted = formData.status === 'completed'

  const insertData: Record<string, any> = {
    title: formData.title.trim(),
    type: 'general',
    assigned_to: user.id,
    assigned_by: user.id,
    priority: 'medium',
    payment_amount: formData.payment_amount ? parseFloat(formData.payment_amount) : 0,
    status: isCompleted ? 'completed' : 'todo',
  }

  // Link to DB client (affects revenue tracking) OR store custom name (display only)
  if (formData.client_id) insertData.client_id = formData.client_id
  if (formData.custom_client_name) insertData.custom_client_name = formData.custom_client_name
  if (formData.deadline) insertData.deadline = formData.deadline
  if (isCompleted) insertData.completed_at = now

  const { data: newTask, error } = await supabase
    .from('tasks')
    .insert(insertData)
    .select('id')
    .single()

  if (error) return { error: error.message }

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
  }

  revalidatePath('/dashboard/tasks')
  revalidatePath('/dashboard/overview')
  return { success: true, taskId: newTask?.id }
}

/** Fetch clients list for autocomplete */
export async function fetchClientSuggestions(query: string) {
  const supabase = createClient()
  if (!query.trim()) return []
  const { data } = await supabase
    .from('clients')
    .select('id, name')
    .ilike('name', `%${query}%`)
    .limit(5)
  return data || []
}
