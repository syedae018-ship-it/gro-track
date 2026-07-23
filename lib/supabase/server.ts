import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options'

export async function createClient() {
  const session = await getServerSession(authOptions)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${
          (session as any)?.supabaseAccessToken || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        }`,
      },
    },
  })

  return supabase
}
