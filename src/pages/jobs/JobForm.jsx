import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const JOB_TYPES = [
  { value: "new_roof", label: "New Roof" },
  { value: "repair", label: "Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "gutter", label: "Gutter" },
  { value: "siding", label: "Siding" },
  { value: "other", label: "Other" },
];

const ROOF_TYPES = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal" },
  { value: "tile", label: "Tile" },
  { value: "flat", label: "Flat" },
  { value: "slate", label: "Slate" },
  { value: "wood_shake", label: "Wood Shake" },
  { value: "other", label: "Other" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "emergency", label: "Emergency" },
];

export default function JobForm({ existingJob }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!existingJob;

  const [form, setForm] = useState(existingJob || {
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    job_type: "new_roof",
    roof_type: "asphalt_shingle",
    status: "lead",
    priority: "medium",
    estimated_cost: "",
    description: "",
    start_date: "",
    end_date: "",
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        estimated_cost: data.estimated_cost ? Number(data.estimated_cost) : undefined,
      };
      if (isEditing) {
        return base44.entities.Job.update(existingJob.id, payload);
      }
      return base44.entities.Job.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success(isEditing ? "Job updated!" : "New job created!");
      navigate("/jobs");
    },
  });

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  return (
    <div>
      <PageHeader 
        title={isEditing ? "Edit Job" : "New Job Intake"} 
        subtitle={isEditing ? "Update job details" : "Enter customer and job information"}
      />

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-6">
        {/* Customer Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Customer Information</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input value={form.customer_name} onChange={e => update("customer_name", e.target.value)} placeholder="John Smith" required />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.customer_phone} onChange={e => update("customer_phone", e.target.value)} placeholder="(555) 123-4567" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Email</Label>
              <Input type="email" value={form.customer_email} onChange={e => update("customer_email", e.target.value)} placeholder="john@example.com" />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader><CardTitle className="text-base">Job Location</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Street Address *</Label>
              <Input value={form.address} onChange={e => update("address", e.target.value)} placeholder="123 Main St" required />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input value={form.city} onChange={e => update("city", e.target.value)} placeholder="Springfield" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={form.state} onChange={e => update("state", e.target.value)} placeholder="IL" />
              </div>
              <div className="space-y-2">
                <Label>ZIP</Label>
                <Input value={form.zip} onChange={e => update("zip", e.target.value)} placeholder="62704" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Job Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Job Type *</Label>
              <Select value={form.job_type} onValueChange={v => update("job_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Roof Type</Label>
              <Select value={form.roof_type} onValueChange={v => update("roof_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROOF_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estimated Cost ($)</Label>
              <Input type="number" value={form.estimated_cost} onChange={e => update("estimated_cost", e.target.value)} placeholder="5000" />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={form.end_date} onChange={e => update("end_date", e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Description / Notes</Label>
              <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Describe the job scope, damage, special requirements..." rows={4} />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate("/jobs")}>Cancel</Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isEditing ? "Update Job" : "Create Job"}
          </Button>
        </div>
      </form>
    </div>
  );
}