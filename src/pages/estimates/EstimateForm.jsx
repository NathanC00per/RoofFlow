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
import { format } from "date-fns";
import { toast } from "sonner";

export default function EstimateForm({ existing }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!existing;

  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list() });
  const { data: materials = [] } = useQuery({ queryKey: ["materials"], queryFn: () => base44.entities.Material.list() });
  const { data: allEstimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list() });

  const [form, setForm] = useState(existing || {
    job_id: "",
    estimate_number: "",
    status: "draft",
    issued_date: format(new Date(), "yyyy-MM-dd"),
    expiry_date: "",
    notes: "",
    internal_notes: "",
    discount_amount: 0,
    line_items: [],
  });

  // Auto-generate estimate number
  useEffect(() => {
    if (!isEditing && !form.estimate_number && allEstimates.length > 0) {
      setForm(p => ({ ...p, estimate_number: `EST-${String(allEstimates.length + 1).padStart(4, "0")}` }));
    } else if (!isEditing && !form.estimate_number) {
      setForm(p => ({ ...p, estimate_number: "EST-0001" }));
    }
  }, [allEstimates.length]);

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const { subtotal, taxBreakdown, totalTax, total } = computeDocumentTotals(form.line_items, form.discount_amount, 0);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, subtotal, tax_amount: totalTax, total };
      return isEditing ? base44.entities.Estimate.update(existing.id, payload) : base44.entities.Estimate.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["estimates"] });
      toast.success(isEditing ? "Estimate updated!" : "Estimate created!");
      navigate(`/estimates/${saved.id || existing.id}`);
    },
  });

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/estimates")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Estimates
      </Button>
      <PageHeader title={isEditing ? "Edit Estimate" : "New Estimate"} subtitle="Create a detailed estimate for a job" />

      <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
        {/* Header info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estimate Info</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Job *</Label>
              <Select value={form.job_id} onValueChange={v => update("job_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select job..." /></SelectTrigger>
                <SelectContent>
                  {activeJobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.customer_name} — {j.address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Estimate #</Label>
              <Input value={form.estimate_number} onChange={e => update("estimate_number", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => update("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft","sent","approved","rejected","expired"].map(s => (
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
              <Label>Expiry Date</Label>
              <Input type="date" value={form.expiry_date} onChange={e => update("expiry_date", e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Line items */}
        <Card>
          <CardHeader><CardTitle className="text-base">Line Items</CardTitle></CardHeader>
          <CardContent>
            <LineItemsEditor items={form.line_items} onChange={v => update("line_items", v)} materials={materials} />
            <div className="mt-6">
              <DocumentTotals
                items={form.line_items}
                discountAmount={form.discount_amount}
                onDiscountChange={v => update("discount_amount", v)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Customer Notes (visible on estimate)</Label>
              <Textarea value={form.notes} onChange={e => update("notes", e.target.value)} rows={3} placeholder="Payment terms, scope notes, etc." />
            </div>
            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <Textarea value={form.internal_notes} onChange={e => update("internal_notes", e.target.value)} rows={3} placeholder="Not visible to customer" />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/estimates")}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending || !form.job_id}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditing ? "Update Estimate" : "Save Estimate"}
          </Button>
        </div>
      </form>
    </div>
  );
}