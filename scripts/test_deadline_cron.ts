import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Read env variables manually
const envPath = path.resolve(__dirname, '../.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const parts = line.split('=')
  if (parts.length >= 2) {
    const key = parts[0].trim()
    let val = parts.slice(1).join('=').trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1)
    }
    env[key] = val
  }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const supabaseAnonKey = env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testCron() {
  console.log('--- STARTING TASK DEADLINE CRON LOGIC TEST ---')

  // 1. Fetch a test user from profiles
  const { data: profiles, error: profileErr } = await supabase
    .from('profiles')
    .select('id, full_name')
    .limit(1)

  if (profileErr || !profiles || profiles.length === 0) {
    console.error('Could not find any user profiles to assign test task to:', profileErr?.message)
    return
  }

  const testUser = profiles[0]
  console.log(`Using test profile: ${testUser.full_name} (${testUser.id})`)

  // 2. Insert a dummy task with an overdue deadline and deadline_notified = false
  const overdueDeadline = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  
  console.log('Inserting dummy task with overdue deadline...')
  const { data: task, error: taskErr } = await supabase
    .from('tasks')
    .insert({
      title: 'Cron Test Overdue Task',
      task_type: 'general',
      assigned_to: testUser.id,
      assigned_by: testUser.id,
      owner_id: testUser.id,
      deadline: overdueDeadline,
      status: 'todo',
      priority: 'high',
      deadline_notified: false
    })
    .select('id, title, deadline, assigned_to, deadline_notified')
    .single()

  if (taskErr || !task) {
    console.error('Failed to create test task. Ensure the column "deadline_notified" was added to the database first:', taskErr?.message)
    return
  }

  console.log('Test task created successfully:', task)

  // 3. Run the cron logic inline (simulating route logic)
  console.log('Running cron logic simulation...')
  const now = new Date()
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  // Fetch approaching tasks
  const { data: tasksToNotify, error: fetchErr } = await supabase
    .from('tasks')
    .select('id, title, deadline, assigned_to, deadline_notified')
    .eq('id', task.id) // Target only our test task
    .not('deadline', 'is', null)
    .not('assigned_to', 'is', null)
    .neq('status', 'completed')
    .neq('status', 'approved')
    .or(`deadline_notified.is.null,deadline_notified.eq.false`)
    .lte('deadline', twentyFourHoursFromNow)

  if (fetchErr) {
    console.error('Failed to fetch tasks during cron run:', fetchErr.message)
    return
  }

  console.log('Tasks matching cron criteria:', tasksToNotify?.length, tasksToNotify)

  if (tasksToNotify && tasksToNotify.length > 0) {
    const targetTask = tasksToNotify[0]
    
    // Simulate sendNotification call (directly insert into notifications table since it's client action equivalent)
    console.log('Creating notification in database...')
    const { data: notif, error: notifErr } = await supabase
      .from('notifications')
      .insert({
        user_id: targetTask.assigned_to,
        title: 'Task Overdue ⚠️',
        message: `The task "${targetTask.title}" is overdue.`,
        category: 'tasks',
        link: '/dashboard/tasks',
        type: 'alert',
        is_read: false
      })
      .select('id')
      .single()

    if (notifErr) {
      console.error('Failed to insert notification:', notifErr.message)
    } else {
      console.log('Notification successfully created in database, ID:', notif.id)
    }

    // Update task's deadline_notified state
    console.log('Updating task deadline_notified to true...')
    const { data: updatedTask, error: updateErr } = await supabase
      .from('tasks')
      .update({ deadline_notified: true })
      .eq('id', targetTask.id)
      .select('id, deadline_notified')
      .single()

    if (updateErr) {
      console.error('Failed to update task deadline_notified state:', updateErr.message)
    } else {
      console.log('Task updated successfully. New state:', updatedTask)
    }
  }

  // 4. Verify Rerun skips it
  console.log('Verifying rerun skips the task...')
  const { data: tasksRerun } = await supabase
    .from('tasks')
    .select('id')
    .eq('id', task.id)
    .eq('deadline_notified', false)

  console.log('Un-notified tasks on rerun (should be 0):', tasksRerun?.length)

  // 5. Cleanup
  console.log('Cleaning up test data...')
  await supabase.from('tasks').delete().eq('id', task.id)
  await supabase.from('notifications').delete().eq('message', `The task "${task.title}" is overdue.`)
  console.log('Cleanup completed.')
}

testCron()
