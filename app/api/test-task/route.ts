import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scheduleTaskReminders } from '@/lib/notifications/service';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET() {
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  if (!users || users.length === 0) return NextResponse.json({ error: 'No users found' });
  const userId = users[0].id;

  const deadline = new Date(Date.now() + 5 * 60000).toISOString(); // 5 minutes from now

  const { data: task, error } = await supabase.from('tasks').insert({
    title: 'E2E Test Task 5m Deadline',
    type: 'general',
    assigned_to: userId,
    assigned_by: userId,
    created_by: userId,
    priority: 'medium',
    payment_amount: 0,
    deadline: deadline,
    status: 'todo',
    use_global_settings: false,
    deadline_notifications_enabled: true,
    automatic_reminder_timings: [5] // 5 minutes before (which is exactly NOW!)
  }).select().single();

  if (error) return NextResponse.json({ error: error.message });

  console.log("Task created:", task.id);
  console.log("Scheduled Deadline:", deadline);

  // Note: Since scheduleTaskReminders uses createClient() from @/lib/supabase/server which relies on cookies(),
  // calling it from an API route without cookies might throw an error if it expects an authenticated user. 
  // Let's do a direct insert to bypass Next.js auth context just for the test.
  const rTime = new Date(Date.now()).toISOString(); // 5 mins before 5 mins from now = NOW
  const { data: reminder, error: rErr } = await supabase.from('task_reminders').insert({
    owner_id: userId,
    task_id: task.id,
    reminder_time: rTime,
    type: 'automatic',
    status: 'pending',
    note: 'E2E Test Reminder generated'
  }).select().single();

  if (rErr) return NextResponse.json({ error: rErr.message });

  console.log("Reminder job created:", reminder.id, "at", rTime);

  return NextResponse.json({ success: true, taskId: task.id, reminderId: reminder.id, user: userId });
}
