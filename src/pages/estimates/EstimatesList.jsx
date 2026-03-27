import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { generateDocumentPDF } from "@/lib/generatePDF";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PlusCircle, FileText, ChevronRight, Briefcase, Download, Trash2, FilePlus, CheckSquare, Square, X } from "lucide-react";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
};

const ESTIMATE_STATUSES = ["draft", "sent", "approved", "rejected", "expired"];

export default function EstimatesList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list("-created_date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
  });

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  const bulkStatusMutation = useMutation({
    mutationFn: async (status) => {
      await Promise.all([...selected].map(id => base44.entities.Estimate.update(id, { status })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      toast.success(`Updated ${selected.size} estimate(s)`);
      setSelected(new Set());
      setBulkStatus("");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selected].map(id => base44.entities.Estimate.delete(id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      toast.success(`Deleted ${selected.size} estimate(s)`);
      setSelected(new Set());
    },
  });

  const convertMutation = useMutation({
    mutationFn: async (estId) => {
      const est = estimates.find(e => e.id === estId);
      if (!est) return;
      let maxNum = 0;
      for (const inv of allInvoices) {
        const m = (inv.invoice_number || "").match(/(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      const created = await base44.entities.Invoice.create({
        job_id: est.job_id,
        estimate_id: estId,
        invoice_number: `INV-${String(maxNum + 1).padStart(4, "0")}`,
        status: "draft",
        issued_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        payment_terms: "Net 30",
        line_items: est.line_items || [],
        subtotal: est.subtotal,
        tax_amount: est.tax_amount,
        discount_amount: est.discount_amount,
        total: est.total,
        balance_due: est.total,
        amount_paid: 0,
        notes: est.notes,
      });
      return created;
    },
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created!");
      if (inv?.id) navigate(`/invoices/${inv.id}`);
    },
  });

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === estimates.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(estimates.map(e => e.id)));
    }
  }

  function handleBulkPDF() {
    const company = (() => { try { return JSON.parse(localStorage.getItem("company_settings") || "{}"); } catch { return {}; } })();
    const templates = (() => { try { return JSON.parse(localStorage.getItem("doc_templates") || "[]"); } catch { return []; } })();
    const template = templates.find(t => t.type === "estimate" || t.type === "both") || {};
    for (const id of selected) {
      const est = estimates.find(e => e.id === id);
      if (est) generateDocumentPDF({ type: "ESTIMATE", doc: est, job: jobMap[est.job_id], company, template });
    }
    toast.success(`Downloaded ${selected.size} PDF(s)`);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const allSelected = selected.size === estimates.length && estimates.length > 0;
  const someSelected = selected.size > 0;

  return (
    <div>
      <PageHeader title="Estimates" subtitle={`${estimates.length} total estimates`}>
        <Link to="/estimates/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" /> New Estimate</Button>
        </Link>
      </PageHeader>

      {/* Bulk action toolbar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <span className="text-sm font-medium text-primary">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Bulk status */}
            <div className="flex items-center gap-1.5">
              <Select value={bulkStatus} onValueChange={setBulkStatus}>
                <SelectTrigger className="h-8 text-xs w-36"><SelectValue placeholder="Set status..." /></SelectTrigger>
                <SelectContent>
                  {ESTIMATE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" disabled={!bulkStatus || bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate(bulkStatus)}>
                Apply
              </Button>
            </div>

            {/* Convert (only if single selection of estimate) */}
            {selected.size === 1 && (
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => convertMutation.mutate([...selected][0])} disabled={convertMutation.isPending}>
                <FilePlus className="w-3.5 h-3.5 mr-1.5" /> Convert to Invoice
              </Button>
            )}

            {/* PDF */}
            <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handleBulkPDF}>
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF{selected.size > 1 ? "s" : ""}
            </Button>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs text-destructive hover:bg-destructive/10" disabled={bulkDeleteMutation.isPending}>
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selected.size} estimate(s)?</AlertDialogTitle>
                  <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => bulkDeleteMutation.mutate()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setSelected(new Set())}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {estimates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No estimates yet</p>
            <Link to="/estimates/new"><Button className="mt-4" variant="outline">Create First Estimate</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Select all row */}
          <div className="flex items-center gap-3 px-1">
            <button type="button" onClick={toggleAll} className="text-muted-foreground hover:text-primary transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
            </button>
            <span className="text-xs text-muted-foreground">Select all</span>
          </div>

          {estimates.map(est => {
            const job = jobMap[est.job_id];
            const isSelected = selected.has(est.id);
            return (
              <div key={est.id} className={cn("flex items-center gap-3", isSelected && "")}>
                <button type="button" onClick={() => toggleOne(est.id)} className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                </button>
                <Link to={`/estimates/${est.id}`} className="flex-1 min-w-0">
                  <Card className={cn("hover:shadow-md transition-all hover:border-primary/20 cursor-pointer", isSelected && "border-primary/40 bg-primary/5")}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{est.estimate_number || "—"}</span>
                          {job && (
                            <span className="flex items-center gap-1 text-sm font-semibold truncate">
                              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                              {job.customer_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{job?.address || "No address"}{est.issued_date ? ` • Issued ${format(new Date(est.issued_date), "MMM d, yyyy")}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <Badge variant="secondary" className={cn("text-xs", STATUS_STYLES[est.status])}>{est.status}</Badge>
                        {est.total != null && <span className="font-semibold text-sm">${Number(est.total).toLocaleString()}</span>}
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}