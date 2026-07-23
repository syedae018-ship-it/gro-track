"use server"

import { createClient } from "@supabase/supabase-js"
import { isAdmin } from "@/lib/utils/roles"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper to get a secure admin client and verify the NextAuth session
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"

const getSecureClient = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return { supabase: createClient(supabaseUrl, supabaseServiceKey), user: session.user }
}

export async function fetchProfile(userId: string) {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (user.id !== userId && !isAdmin(user.role)) throw new Error("Unauthorized")

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, specialization, phone, email, upi_id, bank_name, account_holder_name, payment_method, notes, current_status, status_emoji")
    .eq("id", userId)
    .single()
  return data
}

export async function fetchAdminOverview() {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (!isAdmin(user.role)) throw new Error("Unauthorized")

  const [tasksRes, paymentsRes, employeeCountRes, clientCountRes, recentRes] = await Promise.all([
    supabase.from("tasks").select("id, status, payment_amount, deadline, created_at, assigned_to"),
    supabase.from("payments").select("total_amount, status"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "employee").eq("is_active", true),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("tasks")
      .select(`id, title, status, priority, deadline, payment_amount,
        assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url),
        client:clients(id, name)`)
      .order("created_at", { ascending: false })
      .limit(8),
  ])

  const allTasks = tasksRes.data || []
  const allPayments = paymentsRes.data || []
  const now = new Date()

  const overdueTasks = allTasks.filter(t =>
    t.deadline && new Date(t.deadline) < now && !["completed", "approved"].includes(t.status)
  ).length

  const totalRevenue = allPayments.filter(p => p.status === "paid").reduce((a, p) => a + Number(p.total_amount), 0)
  const pendingPayouts = allPayments.filter(p => p.status === "pending").reduce((a, p) => a + Number(p.total_amount), 0)

  const tasksByStatus = {
    todo: allTasks.filter(t => t.status === "todo").length,
    in_progress: allTasks.filter(t => t.status === "in_progress").length,
    review: allTasks.filter(t => t.status === "review").length,
    completed: allTasks.filter(t => t.status === "completed").length,
    approved: allTasks.filter(t => t.status === "approved").length,
  }

  return {
    totalRevenue,
    pendingPayouts,
    activeEmployees: employeeCountRes.count || 0,
    totalClients: clientCountRes.count || 0,
    overdueTasks,
    tasksByStatus,
    recentTasks: recentRes.data || [],
  }
}

export async function fetchEmployeeOverview(userId: string) {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (user.id !== userId && !isAdmin(user.role)) throw new Error("Unauthorized")

  const [tasksRes, paymentsRes, attendanceRes] = await Promise.all([
    supabase.from("tasks")
      .select("id, title, status, priority, deadline, payment_amount, created_at, completed_at, client:clients(id, name)")
      .eq("assigned_to", userId)
      .order("created_at", { ascending: false }),
    supabase.from("payments")
      .select("total_amount, status, created_at")
      .eq("employee_id", userId),
    supabase.from("attendance_logs")
      .select("id, duration_minutes, check_in, check_out")
      .eq("employee_id", userId),
  ])

  const myTasks = tasksRes.data || []
  const myPayments = paymentsRes.data || []
  const myAttendance = attendanceRes.data || []

  const now = new Date()
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7)

  const tasksDoneTotal = myTasks.filter(t => ["completed", "approved"].includes(t.status)).length
  const tasksDoneThisWeek = myTasks.filter(t =>
    ["completed", "approved"].includes(t.status) && t.completed_at && new Date(t.completed_at) >= weekStart
  ).length

  const todayStart = new Date(now); todayStart.setHours(0,0,0,0)
  const tasksDoneToday = myTasks.filter(t =>
    ["completed", "approved"].includes(t.status) && t.completed_at && new Date(t.completed_at) >= todayStart
  ).length

  const overdueTasks = myTasks.filter(t =>
    t.deadline && new Date(t.deadline) < now && !["completed", "approved"].includes(t.status)
  ).length
  const inReview = myTasks.filter(t => t.status === "review").length
  const inProgress = myTasks.filter(t => t.status === "in_progress").length
  const pending = myTasks.filter(t => t.status === "todo").length

  const approvedUnpaidTasks = myTasks.filter(t => t.status === "approved")
  const pendingEarnings = approvedUnpaidTasks.reduce((a, t) => a + Number(t.payment_amount), 0)
  const totalPaid = myPayments.filter(p => p.status === "paid").reduce((a, p) => a + Number(p.total_amount), 0)
  const totalEarnings = totalPaid + pendingEarnings

  const completedWithTime = myTasks.filter(t => t.completed_at && t.created_at)
  const avgTurnaroundHours = completedWithTime.length > 0
    ? completedWithTime.reduce((acc, t) => {
        return acc + (new Date(t.completed_at!).getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60)
      }, 0) / completedWithTime.length
    : null

  const activeTasks = myTasks.filter(t => !["completed", "approved"].includes(t.status))

  return {
    tasksDoneTotal, tasksDoneThisWeek, tasksDoneToday, overdueTasks, inReview, inProgress, pending,
    totalEarnings, totalPaid, pendingEarnings, avgTurnaroundHours, activeTasks,
    attendanceLogs: myAttendance,
  }
}

export async function fetchTasksPage(userId: string, role: string) {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (user.id !== userId && !isAdmin(user.role)) throw new Error("Unauthorized")

  const admin = isAdmin(role)
  const query = supabase.from("tasks")
    .select(`*, client:clients(id, name), assignee:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url)`)
    .order("created_at", { ascending: false })

  const tasksRes = admin ? await query : await query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`)

  const [clientsRes, employeesRes] = admin
    ? await Promise.all([
        supabase.from("clients").select("id, name").order("name"),
        supabase.from("profiles").select("id, full_name").order("full_name"),
      ])
    : [{ data: [] }, { data: [] }]

  return {
    tasks: tasksRes.data || [],
    clients: clientsRes.data || [],
    employees: employeesRes.data || [],
  }
}

export async function fetchAnalyticsData() {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (!isAdmin(user.role)) throw new Error("Unauthorized")

  const [empRes, tasksRes, payoutsRes, attendanceRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, is_active, created_at, avatar_url, current_status, status_emoji").order("full_name"),
    supabase.from("tasks")
      .select("id, assigned_to, status, payment_amount, priority, revision_count, created_at, completed_at, deadline, client:clients(id, name)")
      .order("created_at", { ascending: false }),
    supabase.from("payouts").select("id, employee_id, total_amount, status, requested_at, paid_at").order("requested_at", { ascending: false }),
    supabase.from("attendance_logs").select("employee_id, duration_minutes, check_in"),
  ])
  return {
    employees: empRes.data || [],
    tasks: tasksRes.data || [],
    payouts: payoutsRes.data || [],
    attendance: attendanceRes.data || [],
  }
}

export async function fetchEmployeesData() {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (!isAdmin(user.role)) throw new Error("Unauthorized")

  const [empRes, tasksRes, attendanceRes] = await Promise.all([
    supabase.from("profiles")
      .select("id, full_name, role, is_active, created_at, avatar_url, phone, email, specialization, upi_id, bank_name, account_holder_name, payment_method, notes, current_status, status_emoji")
      .order("full_name"),
    supabase.from("tasks")
      .select("id, assigned_to, status, title, created_at, completed_at, payment_amount, client:clients(id, name)")
      .order("created_at", { ascending: false }),
    supabase.from("attendance_logs")
      .select("employee_id, duration_minutes"),
  ])
  return {
    employees: empRes.data || [],
    tasks: tasksRes.data || [],
    attendance: attendanceRes.data || [],
  }
}

export async function fetchPaymentsData() {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (!isAdmin(user.role)) throw new Error("Unauthorized")

  const { data } = await supabase.from("payouts")
    .select(`id, total_amount, status, requested_at, paid_at, employee_id,
      employee:profiles!payouts_employee_id_fkey(id, full_name, role, avatar_url),
      payout_tasks(task:tasks(id, title, payment_amount, completed_at, client:clients(id, name), custom_client_name))`)
    .order("requested_at", { ascending: false })
  return data || []
}

export async function fetchEarningsData(userId: string) {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (user.id !== userId && !isAdmin(user.role)) throw new Error("Unauthorized")

  const [tasksRes, payoutsRes] = await Promise.all([
    supabase.from("tasks")
      .select("id, title, status, payout_status, payment_amount, completed_at, created_at, updated_at, client:clients!tasks_client_id_fkey(id, name)")
      .eq("assigned_to", userId)
      .in("status", ["completed", "approved"])
      .order("created_at", { ascending: false }),
    supabase.from("payouts")
      .select("id, total_amount, status, requested_at, paid_at, payment_proof_url")
      .eq("employee_id", userId)
      .order("requested_at", { ascending: false }),
  ])
  return { tasks: tasksRes.data || [], payouts: payoutsRes.data || [] }
}

export async function fetchNotifications(userId: string) {
  const { supabase, user } = await getSecureClient()
  // @ts-ignore
  if (user.id !== userId && !isAdmin(user.role)) throw new Error("Unauthorized")

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20)
  return data || []
}
