import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { Plus, Trash2, GripVertical, Save, ChevronDown, ChevronUp, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "textarea", label: "Long Text" },
  { value: "select", label: "Dropdown" },
  { value: "date", label: "Date" },
  { value: "photo", label: "Photos / Camera" },
];

const JOB_TYPES = [
  { value: "", label: "Any job type" },
  { value: "new_roof", label: "New Roof" },
  { value: "repair", label: "Repair" },
  { value: "inspection", label: "Inspection" },
  { value: "gutter", label: "Gutter" },
  { value: "siding", label: "Siding" },
  { value: "other", label: "Other" },
];

function newField() {
  return { id: crypto.randomUUID(), label: "", type: "text", options: [], required: false, placeholder: "" };
}

function FieldEditor({ field, onChange, onDelete }) {
  return (
    <div className="border rounded-lg p-4 bg-muted/20 space-y-3">
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Field Label *</Label>
            <Input
              value={field.label}
              onChange={e => onChange({ ...field, label: e.target.value })}
              placeholder="e.g. Membrane Brand"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Field Type</Label>
            <Select value={field.type} onValueChange={v => onChange({ ...field, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {field.type !== "photo" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={field.placeholder}
                onChange={e => onChange({ ...field, placeholder: e.target.value })}
                placeholder="Optional hint text..."
              />
            </div>
          )}
          {field.type === "select" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">Options <span className="text-muted-foreground font-normal">(one per line)</span></Label>
              <Textarea
                rows={3}
                value={(field.options || []).join("\n")}
                onChange={e => onChange({ ...field, options: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                placeholder={"Option 1\nOption 2\nOption 3"}
              />
            </div>
          )}
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              id={`req-${field.id}`}
              checked={!!field.required}
              onChange={e => onChange({ ...field, required: e.target.checked })}
              className="rounded border-border"
            />
            <Label htmlFor={`req-${field.id}`} className="text-xs cursor-pointer">Required field</Label>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onDelete} className="flex-shrink-0 text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function TemplateEditor({ template, onSave, onDelete, isNew }) {
  const [form, setForm] = useState(template);
  const [expanded, setExpanded] = useState(isNew);
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const updateField = (id, updated) => {
    setForm(p => ({ ...p, fields: p.fields.map(f => f.id === id ? updated : f) }));
  };
  const removeField = (id) => {
    setForm(p => ({ ...p, fields: p.fields.filter(f => f.id !== id) }));
  };
  const addField = () => {
    setForm(p => ({ ...p, fields: [...(p.fields || []), newField()] }));
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <LayoutTemplate className="w-4 h-4 text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {expanded ? (
                <Input
                  value={form.name}
                  onChange={e => upd("name", e.target.value)}
                  className="font-semibold h-8 text-sm"
                  placeholder="Template name..."
                  onClick={e => e.stopPropagation()}
                />
              ) : (
                <p className="font-semibold text-sm truncate">{form.name || "Untitled Template"}</p>
              )}
            </div>
            {!expanded && (
              <span className="text-xs text-muted-foreground flex-shrink-0">{(form.fields || []).length} field(s)</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" onClick={() => setExpanded(e => !e)}>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={form.description || ""} onChange={e => upd("description", e.target.value)} placeholder="Optional description..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Applicable Job Type</Label>
              <Select value={form.job_type || ""} onValueChange={v => upd("job_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {JOB_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Custom Fields</Label>
              <Button type="button" variant="outline" size="sm" onClick={addField}>
                <Plus className="w-4 h-4 mr-1" /> Add Field
              </Button>
            </div>
            {(form.fields || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                No fields yet — click "Add Field" to start.
              </p>
            )}
            {(form.fields || []).map(field => (
              <FieldEditor
                key={field.id}
                field={field}
                onChange={(updated) => updateField(field.id, updated)}
                onDelete={() => removeField(field.id)}
              />
            ))}
          </div>

          <div className="flex justify-between pt-2 border-t">
            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(template.id)}>
              <Trash2 className="w-4 h-4 mr-1" /> Delete Template
            </Button>
            <Button type="button" size="sm" onClick={() => onSave(form)}>
              <Save className="w-4 h-4 mr-1" /> Save Template
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function JobTemplates() {
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["job-templates"],
    queryFn: () => base44.entities.JobTemplate.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JobTemplate.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-templates"] }); toast.success("Template saved!"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobTemplate.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-templates"] }); toast.success("Template updated!"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobTemplate.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["job-templates"] }); toast.success("Template deleted"); },
  });

  const [newTemplate, setNewTemplate] = useState(null);

  const handleSave = (form) => {
    if (form.id && !form._isNew) {
      updateMutation.mutate({ id: form.id, data: form });
    } else {
      const { id, _isNew, ...rest } = form;
      createMutation.mutate(rest);
      setNewTemplate(null);
    }
  };

  const handleAddNew = () => {
    setNewTemplate({ id: "new", _isNew: true, name: "", description: "", job_type: "", fields: [] });
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Job Templates"
        subtitle="Create reusable templates with custom fields for different roof types and job scopes."
      >
        <Button onClick={handleAddNew}>
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {newTemplate && (
            <TemplateEditor
              key="new"
              template={newTemplate}
              onSave={handleSave}
              onDelete={() => setNewTemplate(null)}
              isNew
            />
          )}
          {templates.length === 0 && !newTemplate && (
            <div className="text-center py-16 text-muted-foreground border border-dashed rounded-xl">
              <LayoutTemplate className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No templates yet</p>
              <p className="text-sm mt-1">Create your first template to add custom fields to jobs.</p>
            </div>
          )}
          {templates.map(t => (
            <TemplateEditor
              key={t.id}
              template={t}
              onSave={handleSave}
              onDelete={deleteMutation.mutate}
              isNew={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}