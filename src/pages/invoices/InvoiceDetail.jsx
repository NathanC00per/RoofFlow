import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { ArrowLeft, Pencil, Trash2, ArrowRight, FileText, Phone, Mail, MapPin } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-slate-100 text-slate-400",
};

const UNIT_LABELS = {
  each: "Each", sq_ft: "Sq Ft", bundle: "Bundle", roll: "Roll",
  gallon: "Gal", box: "Box", sheet: "Sheet", linear_ft: "Lin Ft",
  square: "Sq", bag: "Bag", tube: "Tube"
};

export default function InvoiceDetail() {
  const invoiceId = window.location.pathname.split("/invoices/")[1];
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const rows = await base44.entities.Invoice.filter({ id: invoiceId });
      return rows[0];
    },
    enabled: !!invoiceId,
  });

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list() });
  const job = jobs.find(j => j.id === invoice?.job_id);

  const statusMutation = useMutation({
    mutationFn: (status) => base44.entities.Invoice.update(invoiceId, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] }); toast.success("Status updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Invoice.delete(invoiceId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); navigate("/invoices"); toast.success("Deleted"); },
  });

  if (isLoading || !invoice) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const items = invoice.line_items || [];

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/invoices")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Invoices
      </Button>

      <PageHeader
        title={invoice.invoice_number || "Invoice"}
        subtitle={job ? `${job.customer_name} — ${job.address}` : ""}
      >
        <Select value={invoice.status} onValueChange={v => statusMutation.mutate(v)}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["draft","sent","partial","paid","overdue","void"].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link to={`/invoices/${invoiceId}/edit`}>
          <Button variant="outline" size="icon"><Pencil className="w-4 h-4" /></Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete invoice?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Line items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent>
              <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-1">Unit $</div>
                <div className="col-span-2 text-right">Total</div>
              </div>
              {items.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No line items</p>
              ) : (
                items.map((item, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 py-2 border-b last:border-0 text-sm items-center">
                    <div className="col-span-12 sm:col-span-5">
                      <span className="font-medium">{item.description || "—"}</span>
                      <span className="text-xs text-muted-foreground ml-2 capitalize">{item.type}</span>
                    </div>
                    <div className="col-span-4 sm:col-span-2">{item.quantity}</div>
                    <div className="col-span-4 sm:col-span-2 text-muted-foreground">{UNIT_LABELS[item.unit] || item.unit}</div>
                    <div className="col-span-4 sm:col-span-1">${Number(item.unit_price || 0).toFixed(2)}</div>
                    <div className="col-span-12 sm:col-span-2 text-right font-medium">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                  </div>
                ))
              )}

              {/* Totals */}
              <div className="mt-4 pt-4 border-t flex justify-end">
                <div className="space-y-1.5 text-sm w-52">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${(invoice.subtotal || 0).toFixed(2)}</span></div>
                  {invoice.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span><span>${(invoice.tax_amount || 0).toFixed(2)}</span></div>}
                  {invoice.discount_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-${invoice.discount_amount.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-1.5"><span>Total</span><span>${(invoice.total || 0).toFixed(2)}</span></div>
                  {invoice.amount_paid > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><span>-${invoice.amount_paid.toFixed(2)}</span></div>}
                  {invoice.status !== "paid" && <div className="flex justify-between font-bold text-primary text-base border-t pt-1.5"><span>Balance Due</span><span>${Math.max(0, invoice.balance_due || 0).toFixed(2)}</span></div>}
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary" className={cn("mt-1", STATUS_STYLES[invoice.status])}>{invoice.status}</Badge>
              </div>
              {invoice.issued_date && <div><p className="text-xs text-muted-foreground">Issued</p><p className="text-sm font-medium">{format(new Date(invoice.issued_date), "MMM d, yyyy")}</p></div>}
              {invoice.due_date && <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm font-medium">{format(new Date(invoice.due_date), "MMM d, yyyy")}</p></div>}
              {invoice.payment_terms && <div><p className="text-xs text-muted-foreground">Terms</p><p className="text-sm font-medium">{invoice.payment_terms}</p></div>}
              <div className="border-t pt-3 space-y-1">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-bold">${(invoice.total || 0).toLocaleString()}</span></div>
                {invoice.status !== "paid" && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Balance Due</span><span className="font-bold text-primary">${Math.max(0, invoice.balance_due || 0).toLocaleString()}</span></div>}
              </div>
            </CardContent>
          </Card>

          {job && (
            <Card>
              <CardContent className="p-5 space-y-2">
                <p className="text-xs text-muted-foreground mb-2">Customer & Job</p>
                <p className="font-semibold">{job.customer_name}</p>
                {job.customer_phone && (
                  <a href={`tel:${job.customer_phone}`} className="text-xs flex items-center gap-1.5 text-primary hover:underline">
                    <Phone className="w-3 h-3" /> {job.customer_phone}
                  </a>
                )}
                {job.customer_email && (
                  <a href={`mailto:${job.customer_email}`} className="text-xs flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="w-3 h-3" /> {job.customer_email}
                  </a>
                )}
                <p className="text-xs flex items-start gap-1.5 text-muted-foreground">
                  <MapPin className="w-3 h-3 mt-0.5" /> {job.address}
                </p>
                <Link to={`/jobs/${job.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                  Open job <ArrowRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          )}

          {invoice.estimate_id && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-2">From Estimate</p>
                <Link to={`/estimates/${invoice.estimate_id}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5" /> View Estimate <ArrowRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}