"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createClientAction(formData: FormData) {
  const supabase = await createClient()
  
  const name = formData.get('name') as string
  const industry = formData.get('industry') as string
  const contact_email = formData.get('contact_email') as string
  const status = formData.get('status') as string

  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  
  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase.from('clients').insert({
    created_by: user.id,
    name,
    industry,
    contact_email,
    status: status || 'active'
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/clients')
  return { success: true }
}
