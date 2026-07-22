"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { X, Plus, Trash2, Loader2, FileText, Send } from "lucide-react"

interface LineItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

interface InvoiceBuilderProps {
  onClose: () => void
  onSave: (invoice: any) => void
}

export function InvoiceBuilder({ onClose, onSave }: InvoiceBuilderProps) {
  const [clientName, setClientName] = useState("")
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, rate: 0, amount: 0 }])
  const [discount, setDiscount] = useState(0)
  const [tax, setTax] = useState(0)
  const [notes, setNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    if (field === "quantity" || field === "rate") {
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].rate || 0)
    }
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, rate: 0, amount: 0 }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((acc, item) => acc + item.amount, 0)
  const discountAmount = subtotal * (discount / 100)
  const taxAmount = (subtotal - discountAmount) * (tax / 100)
  const total = subtotal - discountAmount + taxAmount

  const handleSave = async (status: 'draft' | 'sent') => {
    if (!clientName) return alert("Client Name is required")
    if (items.some(i => !i.description)) return alert("All items must have a description")
    
    setIsSaving(true)
    try {
      // In a real implementation we would call a server action here to insert into 'invoices' table
      // and generate the PDF using @react-pdf/renderer
      await new Promise(r => setTimeout(r, 1000)) // mock delay
      
      const invoiceData = {
        clientName,
        items,
        discount,
        tax,
        subtotal,
        total,
        notes,
        status,
        date: new Date().toISOString()
      }
      onSave(invoiceData)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-muted/80 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ y: 32, opacity: 0, scale: 0.975 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 32, opacity: 0, scale: 0.975 }}
        className="bg-card border border-border rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
              <FileText className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Create Invoice</h2>
              <p className="text-xs text-muted-foreground">Build professional invoices for clients.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:bg-muted p-2 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Client Details</label>
              <input 
                type="text" 
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Client Name or Company" 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Line Items</label>
            <div className="border border-border rounded-xl overflow-hidden bg-background">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted text-xs border-b border-border">
                  <tr>
                    <th className="px-4 py-3 font-medium w-1/2">Description</th>
                    <th className="px-4 py-3 font-medium w-1/6">Qty</th>
                    <th className="px-4 py-3 font-medium w-1/6">Rate</th>
                    <th className="px-4 py-3 font-medium w-1/6 text-right">Amount</th>
                    <th className="px-4 py-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2">
                        <input type="text" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 px-2 text-sm" placeholder="Item description" />
                      </td>
                      <td className="p-2">
                        <input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value))} className="w-full bg-transparent border-none focus:ring-0 px-2 text-sm" />
                      </td>
                      <td className="p-2">
                        <input type="number" value={item.rate} onChange={e => updateItem(i, 'rate', parseFloat(e.target.value))} className="w-full bg-transparent border-none focus:ring-0 px-2 text-sm" />
                      </td>
                      <td className="p-2 text-right pr-4 font-medium text-foreground">
                        ₹{item.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2">
                        {items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="text-destructive hover:bg-destructive/10 p-1.5 rounded-md transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-2 border-t border-border bg-muted/50">
                <button onClick={addItem} className="flex items-center gap-1.5 text-xs font-semibold text-primary px-3 py-1.5 hover:bg-primary/10 rounded-lg transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Add Line Item
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Notes / Terms</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Payment terms, thank you note, etc." 
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm min-h-[100px]"
              />
            </div>
            <div className="w-full md:w-64 space-y-3 bg-muted p-4 rounded-xl border border-border">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium text-foreground">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Discount (%)</span>
                <input type="number" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-16 bg-background border border-border rounded px-2 text-right py-0.5" />
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Tax (%)</span>
                <input type="number" value={tax} onChange={e => setTax(parseFloat(e.target.value) || 0)} className="w-16 bg-background border border-border rounded px-2 text-right py-0.5" />
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="font-bold text-foreground">Total</span>
                <span className="font-black text-lg text-primary">₹{total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-muted/50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors">
            Cancel
          </button>
          <button onClick={() => handleSave('draft')} disabled={isSaving} className="px-5 py-2 rounded-lg text-sm font-semibold border border-border bg-background hover:bg-muted transition-colors flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} Save Draft
          </button>
          <button onClick={() => handleSave('sent')} disabled={isSaving} className="px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex items-center gap-2">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send to Client
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
