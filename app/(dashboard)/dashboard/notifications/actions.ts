"use server"

import { createClient } from "@/lib/supabase/server"
import { isAdmin } from "@/lib/utils/roles"
import { sendNotification } from "@/lib/notifications/service"
import { revalidatePath } from "next/cache"

/**
 * Registers / upserts an FCM device token in the database for the active user session.
 */
export async function registerFCMToken(token: string, deviceType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("fcm_tokens")
    .upsert(
      {
        user_id: user.id,
        owner_id: user.id,
        token: token,
        device_type: deviceType,
        last_active: new Date().toISOString(),
      },
      { onConflict: "token" }
    )

  if (error) {
    console.error("[Actions] Error registering FCM token:", error.message)
    return { error: error.message }
  }

  console.log("[Actions] Token saved successfully to database:", token.substring(0, 15) + "...")
  return { success: true }
}


/**
 * Unregisters / deletes an FCM token (e.g., when the user logs out or disables notifications).
 */
export async function unregisterFCMToken(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  const { error } = await supabase
    .from("fcm_tokens")
    .delete()
    .eq("token", token)
    .eq("user_id", user.id)

  if (error) {
    console.error("[Actions] Error deleting FCM token:", error.message)
    return { error: error.message }
  }

  return { success: true }
}

/**
 * Fetches all registered active employees (for Admin Broadcast selector).
 */
export async function getEmployeesList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("is_active", true)
    .order("full_name")

  return data || []
}

/**
 * Sends a broadcast push notification to a set of employees. (Admins only)
 */
export async function sendAdminNotification(
  employeeIds: string[],
  title: string,
  message: string,
  category: "tasks" | "payments" | "attendance" | "announcements" | "system",
  link: string
) {
  const supabase = await createClient()
  
  // 1. Authenticate sender and verify admin roles
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!senderProfile || !isAdmin(senderProfile.role)) {
    return { error: "Unauthorized. Admin permissions required." }
  }

  // 2. Insert notifications and trigger FCM pushes
  const promises = employeeIds.map(empId =>
    sendNotification({
      userId: empId,
      title: title.trim(),
      message: message.trim(),
      category: category,
      link: link || "/dashboard/notifications",
      type: category === "announcements" ? "info" : "info"
    })
  )

  await Promise.all(promises)

  revalidatePath("/dashboard/notifications")
  return { success: true }
}

/**
 * Fetches the notifications delivery log (for admin view).
 */
export async function getNotificationLogs() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (!senderProfile || !isAdmin(senderProfile.role)) {
    return []
  }

  // Load notifications, including target user name
  const { data } = await supabase
    .from("notifications")
    .select(`
      id,
      title,
      message,
      category,
      created_at,
      recipient:profiles!notifications_user_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false })
    .limit(40)

  return data || []
}

/**
 * Sends a test push notification to a specific FCM token (for debugging / diagnostics).
 * Available to any logged-in user to test their own device.
 */
export async function sendTestPushAction(
  token: string,
  category: "tasks" | "payments" | "attendance" | "announcements" | "system" = "system",
  type: "info" | "success" | "warning" | "alert" = "info",
  customTitle?: string,
  customBody?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: "Not authenticated" }

  // Verify that the token belongs to the user, OR if they are an admin.
  const { data: tokenRecord, error: fetchError } = await supabase
    .from("fcm_tokens")
    .select("user_id")
    .eq("token", token)
    .maybeSingle()

  if (fetchError) {
    console.error("[Actions] Error fetching token from DB:", fetchError.message)
  } else {
    console.log("[Actions] Token fetch success. Record found:", !!tokenRecord)
  }

  let isAuthorized = false
  if (tokenRecord && tokenRecord.user_id === user.id) {
    isAuthorized = true
  } else {
    // Check if the user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    if (profile && isAdmin(profile.role)) {
      isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return { error: "Unauthorized. You can only send test pushes to your own registered devices." }
  }

  const finalTitle = customTitle || `GroTrack ${category.toUpperCase()} Test ⚡`
  const finalBody = customBody || `This is a test notification of type "${type}" for the ${category} category.`

  // Call the central sendNotification service so it inserts into database (triggering Realtime toast) AND sends the FCM payload
  await sendNotification({
    userId: user.id,
    title: finalTitle,
    message: finalBody,
    category,
    type,
    link: "/dashboard/notifications"
  })

  // Still call sendPushNotification directly to return the FCM SDK delivery output logs to the diagnostic UI
  const { sendPushNotification } = await import("@/lib/firebase/admin")
  const result = await sendPushNotification([token], {
    title: finalTitle,
    body: finalBody,
    link: "/dashboard/notifications",
    category
  })

  return {
    success: true,
    mode: result?.mode,
    payload: result?.payload,
    response: result?.response
  }
}


