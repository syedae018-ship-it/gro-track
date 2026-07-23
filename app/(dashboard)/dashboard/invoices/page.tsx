import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options"
import { createClient } from "@/lib/supabase/server"
import { InvoicesClient } from "./InvoicesClient"

export default async function InvoicesPage() {
  const supabase = await createClient();
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
    const userId = user?.id

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      employee:profiles(id, full_name),
      payment:payments(period_start, period_end, total_amount)
    `)
    .eq('created_by', userId)
    .order('generated_at', { ascending: false })

  return <InvoicesClient initialInvoices={invoices || []} />
}
