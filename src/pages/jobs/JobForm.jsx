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
import LineItemsEditor from "@/components/documents/LineItemsEditor";
import DocumentTotals, { computeDocumentTotals } from "@/components/documents/DocumentTotals";
import CustomerPicker from "@/components/jobs/CustomerPicker";
import PostJobModal from "@/components/jobs/PostJobModal";
import CustomFieldsSection from "@/components/jobs/CustomFieldsSection";
import { Save, Loader2, LayoutTemplate } from "lucide-react";
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

const CONDITION_OPTIONS = [
  { value: "new", label: "New / No existing damage" },
  { value: "good", label: "Good — Minor wear" },
  { value: "fair", label: "Fair — Moderate wear, some repairs needed" },
  { value: "poor", label: "Poor — Significant damage" },
  { value: "critical", label: "Critical — Immediate replacement required" },
];

const DAMAGE_TYPES = [
  "Storm / Hail", "Wind", "Water / Leak", "UV / Age", "Structural", "Missing Shingles", "Flashing Failure", "Gutter Damage", "Other"
];

export default function JobForm({ existingJob }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!existingJob;

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => base44.entities.Material.list(),
  });

  const { data: jobTemplates = [] } = useQuery({
    queryKey: ["job-templates"],
    queryFn: () => base44.entities.JobTemplate.list(),
  });

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
    // roof condition fields
    roof_condition: "",
    roof_age_years: "",
    roof_area_sq_ft: "",
    damage_types: [],
    layers_count: "",
    // line items
    line_items: [],
    discount_amount: 0,
    // template & custom fields
    template_id: "",
    template_name: "",
    custom_fields: [],
  });

  const [createdJob, setCreatedJob] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleTemplateChange = (templateId) => {
    if (!templateId) {
      setForm(prev => ({ ...prev, template_id: "", template_name: "", custom_fields: [] }));
      return;
    }
    const tpl = jobTemplates.find(t => t.id === templateId);
    if (!tpl) return;
    // Build empty custom field values from template fields
    const custom_fields = (tpl.fields || []).map(f => ({
      field_id: f.id, label: f.label, type: f.type, value: f.type === "photo" ? [] : ""
    }));
    setForm(prev => ({ ...prev, template_id: tpl.id, template_name: tpl.name, custom_fields }));
  };

  const selectedTemplate = jobTemplates.find(t => t.id === form.template_id);

  const toggleDamage = (type) => {
    setForm(prev => ({
      ...prev,
      damage_types: prev.damage_types.includes(type)
        ? prev.damage_types.filter(d => d !== type)
        : [...prev.damage_types, type],
    }));
  };

  const { subtotal, totalTax, total } = computeDocumentTotals(form.line_items, form.discount_amount, 0);

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        estimated_cost: total > 0 ? total : (data.estimated_cost ? Number(data.estimated_cost) : undefined),
        roof_age_years: data.roof_age_years ? Number(data.roof_age_years) : undefined,
        roof_area_sq_ft: data.roof_area_sq_ft ? Number(data.roof_area_sq_ft) : undefined,
        layers_count: data.layers_count ? Number(data.layers_count) : undefined,
      };
      if (isEditing) return base44.entities.Job.update(existingJob.id, payload);
      return base44.entities.Job.create(payload);
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      if (isEditing) {
        toast.success("Job updated!");
        navigate("/jobs");
      } else {
        setCreatedJob(saved);
        setShowModal(true);
      }
    },
  });

  const hasLineItems = form.line_items.length > 0;

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
            <CustomerPicker
              value={{ customer_name: form.customer_name, customer_phone: form.customer_phone, customer_email: form.customer_email }}
              onChange={(patch) => setForm(prev => ({ ...prev, ...patch }))}
            />
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
              <Label>Estimated Cost ($) <span className="text-xs text-muted-foreground">(auto-calculated from materials if added)</span></Label>
              <Input type="number" value={total > 0 ? total.toFixed(2) : form.estimated_cost} readOnly={total > 0} onChange={e => update("estimated_cost", e.target.value)} placeholder="5000" className={total > 0 ? "bg-muted" : ""} />
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
              <Textarea value={form.description} onChange={e => update("description", e.target.value)} placeholder="Describe the job scope, damage, special requirements..." rows={3} />
            </div>
          </CardContent>
        </Card>

        {/* Template Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-primary" />
              Job Template
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Select a template to capture additional custom fields specific to this roof type or job scope.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={form.template_id || "none"} onValueChange={v => handleTemplateChange(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="No template selected" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No template —</SelectItem>
                  {jobTemplates.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {jobTemplates.length === 0 && (
                <p className="text-xs text-muted-foreground">No templates yet. Create them in <a href="/settings/templates/jobs" className="underline text-primary">Settings → Job Templates</a>.</p>
              )}
            </div>
            {selectedTemplate && (
              <CustomFieldsSection
                fields={selectedTemplate.fields || []}
                values={form.custom_fields || []}
                onChange={v => update("custom_fields", v)}
              />
            )}
          </CardContent>
        </Card>

        {/* Roof Condition Assessment */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Roof Condition Assessment</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Overall Condition</Label>
              <Select value={form.roof_condition} onValueChange={v => update("roof_condition", v)}>
                <SelectTrigger><SelectValue placeholder="Select condition..." /></SelectTrigger>
                <SelectContent>
                  {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Roof Age (years)</Label>
              <Input type="number" min="0" value={form.roof_age_years} onChange={e => update("roof_age_years", e.target.value)} placeholder="e.g. 15" />
            </div>
            <div className="space-y-2">
              <Label>Roof Area (sq ft)</Label>
              <Input type="number" min="0" value={form.roof_area_sq_ft} onChange={e => update("roof_area_sq_ft", e.target.value)} placeholder="e.g. 2200" />
            </div>
            <div className="space-y-2">
              <Label>Number of Existing Layers</Label>
              <Select value={form.layers_count ? String(form.layers_count) : ""} onValueChange={v => update("layers_count", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 layer</SelectItem>
                  <SelectItem value="2">2 layers</SelectItem>
                  <SelectItem value="3">3+ layers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Damage Types <span className="text-xs text-muted-foreground font-normal">(select all that apply)</span></Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {DAMAGE_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleDamage(type)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      form.damage_types.includes(type)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Materials & Labour */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Materials & Labour</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Add all materials and labour involved. These will be carried into any estimate or invoice you generate.
            </p>
          </CardHeader>
          <CardContent>
            <LineItemsEditor
              items={form.line_items}
              onChange={v => update("line_items", v)}
              materials={materials}
            />
            {hasLineItems && (
              <div className="mt-6">
                <DocumentTotals
                  items={form.line_items}
                  discountAmount={form.discount_amount}
                  onDiscountChange={v => update("discount_amount", v)}
                />
              </div>
            )}
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

      {createdJob && (
        <PostJobModal
          open={showModal}
          onClose={() => { setShowModal(false); navigate("/jobs"); }}
          job={createdJob}
          lineItems={form.line_items}
        />
      )}
    </div>
  );
}