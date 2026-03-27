import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { ArrowLeft, Pencil, Trash2, FileText, ArrowRight, FilePlus, Download } from "lucide-react";
import { generateDocumentPDF } from "@/lib/generatePDF";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
};

const UNIT_LABELS = {
  each: "Each", sq_ft: "Sq Ft", bundle: "Bundle", roll: "Roll",
  gallon: "Gal", box: "Box", sheet: "Sheet", linear_ft: "Lin Ft",
  square: "Sq", bag: "Bag", tube: "Tube"
};

export default function EstimateDetail() {
  const estimateId = window.location.pathname.split("/estimates/")[1];
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: estimate, isLoading } = useQuery({
    queryKey: ["estimate", estimateId],
    queryFn: async () => {
      const rows = await base44.entities.Estimate.filter({ id: estimateId });
      return rows[0];
    },
    enabled: !!estimateId,
  });

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list() });
  const job = jobs.find(j => j.id === estimate?.job_id);

  const statusMutation = useMutation({
    mutationFn: (status) => base44.entities.Estimate.update(estimateId, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimate", estimateId] }); toast.success("Status updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Estimate.delete(estimateId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["estimates"] }); navigate("/estimates"); toast.success("Deleted"); },
  });

  // Convert estimate to invoice
  const convertMutation = useMutation({
    mutationFn: async () => {
      const invoiceCount = await base44.entities.Invoice.list("-created_date", 1);
      const num = `INV-${String((invoiceCount.length || 0) + 1).padStart(4, "0")}`;
      return base44.entities.Invoice.create({
        job_id: estimate.job_id,
        estimate_id: estimateId,
        invoice_number: num,
        status: "draft",
        issued_date: format(new Date(), "yyyy-MM-dd"),
        line_items: estimate.line_items || [],
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        discount_amount: estimate.discount_amount,
        total: estimate.total,
        balance_due: estimate.total,
        amount_paid: 0,
        notes: estimate.notes,
      });
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created from estimate!");
      navigate(`/invoices/${inv.id}`);
    },
  });

  if (isLoading || !estimate) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const items = estimate.line_items || [];
  const subtotal = items.reduce((s, i) => s + ((i.quantity || 0) * (i.unit_price || 0)), 0);

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/estimates")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Estimates
      </Button>

      <PageHeader
        title={estimate.estimate_number || "Estimate"}
        subtitle={job ? `${job.customer_name} — ${job.address}` : ""}
      >
        <Button variant="outline" size="sm" onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending}>
          <FilePlus className="w-4 h-4 mr-2" /> Convert to Invoice
        </Button>
        <Button variant="outline" size="sm" onClick={() => {
          const tpl = (() => { try { return JSON.parse(localStorage.getItem("doc_template_settings") || "{}"); } catch { return {}; } })();
          generateDocumentPDF({ type: "ESTIMATE", doc: estimate, job, template: tpl });
        }}>
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </Button>
        <Select value={estimate.status} onValueChange={v => statusMutation.mutate(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {["draft","sent","approved","rejected","expired"].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Link to={`/estimates/${estimateId}/edit`}>
          <Button variant="outline" size="icon"><Pencil className="w-4 h-4" /></Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Delete estimate?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      {/* Job link */}
      {job && (
        <Link to={`/jobs/${job.id}`} className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6">
          <FileText className="w-3.5 h-3.5" /> View Job: {job.customer_name} <ArrowRight className="w-3 h-3" />
        </Link>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Line items */}
          <Card>
            <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-0">
                {items.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-4">No line items</p>
                ) : (
                  <>
                    <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-muted-foreground font-medium pb-2 border-b">
                      <div className="col-span-5">Description</div>
                      <div className="col-span-2">Qty</div>
                      <div className="col-span-2">Unit</div>
                      <div className="col-span-1">Unit $</div>
                      <div className="col-span-2 text-right">Total</div>
                    </div>
                    {items.map((item, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 py-2 border-b last:border-0 text-sm items-center">
                        <div className="col-span-12 sm:col-span-5">
                          <span className="font-medium">{item.description || "—"}</span>
                          <span className="text-xs text-muted-foreground ml-2 capitalize">{item.type}</span>
                        </div>
                        <div className="col-span-4 sm:col-span-2 text-sm">{item.quantity}</div>
                        <div className="col-span-4 sm:col-span-2 text-sm text-muted-foreground">{UNIT_LABELS[item.unit] || item.unit}</div>
                        <div className="col-span-4 sm:col-span-1 text-sm">${Number(item.unit_price || 0).toFixed(2)}</div>
                        <div className="col-span-12 sm:col-span-2 text-right font-medium">${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Totals */}
              <div className="mt-4 pt-4 border-t flex justify-end">
                <div className="space-y-1.5 text-sm w-48">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  {estimate.tax_rate > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax ({estimate.tax_rate}%)</span><span>${(estimate.tax_amount || 0).toFixed(2)}</span></div>}
                  {estimate.discount_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-${(estimate.discount_amount).toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-base border-t pt-1.5"><span>Total</span><span>${(estimate.total || 0).toFixed(2)}</span></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {estimate.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{estimate.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <Badge variant="secondary" className={cn("mt-1", STATUS_STYLES[estimate.status])}>{estimate.status}</Badge>
              </div>
              {estimate.issued_date && <div><p className="text-xs text-muted-foreground">Issued</p><p className="text-sm font-medium">{format(new Date(estimate.issued_date), "MMM d, yyyy")}</p></div>}
              {estimate.expiry_date && <div><p className="text-xs text-muted-foreground">Expires</p><p className="text-sm font-medium">{format(new Date(estimate.expiry_date), "MMM d, yyyy")}</p></div>}
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">${(estimate.total || 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          {job && (
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-2">Linked Job</p>
                <p className="font-semibold text-sm">{job.customer_name}</p>
                <p className="text-xs text-muted-foreground">{job.address}</p>
                <Link to={`/jobs/${job.id}`} className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1">
                  Open job <ArrowRight className="w-3 h-3" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}