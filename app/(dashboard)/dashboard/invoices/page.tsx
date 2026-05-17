import { createClient } from "@/lib/supabase/server"

export default async function InvoicesPage() {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
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

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-syne font-bold text-foreground">Invoices</h1>
      </div>
      
      <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-left text-sm text-secondary">
          <thead className="bg-white/5 text-xs uppercase border-b border-white/10">
            <tr>
              <th className="px-6 py-4 font-medium text-white">Invoice #</th>
              <th className="px-6 py-4 font-medium text-white">Employee</th>
              <th className="px-6 py-4 font-medium text-white">Amount</th>
              <th className="px-6 py-4 font-medium text-white">Generated At</th>
              <th className="px-6 py-4 font-medium text-white">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {invoices?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted">No invoices found.</td>
              </tr>
            )}
            {invoices?.map((invoice) => (
              <tr key={invoice.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{invoice.invoice_number}</td>
                <td className="px-6 py-4">{invoice.employee?.full_name || 'Unknown'}</td>
                <td className="px-6 py-4">${invoice.payment?.total_amount?.toLocaleString() || '0'}</td>
                <td className="px-6 py-4">{new Date(invoice.generated_at).toLocaleDateString()}</td>
                <td className="px-6 py-4">
                  {invoice.pdf_url ? (
                    <a href={invoice.pdf_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      View PDF
                    </a>
                  ) : (
                    <span className="text-muted">Not generated</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
