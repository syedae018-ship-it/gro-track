"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateProfile(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const full_name = (formData.get("full_name") as string)?.trim()
  const phone = (formData.get("phone") as string)?.trim() || null
  const email = (formData.get("email") as string)?.trim() || null
  const specialization = (formData.get("specialization") as string)?.trim() || null
  const upi_id = (formData.get("upi_id") as string)?.trim() || null
  const bank_name = (formData.get("bank_name") as string)?.trim() || null
  const account_holder_name = (formData.get("account_holder_name") as string)?.trim() || null
  const payment_method = (formData.get("payment_method") as string) || null
  const notes = (formData.get("notes") as string)?.trim() || null

  if (!full_name) return { error: "Full name is required" }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      phone,
      email,
      specialization,
      upi_id,
      bank_name,
      account_holder_name,
      payment_method,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard", "layout")
  return { success: true }
}

export async function uploadAvatar(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const file = formData.get("avatar") as File
  if (!file || !file.size) return { error: "No file provided" }

  // Validate
  const allowed = ["image/jpeg", "image/png", "image/webp"]
  if (!allowed.includes(file.type)) return { error: "Only JPG, PNG, and WEBP files are supported" }
  if (file.size > 2 * 1024 * 1024) return { error: "File must be under 2MB" }

  const ext = file.name.split(".").pop()
  const path = `${user.id}/avatar.${ext}`



  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type })

  if (uploadError) return { error: uploadError.message }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from("avatars")
    .getPublicUrl(path)

  // Bust cache with timestamp
  const avatarUrl = `${publicUrl}?t=${Date.now()}`

  const { error: dbError } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id)

  if (dbError) return { error: dbError.message }

  revalidatePath("/dashboard", "layout")
  return { success: true, avatarUrl }
}

export async function removeAvatar() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  // Also try to delete the file from storage
  const extensions = ["jpg", "jpeg", "png", "webp"]
  for (const ext of extensions) {
    await supabase.storage.from("avatars").remove([`${user.id}/avatar.${ext}`])
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: null })
    .eq("id", user.id)

  if (error) return { error: error.message }

  revalidatePath("/dashboard", "layout")
  return { success: true }
}
