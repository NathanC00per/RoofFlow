import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { PlusCircle, Trash2, Mail, CheckCircle2, Loader2, CreditCard } from "lucide-react";

const METHOD_LABELS = {
  cash: "Cash",
  check: "Check",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

const EMPTY_FORM = {
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  method: "cash",
  reference: "",
  notes: "",
};

export default function PaymentTracker({ invoice, job }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sendingReceiptId, setSendingReceiptId] = useState(null);

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments", invoice.id],
    queryFn: () => base44.entities.Payment.filter({ invoice_id: invoice.id }),
  });

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balanceDue = Math.max(0, (invoice.total || 0) - totalPaid);

  const addPayment = useMutation({
    mutationFn: async (data) => {
      const payment = await base44.entities.Payment.create({
        ...data,
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        job_id: invoice.job_id,
        customer_name: job?.customer_name || "",
        customer_email: job?.customer_email || "",
        amount: parseFloat(data.amount),
      });

      // Update invoice amount_paid and status
      const newPaid = totalPaid + parseFloat(data.amount);
      const newBalance = Math.max(0, (invoice.total || 0) - newPaid);
      const newStatus = newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : invoice.status;
      await base44.entities.Invoice.update(invoice.id, {
        amount_paid: newPaid,
        balance_due: newBalance,
        status: newStatus,
      });

      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success("Payment recorded");
    },
  });

  const deletePayment = useMutation({
    mutationFn: async (payment) => {
      await base44.entities.Payment.delete(payment.id);
      // Recalculate from remaining payments
      const remaining = payments.filter(p => p.id !== payment.id);
      const newPaid = remaining.reduce((s, p) => s + (p.amount || 0), 0);
      const newBalance = Math.max(0, (invoice.total || 0) - newPaid);
      const newStatus = newBalance <= 0 ? "paid" : newPaid > 0 ? "partial" : "sent";
      await base44.entities.Invoice.update(invoice.id, {
        amount_paid: newPaid,
        balance_due: newBalance,
        status: newStatus,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoice.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment removed");
    },
  });

  const sendReceipt = async (payment) => {
    if (!job?.customer_email) {
      toast.error("No customer email on file");
      return;
    }
    setSendingReceiptId(payment.id);
    try {
      const company = (() => { try { return JSON.parse(localStorage.getItem("company_settings") || "{}"); } catch { return {}; } })();
      const companyName = company.name || "Your Roofing Company";

      const body = `
Dear ${job.customer_name},

Thank you for your payment! Here is your receipt.

─────────────────────────────
PAYMENT RECEIPT
─────────────────────────────
Invoice:       ${invoice.invoice_number || invoice.id}
Invoice Total: $${(invoice.total || 0).toFixed(2)}

Payment Date:  ${format(new Date(payment.date), "MMMM d, yyyy")}
Amount Paid:   $${(payment.amount || 0).toFixed(2)}
Method:        ${METHOD_LABELS[payment.method] || payment.method}
${payment.reference ? `Reference:     ${payment.reference}` : ""}

Balance Due:   $${balanceDue.toFixed(2)}
─────────────────────────────
${payment.notes ? `Notes: ${payment.notes}\n` : ""}
${balanceDue <= 0 ? "✅ Your account is now paid in full. Thank you!\n" : ""}
If you have any questions, please don't hesitate to contact us.

Best regards,
${companyName}
${company.phone ? `Tel: ${company.phone}` : ""}
${company.email ? `Email: ${company.email}` : ""}
      `.trim();

      await base44.integrations.Core.SendEmail({
        to: job.customer_email,
        subject: `Payment Receipt — ${invoice.invoice_number || "Invoice"} ($${(payment.amount || 0).toFixed(2)})`,
        body,
      });

      await base44.entities.Payment.update(payment.id, { receipt_sent: true });
      queryClient.invalidateQueries({ queryKey: ["payments", invoice.id] });
      toast.success(`Receipt sent to ${job.customer_email}`);
    } catch (e) {
      toast.error("Failed to send receipt");
    } finally {
      setSendingReceiptId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Payment Tracker
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
            <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> Add Payment
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Paid: <span className="font-semibold text-foreground">${totalPaid.toFixed(2)}</span></span>
            <span>Balance: <span className={`font-semibold ${balanceDue <= 0 ? "text-emerald-600" : "text-primary"}`}>${balanceDue.toFixed(2)}</span></span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-emerald-500 transition-all"
              style={{ width: `${Math.min(100, (totalPaid / (invoice.total || 1)) * 100)}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Add payment form */}
        {showForm && (
          <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-medium">Record Payment</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Method</Label>
                <Select value={form.method} onValueChange={v => setForm(f => ({ ...f, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(METHOD_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reference # (optional)</Label>
                <Input
                  placeholder="Check #, Transaction ID…"
                  value={form.reference}
                  onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                rows={2}
                placeholder="Any additional notes…"
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                size="sm"
                disabled={!form.amount || !form.date || addPayment.isPending}
                onClick={() => addPayment.mutate(form)}
              >
                {addPayment.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                Save Payment
              </Button>
            </div>
          </div>
        )}

        {/* Payments list */}
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : payments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-3">No payments recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map(payment => (
              <div key={payment.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-emerald-700">${(payment.amount || 0).toFixed(2)}</span>
                    <Badge variant="secondary" className="text-xs">{METHOD_LABELS[payment.method] || payment.method}</Badge>
                    {payment.receipt_sent && (
                      <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Receipt Sent
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex gap-3 flex-wrap">
                    <span>{format(new Date(payment.date), "MMM d, yyyy")}</span>
                    {payment.reference && <span>Ref: {payment.reference}</span>}
                    {payment.notes && <span>{payment.notes}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    title="Send receipt email"
                    disabled={sendingReceiptId === payment.id}
                    onClick={() => sendReceipt(payment)}
                  >
                    {sendingReceiptId === payment.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Mail className="w-3.5 h-3.5" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    disabled={deletePayment.isPending}
                    onClick={() => deletePayment.mutate(payment)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}