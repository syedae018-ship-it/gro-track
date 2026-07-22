import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"
import { sendNotification } from "@/lib/notifications/service"

export async function GET(request: Request) {
  // 1. Validate Cron Secret
  const { searchParams } = new URL(request.url)
  const authHeader = request.headers.get("Authorization")
  const cronSecret = process.env.CRON_SECRET
  
  const token = authHeader ? authHeader.replace("Bearer ", "") : searchParams.get("token")

  if (cronSecret && token !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[Cron] WARNING: SUPABASE_SERVICE_ROLE_KEY is missing. RLS policies may filter out tasks.")
  }

  // Create a client with the service role key to bypass RLS and fetch all tasks
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  })

  const now = new Date()
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()

  // 2. Fetch pending tasks with approaching deadlines
  const { data: tasks, error } = await supabase
    .from("tasks")
    .select("id, title, deadline, assigned_to, deadline_notified, status")
    .not("deadline", "is", null)
    .not("assigned_to", "is", null)
    .neq("status", "completed")
    .neq("status", "approved")
    .or(`deadline_notified.is.null,deadline_notified.eq.false`)
    .lte("deadline", twentyFourHoursFromNow)

  if (error) {
    console.error("[Cron] Error fetching tasks:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ success: true, message: "No tasks require notification." })
  }

  console.log(`[Cron] Found ${tasks.length} tasks needing deadline notifications.`)

  let successCount = 0

  for (const task of tasks) {
    const taskDeadline = new Date(task.deadline)
    const isOverdue = taskDeadline < now
    
    const title = isOverdue ? "Task Overdue ⚠️" : "Deadline Approaching ⏰"
    const message = isOverdue
      ? `The task "${task.title}" is overdue (Deadline was ${taskDeadline.toLocaleDateString()}).`
      : `The task "${task.title}" is due in less than 24 hours (${taskDeadline.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}).`

    try {
      // Send notification using our notification service
      await sendNotification({
        userId: task.assigned_to,
        title,
        message,
        category: "tasks",
        link: "/dashboard/tasks",
        type: isOverdue ? "alert" : "warning"
      })

      // Mark as notified in database
      const { error: updateErr } = await supabase
        .from("tasks")
        .update({ deadline_notified: true })
        .eq("id", task.id)

      if (updateErr) {
        console.error(`[Cron] Failed to update deadline_notified for task ${task.id}:`, updateErr.message)
      } else {
        successCount++
      }
    } catch (err) {
      console.error(`[Cron] Failed to send notification for task ${task.id}:`, err)
    }
  }

  return NextResponse.json({
    success: true,
    processed: tasks.length,
    notified: successCount
  })
}
