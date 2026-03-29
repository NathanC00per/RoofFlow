import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addDays } from "date-fns";
import { computeDocumentTotals } from "@/components/documents/DocumentTotals";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Receipt, X, CalendarPlus, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

const JOB_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

export default function PostJobModal({ open, onClose, job, lineItems }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState("choose"); // "choose" | "schedule"
  const [creating, setCreating] = useState(null);

  // Schedule form state
  const [schedForm, setSchedForm] = useState({
    date: job?.start_date || format(new Date(), "yyyy-MM-dd"),
    start_time: "08:00",
    end_time: "17:00",
    notes: "",
    color: JOB_COLORS[0],
    employee_ids: [],
  });

  const { data: allEstimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list() });
  const { data: allInvoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => base44.entities.Employee.list() });

  const activeEmployees = employees.filter(e => e.status === "active");

  const toggleEmployee = (id) => {
    setSchedForm(prev => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(id)
        ? prev.employee_ids.filter(e => e !== id)
        : [...prev.employee_ids, id],
    }));
  };

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

  const scheduleMutation = useMutation({
    mutationFn: async () => {
      const assignedNames = schedForm.employee_ids.map(id => {
        const emp = employees.find(e => e.id === id);
        return emp ? `${emp.first_name} ${emp.last_name}` : id;
      });
      // Create schedule entry
      await base44.entities.Schedule.create({
        job_id: job.id,
        job_address: job.address,
        customer_name: job.customer_name,
        date: schedForm.date,
        start_time: schedForm.start_time,
        end_time: schedForm.end_time,
        notes: schedForm.notes,
        color: schedForm.color,
        employee_ids: schedForm.employee_ids,
        employee_names: assignedNames,
        status: "scheduled",
      });
      // Update job status to scheduled
      await base44.entities.Job.update(job.id, { status: "scheduled" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["schedules"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job scheduled!");
      navigate(`/jobs/${job.id}`);
    },
  });

  const isPending = estimateMutation.isPending || invoiceMutation.isPending || scheduleMutation.isPending;

  if (step === "schedule") {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Job</DialogTitle>
            <DialogDescription>Set the date, time, and crew for this job.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Date</Label>
                <Input type="date" value={schedForm.date} onChange={e => setSchedForm(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Color</Label>
                <div className="flex gap-1.5 flex-wrap pt-1">
                  {JOB_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSchedForm(p => ({ ...p, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${schedForm.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <Input type="time" value={schedForm.start_time} onChange={e => setSchedForm(p => ({ ...p, start_time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Time</Label>
                <Input type="time" value={schedForm.end_time} onChange={e => setSchedForm(p => ({ ...p, end_time: e.target.value }))} />
              </div>
            </div>

            {activeEmployees.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs">Assign Crew</Label>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                  {activeEmployees.map(emp => {
                    const selected = schedForm.employee_ids.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className={`text-left px-2.5 py-1.5 rounded-lg border text-xs transition-all ${selected ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40"}`}
                      >
                        {emp.first_name} {emp.last_name}
                        <span className="text-muted-foreground ml-1 capitalize">· {emp.role}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={2}
                placeholder="Special instructions for the crew..."
                value={schedForm.notes}
                onChange={e => setSchedForm(p => ({ ...p, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Button variant="ghost" size="sm" onClick={() => setStep("choose")} disabled={isPending}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button size="sm" disabled={!schedForm.date || isPending} onClick={() => scheduleMutation.mutate()}>
              {scheduleMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Confirm Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
            onClick={() => setStep("schedule")}
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