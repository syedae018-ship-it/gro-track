import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendNotification } from '@/lib/notifications/service';

// Use the service role key to bypass RLS in cron job
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
  // Simple auth for cron (can be enhanced with a secret header)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const now = new Date().toISOString();

    // Fetch ALL pending reminders to manually evaluate and log "skipped" vs "triggered"
    const { data: reminders, error: fetchError } = await supabase
      .from('task_reminders')
      .select('id, owner_id, task_id, type, reminder_time, note, tasks ( title, deadline )')
      .eq('status', 'pending')
      .order('reminder_time', { ascending: true })
      .limit(100);

    if (fetchError) {
      console.error('[Scheduler] Error fetching reminders:', fetchError.message);
      return new NextResponse('Internal Server Error', { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
      console.log(`[Scheduler] ${now} | Pending: 0 | Checked: 0 | Triggered: 0 | Skipped: 0`);
      return NextResponse.json({ message: 'No pending reminders found', processed: 0 });
    }

    const triggeredIds: string[] = [];
    const skippedIds: string[] = [];
    const checkedIds = reminders.map(r => r.id);

    // Process each reminder
    for (const reminder of reminders) {
      const scheduledTime = new Date(reminder.reminder_time);
      const currentTime = new Date(now);
      const diffSecs = Math.round((currentTime.getTime() - scheduledTime.getTime()) / 1000);

      // Trigger condition: scheduled time is in the past or exactly now
      if (diffSecs >= 0) {
        triggeredIds.push(reminder.id);
        console.log(`[Scheduler] Reminder triggered!`);
        console.log(`  - Task ID: ${reminder.task_id}`);
        console.log(`  - Reminder ID: ${reminder.id}`);
        console.log(`  - Current timestamp: ${now}`);
        console.log(`  - Scheduled timestamp: ${reminder.reminder_time}`);
        console.log(`  - Difference in seconds: ${diffSecs}s (past due)`);

        const taskData: any = Array.isArray(reminder.tasks) ? reminder.tasks[0] : reminder.tasks;
        const taskTitle = taskData?.title || 'Unknown Task';
        
        let message = `Reminder: "${taskTitle}" is due soon.`;
        if (reminder.type === 'manual') {
          message = `Manual reminder for task: "${taskTitle}".`;
        } else if (taskData?.deadline) {
          // Calculate remaining time relative to deadline
          const deadlineDate = new Date(taskData.deadline);
          const deadlineDiffMs = deadlineDate.getTime() - currentTime.getTime();
          const diffHrs = Math.round(deadlineDiffMs / 3600000);
          const diffMins = Math.round(deadlineDiffMs / 60000);
          
          if (diffHrs > 0) {
            message = `Deadline in ${diffHrs} hour(s) for task: "${taskTitle}".`;
          } else if (diffMins > 0) {
            message = `Deadline in ${diffMins} minute(s) for task: "${taskTitle}".`;
          } else {
            message = `Deadline reached for task: "${taskTitle}".`;
          }
        }

        if (reminder.note) {
          message += ` Note: ${reminder.note}`;
        }

        await sendNotification({
          userId: reminder.owner_id,
          title: 'Task Reminder ⏰',
          message: message,
          category: 'tasks',
          link: `/dashboard/tasks?taskId=${reminder.task_id}`,
          type: 'warning'
        });
      } else {
        skippedIds.push(reminder.id);
        console.log(`[Scheduler] Reminder skipped. ID: ${reminder.id} | Reason: Not due yet (due in ${Math.abs(diffSecs)} seconds).`);
      }
    }

    // Log the summary for this minute
    console.log(`[Scheduler] Execution Summary | Time: ${now}`);
    console.log(`  - Pending count (fetched): ${reminders.length}`);
    console.log(`  - Checked IDs: ${checkedIds.length > 0 ? checkedIds.join(', ') : 'None'}`);
    console.log(`  - Triggered IDs: ${triggeredIds.length > 0 ? triggeredIds.join(', ') : 'None'}`);
    console.log(`  - Skipped IDs: ${skippedIds.length > 0 ? skippedIds.join(', ') : 'None'}`);

    // Mark triggered as sent
    if (triggeredIds.length > 0) {
      const { error: updateError } = await supabase
        .from('task_reminders')
        .update({ status: 'sent' })
        .in('id', triggeredIds);

      if (updateError) {
        console.error('[Scheduler] Error updating reminders status to "sent":', updateError.message);
      } else {
        console.log(`[Scheduler] Successfully marked ${triggeredIds.length} reminders as delivered in DB.`);
      }
    }

    return NextResponse.json({ message: 'Reminders processed', processed: triggeredIds.length });

  } catch (error: any) {
    console.error('Cron job error:', error.message);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
