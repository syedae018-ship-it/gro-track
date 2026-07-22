import { createClient } from "@/lib/supabase/server"
import { sendPushNotification } from "@/lib/firebase/admin"

type NotificationCategory = "tasks" | "payments" | "attendance" | "announcements" | "system"
type NotificationType = "info" | "success" | "warning" | "alert"

interface SendNotificationParams {
  userId: string
  title: string
  message: string
  category: NotificationCategory
  link?: string
  type?: NotificationType
}

/**
 * Centrally dispatches a notification:
 * 1. Inserts the notification record into the Supabase database.
 * 2. Fetches registered FCM device tokens for the user.
 * 3. Triggers Firebase push alerts for background/lock-screen delivery.
 */
export async function sendNotification({
  userId,
  title,
  message,
  category,
  link = "/dashboard/notifications",
  type = "info"
}: SendNotificationParams) {
  const supabase = await createClient()

  try {
    console.log(`\n[NotificationService] Invoked!`);
    console.log(`  - User ID: ${userId}`);
    console.log(`  - Target Link: ${link}`);
    console.log(`  - Notification Payload: { title: "${title}", message: "${message}", category: "${category}" }`);

    // 1. Insert into database
    const { data: dbNotif, error: dbErr } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        title: title,
        message: message,
        category: category,
        link: link,
        type: type,
        is_read: false
      })
      .select("id")
      .single()

    if (dbErr) {
      console.error("[NotificationService] Database insertion error:", dbErr.message)
    } else {
      console.log(`  - Database notification record: Created (ID: ${dbNotif.id})`);
    }

    // 2. Fetch active FCM tokens for the recipient
    const { data: tokenRecords, error: tokenErr } = await supabase
      .from("fcm_tokens")
      .select("token")
      .eq("user_id", userId)

    if (tokenErr) {
      console.error("[NotificationService] Fetching device tokens error:", tokenErr.message)
      return
    }

    const tokens = tokenRecords?.map(r => r.token).filter(Boolean) || []
    console.log(`  - FCM Tokens Found: ${tokens.length}`);

    // 3. Trigger background push alert via FCM
    if (tokens.length > 0) {
      console.log(`  - Chrome notification request: Initiating push to ${tokens.length} devices...`)
      // Run async to avoid blocking server action thread
      sendPushNotification(tokens, {
        id: dbNotif?.id,
        title: title,
        body: message,
        link: link,
        category: category
      }).then(() => {
        console.log(`  - Chrome notification request: Dispatched successfully.`);
      }).catch(err => {
        console.error("[NotificationService] Background push dispatch failed:", err)
      })
    } else {
      console.log(`  - Chrome notification request: Skipped (No registered device tokens for user ${userId}).`)
    }
  } catch (error) {
    console.error("[Notification Service] Error dispatching notification:", error)
  }
}


/* =========================================================
   SEMANTIC NOTIFICATION EVENTS
========================================================= */

export async function notifyTaskAssigned(taskId: string, assigneeId: string, assignerName: string) {
  const supabase = await createClient()
  const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single()
  
  if (task) {
    await sendNotification({
      userId: assigneeId,
      title: "New Task Assigned 🎯",
      message: `${assignerName} assigned a new task to you: "${task.title}"`,
      category: "tasks",
      link: `/dashboard/tasks`,
      type: "info"
    })
  }
}

export async function notifyTaskReassigned(taskId: string, newAssigneeId: string, assignerName: string) {
  const supabase = await createClient()
  const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single()
  
  if (task) {
    await sendNotification({
      userId: newAssigneeId,
      title: "Task Reassigned To You 🔄",
      message: `${assignerName} reassigned task: "${task.title}" to you.`,
      category: "tasks",
      link: `/dashboard/tasks`,
      type: "warning"
    })
  }
}

export async function notifyTaskCompleted(taskId: string, completerId: string, ownerId: string, completerName: string) {
  const supabase = await createClient()
  const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single()
  
  if (task && ownerId !== completerId) {
    await sendNotification({
      userId: ownerId,
      title: "Task Completed & Pending Review 🚀",
      message: `${completerName} completed task: "${task.title}".`,
      category: "tasks",
      link: "/dashboard/tasks",
      type: "success"
    })
  }
}

export async function notifyTaskApproved(taskId: string, assigneeId: string, approverName: string) {
  const supabase = await createClient()
  const { data: task } = await supabase.from("tasks").select("title").eq("id", taskId).single()
  
  if (task) {
    await sendNotification({
      userId: assigneeId,
      title: "Task Approved ✅",
      message: `Your task "${task.title}" was approved by ${approverName}.`,
      category: "tasks",
      link: "/dashboard/tasks",
      type: "success"
    })
  }
}

/* =========================================================
   REMINDER ENGINE
========================================================= */

export async function scheduleTaskReminders(
  taskId: string, 
  customTimings: number[] = [], 
  manualReminders: { reminder_time: string, note?: string }[] = []
) {
  const supabase = await createClient()

  // 1. Fetch Task
  const { data: task, error: taskErr } = await supabase
    .from("tasks")
    .select("id, assigned_to, deadline, use_global_settings, title")
    .eq("id", taskId)
    .single()

  if (taskErr || !task || !task.deadline) return

  const deadlineDate = new Date(task.deadline)
  if (deadlineDate <= new Date()) return // Deadline is in the past, no point scheduling future reminders

  let timings = customTimings
  let atDeadline = true

  // 2. Read Notification Defaults if global settings are used
  if (task.use_global_settings) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("notification_settings")
      .eq("id", task.assigned_to)
      .single()

    const settings = profile?.notification_settings || {}
    // The prompt specified typical defaults if none provided: 5, 10, 15, 30, 60, 120
    const dbTimings = settings.default_reminder_timings 
    timings = Array.isArray(dbTimings) && dbTimings.length > 0 
      ? dbTimings 
      : [5, 10, 15, 30, 60, 120] 

    if (settings.deadline_notifications_enabled !== undefined) {
      atDeadline = settings.deadline_notifications_enabled
    }
  }

  // Deduplicate and filter timings
  const uniqueAutoTimings = Array.from(new Set(timings))
  const reminderRows: any[] = []

  // 3. Generate Reminder Schedule (Automatic Intervals)
  for (const minsBefore of uniqueAutoTimings) {
    const rTime = new Date(deadlineDate.getTime() - minsBefore * 60000)
    if (rTime > new Date()) {
      reminderRows.push({
        owner_id: task.assigned_to,
        task_id: task.id,
        reminder_time: rTime.toISOString(),
        type: 'automatic',
        status: 'pending'
      })
    }
  }

  // 4. Generate At-Deadline Reminder
  if (atDeadline && deadlineDate > new Date()) {
    reminderRows.push({
      owner_id: task.assigned_to,
      task_id: task.id,
      reminder_time: deadlineDate.toISOString(),
      type: 'automatic',
      status: 'pending',
      note: `The deadline for "${task.title}" has arrived.`
    })
  }

  // 5. Custom Manual Reminders
  const uniqueManualTimes = new Set()
  for (const reminderObj of manualReminders) {
    const rTime = typeof reminderObj === 'string' ? reminderObj : reminderObj.reminder_time
    const rNote = typeof reminderObj === 'string' ? null : reminderObj.note
    if (rTime && new Date(rTime) > new Date() && !uniqueManualTimes.has(rTime)) {
      uniqueManualTimes.add(rTime)
      reminderRows.push({
        owner_id: task.assigned_to,
        task_id: task.id,
        reminder_time: new Date(rTime).toISOString(),
        type: 'manual',
        status: 'pending',
        note: rNote || null
      })
    }
  }

  // 6. Store Reminder Jobs
  if (reminderRows.length > 0) {
    const { error: rErr } = await supabase.from('task_reminders').insert(reminderRows)
    if (rErr) {
      console.error("[Notification Service] Failed to schedule reminders:", rErr.message)
    } else {
      console.log(`[Notification Service] Scheduled ${reminderRows.length} reminders for task ${taskId}`)
    }
  }
}

export async function cancelTaskReminders(taskId: string) {
  const supabase = await createClient()
  await supabase
    .from('task_reminders')
    .update({ status: 'cancelled' })
    .eq('task_id', taskId)
    .eq('status', 'pending')
}

export async function rescheduleTaskReminders(
  taskId: string, 
  customTimings: number[] = [], 
  manualReminders: { reminder_time: string, note?: string }[] = []
) {
  await cancelTaskReminders(taskId)
  await scheduleTaskReminders(taskId, customTimings, manualReminders)
}
