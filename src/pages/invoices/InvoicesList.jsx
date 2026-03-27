import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
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
import { PlusCircle, Receipt, ChevronRight, Briefcase, Download, Trash2, CheckSquare, Square, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-slate-100 text-slate-400",
};

const INVOICE_STATUSES = ["draft", "sent", "partial", "paid", "overdue", "void"];

export default function InvoicesList() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
  });

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));
  const unpaid = invoices.filter(i => !["paid", "void"].includes(i.status));
  const totalOutstanding = unpaid.reduce((s, i) => s + (i.balance_due || i.total || 0), 0);

  const bulkStatusMutation = useMutation({
    mutationFn: async (status) => {
      await Promise.all([...selected].map(id => base44.entities.Invoice.update(id, { status })));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Updated ${selected.size} invoice(s)`);
      setSelected(new Set());
      setBulkStatus("");
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      await Promise.all([...selected].map(id => base44.entities.Invoice.delete(id)));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Deleted ${selected.size} invoice(s)`);
      setSelected(new Set());
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
    if (selected.size === invoices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(invoices.map(i => i.id)));
    }
  }

  function handleBulkPDF() {
    const company = (() => { try { return JSON.parse(localStorage.getItem("company_settings") || "{}"); } catch { return {}; } })();
    const templates = (() => { try { return JSON.parse(localStorage.getItem("doc_templates") || "[]"); } catch { return []; } })();
    const template = templates.find(t => t.type === "invoice" || t.type === "both") || {};
    for (const id of selected) {
      const inv = invoices.find(i => i.id === id);
      if (inv) generateDocumentPDF({ type: "INVOICE", doc: inv, job: jobMap[inv.job_id], company, template });
    }
    toast.success(`Downloaded ${selected.size} PDF(s)`);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const allSelected = selected.size === invoices.length && invoices.length > 0;
  const someSelected = selected.size > 0;

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${invoices.length} total • $${totalOutstanding.toLocaleString()} outstanding`}>
        <Link to="/invoices/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" /> New Invoice</Button>
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
                  {INVOICE_STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button size="sm" className="h-8 text-xs" disabled={!bulkStatus || bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate(bulkStatus)}>
                Apply
              </Button>
            </div>

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
                  <AlertDialogTitle>Delete {selected.size} invoice(s)?</AlertDialogTitle>
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

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
            <Link to="/invoices/new"><Button className="mt-4" variant="outline">Create First Invoice</Button></Link>
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

          {invoices.map(inv => {
            const job = jobMap[inv.job_id];
            const isOverdue = inv.status !== "paid" && inv.due_date && new Date(inv.due_date) < new Date();
            const displayStatus = isOverdue && inv.status === "sent" ? "overdue" : inv.status;
            const isSelected = selected.has(inv.id);
            return (
              <div key={inv.id} className="flex items-center gap-3">
                <button type="button" onClick={() => toggleOne(inv.id)} className="flex-shrink-0 text-muted-foreground hover:text-primary transition-colors">
                  {isSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
                </button>
                <Link to={`/invoices/${inv.id}`} className="flex-1 min-w-0">
                  <Card className={cn("hover:shadow-md transition-all hover:border-primary/20 cursor-pointer", isSelected && "border-primary/40 bg-primary/5")}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">{inv.invoice_number || "—"}</span>
                          {job && (
                            <span className="flex items-center gap-1 text-sm font-semibold truncate">
                              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                              {job.customer_name}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {job?.address || ""}
                          {inv.due_date ? ` • Due ${format(new Date(inv.due_date), "MMM d, yyyy")}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <Badge variant="secondary" className={cn("text-xs", STATUS_STYLES[displayStatus])}>
                          {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                        </Badge>
                        <div className="text-right">
                          <p className="font-semibold text-sm">${Number(inv.total || 0).toLocaleString()}</p>
                          {inv.balance_due > 0 && inv.status !== "paid" && (
                            <p className="text-xs text-muted-foreground">Due: ${Number(inv.balance_due).toLocaleString()}</p>
                          )}
                        </div>
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