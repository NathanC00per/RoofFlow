import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LineItemsEditor from "@/components/documents/LineItemsEditor";
import DocumentTotals, { computeDocumentTotals } from "@/components/documents/DocumentTotals";
import PageHeader from "@/components/shared/PageHeader";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";

export default function InvoiceForm({ existing }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!existing;

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list() });
  const { data: materials = [] } = useQuery({ queryKey: ["materials"], queryFn: () => base44.entities.Material.list() });
  const { data: allInvoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });

  const [form, setForm] = useState(existing || {
    job_id: "",
    invoice_number: "",
    status: "draft",
    issued_date: format(new Date(), "yyyy-MM-dd"),
    due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
    payment_terms: "Net 30",
    notes: "",
    discount_amount: 0,
    amount_paid: 0,
    line_items: [],
  });

  useEffect(() => {
    if (!isEditing && !form.invoice_number) {
      setForm(p => ({ ...p, invoice_number: `INV-${String((allInvoices.length || 0) + 1).padStart(4, "0")}` }));
    }
  }, [allInvoices.length]);

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));
  const { subtotal, totalTax, total, balanceDue } = computeDocumentTotals(form.line_items, form.discount_amount, form.amount_paid || 0);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, subtotal, tax_amount: totalTax, total, balance_due: balanceDue };
      return isEditing ? base44.entities.Invoice.update(existing.id, payload) : base44.entities.Invoice.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(isEditing ? "Invoice updated!" : "Invoice created!");
      navigate(`/invoices/${saved.id || existing.id}`);
    },
  });

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/invoices")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
      </Button>
      <PageHeader title={isEditing ? "Edit Invoice" : "New Invoice"} />

      <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Invoice Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Job *</Label>
              <Select value={form.job_id} onValueChange={v => update("job_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select job..." /></SelectTrigger>
                <SelectContent>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.customer_name} — {j.address}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Invoice #</Label>
              <Input value={form.invoice_number} onChange={e => update("invoice_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","sent","partial","paid","overdue","void"].map(s => (
                    <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Issued Date</Label>
              <Input type="date" value={form.issued_date} onChange={e => update("issued_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => update("due_date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Terms</Label>
              <Input value={form.payment_terms} onChange={e => update("payment_terms", e.target.value)} placeholder="e.g. Net 30" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
          <CardContent>
            <LineItemsEditor items={form.line_items} onChange={v => update("line_items", v)} materials={materials} />
            <div className="mt-6">
              <DocumentTotals
                items={form.line_items}
                discountAmount={form.discount_amount}
                onDiscountChange={v => update("discount_amount", v)}
                showPayment
                amountPaid={form.amount_paid}
                onAmountPaidChange={v => update("amount_paid", v)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} placeholder="Payment instructions, thank you note, etc." />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending || !form.job_id}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditing ? "Update Invoice" : "Save Invoice"}
          </Button>
        </div>
      </form>
    </div>
  );
}