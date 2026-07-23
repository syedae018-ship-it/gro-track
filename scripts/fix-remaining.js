const fs = require('fs');

function replaceInFile(filePath, search, replace) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(search)) {
    content = content.replace(search, replace);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', filePath);
  }
}

// 1. app/api/workspace/sync/route.ts
replaceInFile(
  'app/api/workspace/sync/route.ts',
  `    const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();`,
  `    const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }`
);

// 2. app/api/cron/process-reminders/route.ts
replaceInFile(
  'app/api/cron/process-reminders/route.ts',
  'const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const session = { user };',
  'const supabase = await createClient();'
);

// 3. app/(dashboard)/dashboard/notifications/page.tsx
replaceInFile(
  'app/(dashboard)/dashboard/notifications/page.tsx',
  'const profilesRes = await supabase.from(\'profiles\').select(\'id, full_name, email, role\').in(\'id\', uniqueSenderIds)\n        const profilesMap = (profilesRes.data || []).reduce((acc: any, prof) => {',
  'const profilesRes = await supabase.from(\'profiles\').select(\'id, full_name, email, role\').in(\'id\', uniqueSenderIds)\n        const profilesMap = (profilesRes.data || []).reduce((acc: any, prof: any) => {'
);
replaceInFile(
  'app/(dashboard)/dashboard/notifications/page.tsx',
  'default_reminder_timings: settings.default_reminder_timings.filter(t => t !== timeToRemove)',
  'default_reminder_timings: settings.default_reminder_timings.filter((t: number) => t !== timeToRemove)'
);
replaceInFile(
  'app/(dashboard)/dashboard/notifications/page.tsx',
  'const [settings, setSettings] = useState({ deadline_notifications_enabled: false, default_reminder_timings: [] })',
  'const [settings, setSettings] = useState<{ deadline_notifications_enabled: boolean, default_reminder_timings: number[] }>({ deadline_notifications_enabled: false, default_reminder_timings: [] })'
);

// 4. app/(dashboard)/actions/dashboard-data.ts
replaceInFile(
  'app/(dashboard)/actions/dashboard-data.ts',
  'const supabase = await createClient();\n  const { data: { user } } = await supabase.auth.getUser();\n  const session = { user };',
  ''
);

// 5. app/(dashboard)/dashboard/clients/actions.ts
replaceInFile(
  'app/(dashboard)/dashboard/clients/actions.ts',
  `export async function addClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };
  const supabase = await createClient()`,
  `export async function addClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };`
);

// 6. app/(dashboard)/dashboard/notifications/actions.ts
replaceInFile(
  'app/(dashboard)/dashboard/notifications/actions.ts',
  `export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };
  const supabase = await createClient()`,
  `export async function updateNotificationSettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };`
);

// 7. app/(dashboard)/dashboard/payments/admin-actions.ts
replaceInFile(
  'app/(dashboard)/dashboard/payments/admin-actions.ts',
  `export async function processPayment(paymentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };
  const supabase = await createClient()`,
  `export async function processPayment(paymentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };`
);

replaceInFile(
  'app/(dashboard)/dashboard/payments/admin-actions.ts',
  'const { data: tasks } = await supabase.from(\'tasks\')\n      .select(\'id, title, payment_amount, completed_at, status\')',
  'const { data: tasks } = await supabase.from(\'tasks\')\n      .select(\'id, title, payment_amount, task_pay_type, task_rate, hours_worked, completed_at, status\')'
);

// 8. app/(dashboard)/dashboard/tasks/actions.ts
replaceInFile(
  'app/(dashboard)/dashboard/tasks/actions.ts',
  `export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };
  const supabase = await createClient()`,
  `export async function createTask(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const session = { user };`
);

// 9. streak-actions.ts
replaceInFile(
  'app/(dashboard)/dashboard/tasks/streak-actions.ts',
  'const streak = calculateStreak(Array.from(completedDaysSet));',
  'const streak = calculateStreak([...completedDaysSet]);'
);
