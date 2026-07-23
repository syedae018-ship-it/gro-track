"use server"

import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { revalidatePath } from "next/cache"
import { isAdmin } from "@/lib/utils/roles"

// Helper to secure admin actions and bypass RLS for allowed_users
async function getAdminClient() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as any)?.role
  
  if (!session || !isAdmin(role)) {
    throw new Error("Unauthorized: Admin access required")
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getAllowedUsers() {
  try {
    const supabase = await getAdminClient()
    const { data, error } = await supabase
    .from("allowed_users")
    .select("*")
    .order("created_at", { ascending: false })
  
  if (error) {
    console.error("Error fetching allowed users:", error)
    return []
  }
  return data
  } catch (error) {
    console.error("Auth error in getAllowedUsers:", error)
    return []
  }
}

export async function addAllowedUser(formData: FormData) {
  const email = formData.get("email")?.toString().trim()
  const full_name = formData.get("full_name")?.toString().trim()
  const role = formData.get("role")?.toString().trim()
  const designation = formData.get("designation")?.toString().trim()

  if (!email || !full_name || !role) {
    return { success: false, error: "Missing required fields" }
  }

  // Convert 'admin' to 'managing_director' to bypass constraint mismatch
  const mappedRole = role === 'admin' ? 'managing_director' : role;

  try {
    const supabase = await getAdminClient()
    
    const { error } = await supabase.from("allowed_users").insert({
    email,
    full_name,
    role: mappedRole,
    designation,
    status: 'active'
  })

  if (error) {
    console.error("Error adding allowed user:", error)
    if (error.code === '23505') {
      return { success: false, error: "Email already exists in allowlist" }
    }
    return { success: false, error: "Failed to add user" }
  }

  revalidatePath("/dashboard/access")
  return { success: true }
  } catch (err: any) {
    console.error("Auth error in addAllowedUser:", err)
    return { success: false, error: err.message || "Failed to add user" }
  }
}

export async function updateAllowedUserStatus(id: string, status: 'active' | 'inactive') {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
    .from("allowed_users")
    .update({ status })
    .eq("id", id)

  if (error) {
    console.error("Error updating user status:", error)
    return { success: false, error: "Failed to update status" }
  }

  revalidatePath("/dashboard/access")
  return { success: true }
  } catch (err: any) {
    console.error("Auth error in updateAllowedUserStatus:", err)
    return { success: false, error: err.message || "Failed to update status" }
  }
}

export async function updateAllowedUserRole(id: string, role: string) {
  try {
    const supabase = await getAdminClient()
    
    // Convert 'admin' to 'managing_director' to bypass constraint mismatch
  const mappedRole = role === 'admin' ? 'managing_director' : role;

  // Get the email for this allowed_user
  const { data: userData } = await supabase.from("allowed_users").select("email").eq("id", id).single()

  const { error } = await supabase
    .from("allowed_users")
    .update({ role: mappedRole })
    .eq("id", id)

  if (error) {
    console.error("Error updating user role:", error)
    return { success: false, error: "Failed to update role" }
  }

  // Sync role to profiles table (if the profile exists) to maintain single source of truth
  if (userData?.email) {
    await supabase.from("profiles").update({ role: mappedRole }).eq("email", userData.email)
  }

  revalidatePath("/dashboard/access")
  return { success: true }
  } catch (err: any) {
    console.error("Auth error in updateAllowedUserRole:", err)
    return { success: false, error: err.message || "Failed to update role" }
  }
}

export async function removeAllowedUser(id: string) {
  try {
    const supabase = await getAdminClient()
    const { error } = await supabase
    .from("allowed_users")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error removing user:", error)
    return { success: false, error: "Failed to remove user" }
  }

  revalidatePath("/dashboard/access")
  return { success: true }
  } catch (err: any) {
    console.error("Auth error in removeAllowedUser:", err)
    return { success: false, error: err.message || "Failed to remove user" }
  }
}
