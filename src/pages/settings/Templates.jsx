import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/PageHeader";
import { Save, Eye, Plus, Trash2, GripVertical, FileText, Receipt, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { generateDocumentPDF } from "@/lib/generatePDF";
import { getCompanySettings } from "./CompanySettings";

const TEMPLATES_KEY = "doc_templates";

const DEFAULT_ELEMENTS = [
  { id: "header",       label: "Company Header",    description: "Logo, company name & contact info", enabled: true,  locked: true },
  { id: "bill_to",      label: "Bill To / Client",  description: "Customer name, address & contact",  enabled: true,  locked: false },
  { id: "doc_meta",     label: "Document Details",  description: "Number, dates & payment terms",     enabled: true,  locked: false },
  { id: "line_items",   label: "Line Items Table",  description: "Description, qty, price & VAT",     enabled: true,  locked: true },
  { id: "totals",       label: "Totals Summary",    description: "Subtotal, VAT breakdown & total",   enabled: true,  locked: true },
  { id: "payment_info", label: "Payment Details",   description: "IBAN, BIC from company settings",   enabled: true,  locked: false },
  { id: "notes",        label: "Notes",             description: "Customer-facing notes",             enabled: true,  locked: false },
  { id: "footer",       label: "Footer Bar",        description: "Coloured footer with custom text",  enabled: true,  locked: false },
];

function getDefaultTemplate(name, type) {
  return {
    id: `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    type,
    elements: DEFAULT_ELEMENTS.map(e => ({ ...e })),
    customNotes: "",
  };
}

function loadTemplates() {
  try {
    const saved = localStorage.getItem(TEMPLATES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.length > 0) return parsed;
    }
  } catch {}
  return [
    getDefaultTemplate("Standard Invoice", "invoice"),
    getDefaultTemplate("Standard Estimate", "estimate"),
  ];
}

export function getTemplateForDoc(type) {
  const templates = loadTemplates();
  return templates.find(t => t.type === type || t.type === "both") || templates[0] || getDefaultTemplate("Default", "both");
}

const MOCK_DOC = {
  invoice_number: "INV-0001",
  issued_date: new Date().toISOString().slice(0, 10),
  due_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  payment_terms: "Net 30",
  notes: "Thank you for choosing us! Payment is due within 30 days.",
  discount_amount: 0,
  amount_paid: 0,
  line_items: [
    { type: "material", description: "Architectural Shingles 30yr", quantity: 25, unit: "square", unit_price: 130, tax_rate: 13.5 },
    { type: "labor", description: "Tear-off & Installation Labor", quantity: 40, unit: "hr", unit_price: 75, tax_rate: 0 },
  ],
};
const MOCK_JOB = {
  customer_name: "John & Jane Smith", address: "123 Maple Street",
  city: "Dublin", zip: "D01 X234",
  customer_phone: "+353 87 123 4567", customer_email: "smithfamily@email.ie",
};

// ── HTML document preview ─────────────────────────────────────────────────────
function DocPreview({ template, company }) {
  const enabled = (id) => {
    const el = template.elements?.find(e => e.id === id);
    return el ? el.enabled : true;
  };

  const pc = company.primaryColor || "#1e3a5f";
  const ac = company.accentColor || "#e8730a";
  const subtotal = 25 * 130 + 40 * 75;
  const vat = 25 * 130 * 0.135;
  const total = subtotal + vat;

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden text-xs font-sans" style={{ fontFamily: "sans-serif" }}>
      {/* Header */}
      {enabled("header") && (
        <div className="p-4 flex items-start justify-between" style={{ background: pc }}>
          <div className="flex items-center gap-3">
            {company.logoUrl && (
              <img src={company.logoUrl} alt="logo" className="h-10 w-10 object-contain rounded bg-white/10 p-0.5" />
            )}
            <div>
              <p className="font-bold text-white text-sm">{company.companyName || "Your Company"}</p>
              <p className="text-white/80 text-xs">{[company.companyPhone, company.companyEmail].filter(Boolean).join("  |  ")}</p>
              <p className="text-white/70 text-xs">{company.companyAddress}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="px-3 py-1 rounded text-white font-bold text-sm" style={{ background: ac }}>
              {template.type === "estimate" ? "ESTIMATE" : "INVOICE"}
            </div>
            <p className="text-white/80 text-xs mt-1">INV-0001</p>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {/* Bill to + Meta */}
        {(enabled("bill_to") || enabled("doc_meta")) && (
          <div className="grid grid-cols-2 gap-4">
            {enabled("bill_to") && (
              <div>
                <p className="font-bold text-gray-500 uppercase tracking-wide text-xs mb-1">Bill To</p>
                <div className="w-12 h-0.5 mb-2" style={{ background: ac }} />
                <p className="font-semibold text-gray-800">John & Jane Smith</p>
                <p className="text-gray-500">123 Maple Street, Dublin</p>
                <p className="text-gray-500">+353 87 123 4567</p>
              </div>
            )}
            {enabled("doc_meta") && (
              <div>
                <p className="font-bold text-gray-500 uppercase tracking-wide text-xs mb-1">Details</p>
                <div className="w-12 h-0.5 mb-2" style={{ background: ac }} />
                <div className="space-y-0.5">
                  <div className="flex justify-between"><span className="font-semibold text-gray-600">Date:</span><span>{new Date().toLocaleDateString("en-IE")}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-600">Due:</span><span>{new Date(Date.now()+30*86400000).toLocaleDateString("en-IE")}</span></div>
                  <div className="flex justify-between"><span className="font-semibold text-gray-600">Terms:</span><span>Net 30</span></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Line items */}
        {enabled("line_items") && (
          <div>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: pc, color: "white" }}>
                  <th className="text-left p-1.5 text-xs font-semibold">Description</th>
                  <th className="text-right p-1.5 text-xs font-semibold">Qty</th>
                  <th className="text-right p-1.5 text-xs font-semibold">Unit Price</th>
                  <th className="text-right p-1.5 text-xs font-semibold">VAT%</th>
                  <th className="text-right p-1.5 text-xs font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "#f5f7fc" }}>
                  <td className="p-1.5">Architectural Shingles 30yr</td>
                  <td className="p-1.5 text-right">25</td>
                  <td className="p-1.5 text-right">€130.00</td>
                  <td className="p-1.5 text-right">13.5%</td>
                  <td className="p-1.5 text-right font-medium">€3,250.00</td>
                </tr>
                <tr>
                  <td className="p-1.5">Tear-off & Installation Labor</td>
                  <td className="p-1.5 text-right">40</td>
                  <td className="p-1.5 text-right">€75.00</td>
                  <td className="p-1.5 text-right">—</td>
                  <td className="p-1.5 text-right font-medium">€3,000.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Totals */}
        {enabled("totals") && (
          <div className="flex justify-end">
            <div className="w-48 space-y-1">
              <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>€{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-500"><span>VAT @ 13.5%</span><span>€{vat.toFixed(2)}</span></div>
              <div className="border-t border-gray-200 my-1" />
              <div className="flex justify-between font-bold text-gray-800"><span>TOTAL</span><span>€{total.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold" style={{ color: ac }}><span>BALANCE DUE</span><span>€{total.toFixed(2)}</span></div>
            </div>
          </div>
        )}

        {/* Payment Info */}
        {enabled("payment_info") && (company.iban || company.bankName) && (
          <div className="p-3 rounded bg-gray-50 border border-gray-200">
            <p className="font-bold text-gray-500 uppercase tracking-wide text-xs mb-1.5">Payment Details</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {company.bankName && <><span className="font-semibold text-gray-600">Bank:</span><span>{company.bankName}</span></>}
              {company.accountName && <><span className="font-semibold text-gray-600">Account:</span><span>{company.accountName}</span></>}
              {company.iban && <><span className="font-semibold text-gray-600">IBAN:</span><span className="font-mono">{company.iban}</span></>}
              {company.bic && <><span className="font-semibold text-gray-600">BIC:</span><span className="font-mono">{company.bic}</span></>}
            </div>
            {company.paymentNotes && <p className="text-gray-500 mt-1 italic">{company.paymentNotes}</p>}
          </div>
        )}

        {/* Notes */}
        {enabled("notes") && (
          <div>
            <p className="font-bold text-gray-500 uppercase tracking-wide text-xs mb-1">Notes</p>
            <p className="text-gray-600">Thank you for choosing us! Payment is due within 30 days.
              {template.customNotes ? " " + template.customNotes : ""}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {enabled("footer") && (
        <div className="p-2 text-center text-white text-xs" style={{ background: pc }}>
          {company.footerText || "Thank you for your business!"}
        </div>
      )}
    </div>
  );
}

// ── Element row ───────────────────────────────────────────────────────────────
function ElementRow({ el, onToggle, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${el.enabled ? "bg-background border-border" : "bg-muted/20 border-border/50 opacity-60"}`}>
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{el.label}</p>
          {el.locked && <Badge variant="secondary" className="text-xs h-4 px-1.5">Fixed</Badge>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{el.description}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          className="p-1 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground text-xs"
          onClick={onMoveUp} disabled={isFirst || el.locked}
        >↑</button>
        <button
          className="p-1 rounded hover:bg-muted disabled:opacity-30 text-muted-foreground text-xs"
          onClick={onMoveDown} disabled={isLast || el.locked}
        >↓</button>
        <Switch checked={el.enabled} onCheckedChange={onToggle} disabled={el.locked} className="ml-1" />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Templates() {
  const [templates, setTemplates] = useState(() => loadTemplates());
  const [selectedId, setSelectedId] = useState(() => loadTemplates()[0]?.id || null);

  const selected = templates.find(t => t.id === selectedId);
  const company = useMemo(() => getCompanySettings(), [selectedId]);

  function updateSelected(updated) {
    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
  }

  function toggleElement(id) {
    if (!selected) return;
    updateSelected({
      ...selected,
      elements: selected.elements.map(e => e.id === id ? { ...e, enabled: !e.enabled } : e)
    });
  }

  function moveElement(id, dir) {
    if (!selected) return;
    const els = [...selected.elements];
    const idx = els.findIndex(e => e.id === id);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= els.length) return;
    [els[idx], els[newIdx]] = [els[newIdx], els[idx]];
    updateSelected({ ...selected, elements: els });
  }

  function handleSave() {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
    toast.success("Templates saved!");
  }

  function handleAddTemplate() {
    const tpl = getDefaultTemplate("New Template", "invoice");
    setTemplates(prev => [...prev, tpl]);
    setSelectedId(tpl.id);
  }

  function handleDelete(id) {
    if (templates.length === 1) { toast.error("You need at least one template."); return; }
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    if (selectedId === id) setSelectedId(next[0].id);
  }

  function handlePreviewPDF() {
    if (!selected) return;
    const co = getCompanySettings();
    generateDocumentPDF({
      type: selected.type === "estimate" ? "ESTIMATE" : "INVOICE",
      doc: MOCK_DOC,
      job: MOCK_JOB,
      company: co,
      template: selected,
    });
  }

  const typeLabel = { invoice: "Invoice", estimate: "Estimate", both: "Both" };
  const typeBadge = {
    invoice: "bg-blue-100 text-blue-700",
    estimate: "bg-emerald-100 text-emerald-700",
    both: "bg-purple-100 text-purple-700",
  };

  return (
    <div>
      <PageHeader title="Document Templates" subtitle="Design and manage PDF templates for invoices and estimates">
        <Button variant="outline" onClick={handlePreviewPDF} disabled={!selected}>
          <Eye className="w-4 h-4 mr-2" />Preview PDF
        </Button>
        <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save All</Button>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* ── Left: template list ── */}
        <div className="xl:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Templates</p>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddTemplate}>
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`group relative p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedId === t.id
                    ? "border-primary/50 bg-primary/5 shadow-sm"
                    : "border-border hover:border-border hover:bg-muted/30"
                }`}
              >
                {selectedId === t.id && (
                  <CheckCircle2 className="absolute top-2 right-2 w-3.5 h-3.5 text-primary" />
                )}
                <p className="text-sm font-medium pr-5 truncate">{t.name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <Badge className={`text-xs h-4 px-1.5 ${typeBadge[t.type]}`}>
                    {t.type === "invoice" ? <Receipt className="w-2.5 h-2.5 mr-0.5 inline" /> : <FileText className="w-2.5 h-2.5 mr-0.5 inline" />}
                    {typeLabel[t.type]}
                  </Badge>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all"
                    onClick={e => { e.stopPropagation(); handleDelete(t.id); }}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Middle: editor ── */}
        <div className="xl:col-span-2">
          {selected ? (
            <div className="bg-card rounded-xl border p-5 space-y-5">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Template Settings</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      value={selected.name}
                      onChange={e => updateSelected({ ...selected, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Document Type</Label>
                    <select
                      value={selected.type}
                      onChange={e => updateSelected({ ...selected, type: e.target.value })}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      <option value="invoice">Invoice</option>
                      <option value="estimate">Estimate</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Custom Notes <span className="text-muted-foreground">(appended to every doc)</span></Label>
                <Textarea
                  rows={2}
                  value={selected.customNotes || ""}
                  onChange={e => updateSelected({ ...selected, customNotes: e.target.value })}
                  placeholder="e.g. All work guaranteed 10 years. VAT @ 13.5%."
                />
              </div>

              <Separator />

              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Document Sections</p>
                <p className="text-xs text-muted-foreground mb-3">Toggle sections on/off — the preview updates instantly.</p>
                <div className="space-y-2">
                  {selected.elements.map((el, i) => (
                    <ElementRow
                      key={el.id}
                      el={el}
                      onToggle={() => toggleElement(el.id)}
                      onMoveUp={() => moveElement(el.id, -1)}
                      onMoveDown={() => moveElement(el.id, 1)}
                      isFirst={i === 0}
                      isLast={i === selected.elements.length - 1}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl">
              <p className="text-muted-foreground text-sm">Select a template to edit</p>
            </div>
          )}
        </div>

        {/* ── Right: live HTML preview ── */}
        <div className="xl:col-span-2">
          <div className="sticky top-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Live Preview</p>
            {selected ? (
              <DocPreview key={JSON.stringify(selected)} template={selected} company={company} />
            ) : (
              <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground text-sm">No template selected</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}