"use client"

import { useState } from "react"
import { InvoiceBuilder } from "@/components/invoices/InvoiceBuilder"
import { Plus } from "lucide-react"

export function InvoicesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices)
  const [showBuilder, setShowBuilder] = useState(false)

  const handleSaveInvoice = (newInvoice: any) => {
    // In a real app we'd push this to the DB and get the ID back.
    // For now we do an optimistic update.
    setInvoices([
      {
        id: `inv-${Date.now()}`,
        invoice_number: `INV-${Math.floor(Math.random() * 10000)}`,
        employee: { full_name: newInvoice.clientName },
        payment: { total_amount: newInvoice.total },
        generated_at: newInvoice.date,
        pdf_url: null,
      },
      ...invoices
    ])
    setShowBuilder(false)
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-syne font-bold text-foreground">Invoices</h1>
        <button 
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold shadow hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>
      
      <div className="w-full overflow-hidden rounded-xl border border-border bg-muted">
        <table className="w-full text-left text-sm text-secondary">
          <thead className="bg-muted text-xs uppercase border-b border-border">
            <tr>
              <th className="px-6 py-4 font-medium text-foreground">Invoice #</th>
              <th className="px-6 py-4 font-medium text-foreground">Client/Employee</th>
              <th className="px-6 py-4 font-medium text-foreground">Amount</th>
              <th className="px-6 py-4 font-medium text-foreground">Generated At</th>
              <th className="px-6 py-4 font-medium text-foreground">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {invoices?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted">No invoices found.</td>
              </tr>
            )}
            {invoices?.map((invoice: any) => (
              <tr key={invoice.id} className="hover:bg-muted transition-colors">
                <td className="px-6 py-4 font-medium text-foreground">{invoice.invoice_number}</td>
                <td className="px-6 py-4">{invoice.employee?.full_name || 'Unknown'}</td>
                <td className="px-6 py-4">₹{invoice.payment?.total_amount?.toLocaleString() || '0'}</td>
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

      {showBuilder && (
        <InvoiceBuilder onClose={() => setShowBuilder(false)} onSave={handleSaveInvoice} />
      )}
    </div>
  )
}
