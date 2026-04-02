import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addDays } from "date-fns";
import { computeDocumentTotals } from "@/components/documents/DocumentTotals";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, X, CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AutoScheduleModal from "@/components/jobs/AutoScheduleModal";

export default function PostJobModal({ open, onClose, job, lineItems }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [creating, setCreating] = useState(null);

  const { data: allEstimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list() });
  const { data: allInvoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });

  const estimateMutation = useMutation({
    mutationFn: async () => {
      let maxNum = 0;
      for (const e of allEstimates) {
        const m = (e.estimate_number || "").match(/(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      const { subtotal, totalTax, total } = computeDocumentTotals(lineItems, 0, 0);
      return base44.entities.Estimate.create({
        job_id: job.id,
        estimate_number: `EST-${String(maxNum + 1).padStart(4, "0")}`,
        status: "draft",
        issued_date: format(new Date(), "yyyy-MM-dd"),
        expiry_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        line_items: lineItems,
        discount_amount: 0,
        subtotal,
        tax_amount: totalTax,
        total,
        notes: "",
      });
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Estimate created!");
      navigate(`/estimates/${saved.id}`);
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: async () => {
      let maxNum = 0;
      for (const i of allInvoices) {
        const m = (i.invoice_number || "").match(/(\d+)$/);
        if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
      }
      const { subtotal, totalTax, total, balanceDue } = computeDocumentTotals(lineItems, 0, 0);
      return base44.entities.Invoice.create({
        job_id: job.id,
        invoice_number: `INV-${String(maxNum + 1).padStart(4, "0")}`,
        status: "draft",
        issued_date: format(new Date(), "yyyy-MM-dd"),
        due_date: format(addDays(new Date(), 30), "yyyy-MM-dd"),
        payment_terms: "Net 30",
        line_items: lineItems,
        discount_amount: 0,
        amount_paid: 0,
        subtotal,
        tax_amount: totalTax,
        total,
        balance_due: balanceDue,
        notes: "",
      });
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created!");
      navigate(`/invoices/${saved.id}`);
    },
  });

  const isPending = estimateMutation.isPending || invoiceMutation.isPending;

  if (showAutoSchedule) {
    return (
      <AutoScheduleModal
        open={showAutoSchedule}
        onClose={() => {
          setShowAutoSchedule(false);
          navigate(`/jobs/${job.id}`);
        }}
        job={job}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Job Created!</DialogTitle>
          <DialogDescription>
            What would you like to do next?
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-2">
          <button
            type="button"
            disabled={isPending}
            onClick={() => { setCreating("estimate"); estimateMutation.mutate(); }}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 p-4 transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs">Generate Estimate</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Send for approval</p>
            </div>
            {creating === "estimate" && isPending && <div className="text-xs text-primary"><Loader2 className="w-3 h-3 animate-spin" /></div>}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => { setCreating("invoice"); invoiceMutation.mutate(); }}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-accent/30 hover:border-accent hover:bg-accent/5 p-4 transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-accent" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs">Generate Invoice</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Bill immediately</p>
            </div>
            {creating === "invoice" && isPending && <div className="text-xs text-accent"><Loader2 className="w-3 h-3 animate-spin" /></div>}
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={() => setShowAutoSchedule(true)}
            className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-emerald-400/40 hover:border-emerald-500 hover:bg-emerald-50 p-4 transition-all disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-xs">Schedule Job</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Assign crew & date</p>
            </div>
          </button>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            <X className="w-4 h-4 mr-1.5" /> Skip for now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}