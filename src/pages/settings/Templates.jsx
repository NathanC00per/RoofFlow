import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/shared/PageHeader";
import { Save, Eye, Plus, Trash2, GripVertical, FileText, Receipt } from "lucide-react";
import { toast } from "sonner";
import { generateDocumentPDF } from "@/lib/generatePDF";
import { getCompanySettings } from "./CompanySettings";

const TEMPLATES_KEY = "doc_templates";

const DEFAULT_ELEMENTS = [
  { id: "header",        label: "Company Header",      description: "Logo area, company name, contact info", enabled: true,  locked: true },
  { id: "bill_to",       label: "Bill To / Client",    description: "Customer name, address, contact",       enabled: true,  locked: false },
  { id: "doc_meta",      label: "Document Details",    description: "Invoice/Estimate number, dates, terms", enabled: true,  locked: false },
  { id: "line_items",    label: "Line Items Table",    description: "Description, qty, unit, price, tax",    enabled: true,  locked: true },
  { id: "totals",        label: "Totals Summary",      description: "Subtotal, tax breakdown, total",        enabled: true,  locked: true },
  { id: "payment_info",  label: "Payment Details",     description: "IBAN, BIC, bank name from company settings", enabled: true,  locked: false },
  { id: "notes",         label: "Notes",               description: "Customer-facing notes from document",   enabled: true,  locked: false },
  { id: "footer",        label: "Footer",              description: "Footer bar with custom text",           enabled: true,  locked: false },
];

function getDefaultTemplate(name, type) {
  return {
    id: Date.now().toString(),
    name,
    type, // "invoice" | "estimate" | "both"
    elements: DEFAULT_ELEMENTS.map(e => ({ ...e })),
    customNotes: "",
  };
}

function loadTemplates() {
  try {
    const saved = localStorage.getItem(TEMPLATES_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [
    getDefaultTemplate("Standard Invoice", "invoice"),
    getDefaultTemplate("Standard Estimate", "estimate"),
  ];
}

function saveTemplates(templates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function getTemplateForDoc(type) {
  const templates = loadTemplates();
  return templates.find(t => t.type === type || t.type === "both") || templates[0] || getDefaultTemplate("Default", "both");
}

// ── Element row ──────────────────────────────────────────────────────────────
function ElementRow({ el, onToggle, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${el.enabled ? "bg-card" : "bg-muted/30 opacity-60"}`}>
      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{el.label}</p>
        <p className="text-xs text-muted-foreground">{el.description}</p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveUp} disabled={isFirst || el.locked}>
          <span className="text-xs">↑</span>
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onMoveDown} disabled={isLast || el.locked}>
          <span className="text-xs">↓</span>
        </Button>
        <Switch
          checked={el.enabled}
          onCheckedChange={onToggle}
          disabled={el.locked}
        />
      </div>
    </div>
  );
}

// ── Template editor panel ────────────────────────────────────────────────────
function TemplateEditor({ template, onChange }) {
  function toggleElement(id) {
    onChange({
      ...template,
      elements: template.elements.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e)
    });
  }

  function moveElement(id, dir) {
    const els = [...template.elements];
    const idx = els.findIndex(e => e.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= els.length) return;
    [els[idx], els[newIdx]] = [els[newIdx], els[idx]];
    onChange({ ...template, elements: els });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Template Name</Label>
          <Input value={template.name} onChange={e => onChange({ ...template, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Document Type</Label>
          <select
            value={template.type}
            onChange={e => onChange({ ...template, type: e.target.value })}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            <option value="invoice">Invoice</option>
            <option value="estimate">Estimate</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Additional Custom Notes <span className="text-muted-foreground text-xs">(appended to every document using this template)</span></Label>
        <Textarea
          rows={2}
          value={template.customNotes || ""}
          onChange={e => onChange({ ...template, customNotes: e.target.value })}
          placeholder="e.g. All work is guaranteed for 10 years. VAT charged at 13.5%."
        />
      </div>

      <div>
        <Label className="mb-2 block">Document Sections</Label>
        <p className="text-xs text-muted-foreground mb-3">Toggle sections on/off and reorder them. Locked sections (like line items) are always included.</p>
        <div className="space-y-2">
          {template.elements.map((el, i) => (
            <ElementRow
              key={el.id}
              el={el}
              onToggle={() => toggleElement(el.id)}
              onMoveUp={() => moveElement(el.id, -1)}
              onMoveDown={() => moveElement(el.id, 1)}
              isFirst={i === 0}
              isLast={i === template.elements.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Templates() {
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [selectedId, setSelectedId] = useState(() => loadTemplates()[0]?.id || null);

  const selected = templates.find(t => t.id === selectedId);

  function updateSelected(updated) {
    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  function handleSave() {
    saveTemplates(templates);
    toast.success("Templates saved!");
  }

  function handleAddTemplate() {
    const tpl = getDefaultTemplate("New Template", "invoice");
    const next = [...templates, tpl];
    setTemplates(next);
    setSelectedId(tpl.id);
  }

  function handleDelete(id) {
    if (templates.length === 1) { toast.error("You need at least one template."); return; }
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    if (selectedId === id) setSelectedId(next[0].id);
  }

  function handlePreview() {
    if (!selected) return;
    const company = getCompanySettings();
    const mockDoc = {
      invoice_number: "INV-0001",
      issued_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      payment_terms: "Net 30",
      notes: "Thank you for choosing us!",
      discount_amount: 0,
      amount_paid: 0,
      line_items: [
        { type: "material", description: "Architectural Shingles 30yr", quantity: 25, unit: "square", unit_price: 130, tax_rate: 13.5 },
        { type: "labor", description: "Tear-off & Installation Labor", quantity: 40, unit: "hr", unit_price: 75, tax_rate: 0 },
      ],
    };
    const mockJob = {
      customer_name: "John & Jane Smith", address: "123 Maple Street",
      city: "Dublin", state: "", zip: "D01 X234",
      customer_phone: "+353 87 123 4567", customer_email: "smithfamily@email.ie",
    };
    generateDocumentPDF({ type: selected.type === "estimate" ? "ESTIMATE" : "INVOICE", doc: mockDoc, job: mockJob, company, template: selected });
  }

  const typeLabel = { invoice: "Invoice", estimate: "Estimate", both: "Both" };
  const typeColor = { invoice: "bg-blue-100 text-blue-700", estimate: "bg-emerald-100 text-emerald-700", both: "bg-purple-100 text-purple-700" };

  return (
    <div>
      <PageHeader title="Document Templates" subtitle="Create and customise templates for your invoices and estimates">
        <Button variant="outline" onClick={handlePreview} disabled={!selected}><Eye className="w-4 h-4 mr-2" /> Preview PDF</Button>
        <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save All</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Template list */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-muted-foreground">Templates</p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddTemplate}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all group ${selectedId === t.id ? "border-primary bg-primary/5" : "hover:border-border/80 hover:bg-muted/30"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <Badge variant="secondary" className={`mt-1 text-xs ${typeColor[t.type]}`}>
                      {t.type === "invoice" ? <Receipt className="w-3 h-3 mr-1 inline" /> : <FileText className="w-3 h-3 mr-1 inline" />}
                      {typeLabel[t.type]}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 flex-shrink-0"
                    onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-3">
          {selected ? (
            <Card>
              <CardHeader><CardTitle className="text-base">Edit: {selected.name}</CardTitle></CardHeader>
              <CardContent>
                <TemplateEditor template={selected} onChange={updateSelected} />
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground text-sm">Select a template to edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}