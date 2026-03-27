import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { Save, Eye, Building2, Palette } from "lucide-react";
import { toast } from "sonner";
import { generateDocumentPDF } from "@/lib/generatePDF";

const STORAGE_KEY = "doc_template_settings";

const DEFAULTS = {
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  primaryColor: "#1e3a5f",
  accentColor: "#e8730a",
  footerText: "Thank you for your business!",
};

export default function Templates() {
  const [form, setForm] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS;
    } catch { return DEFAULTS; }
  });

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  function handleSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    toast.success("Template settings saved!");
  }

  function handlePreview() {
    const mockDoc = {
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
        { type: "material", description: "Synthetic Underlayment", quantity: 10, unit: "roll", unit_price: 72, tax_rate: 13.5 },
        { type: "other", description: "Permit Fee", quantity: 1, unit: "each", unit_price: 250, tax_rate: 0 },
      ],
    };
    const mockJob = {
      customer_name: "John & Jane Smith",
      address: "123 Maple Street",
      city: "Springfield",
      state: "IL",
      zip: "62701",
      customer_phone: "(555) 123-4567",
      customer_email: "smithfamily@email.com",
    };
    generateDocumentPDF({ type: "INVOICE", doc: mockDoc, job: mockJob, template: form });
  }

  return (
    <div>
      <PageHeader title="Document Templates" subtitle="Customize how your invoices and estimates look when exported to PDF">
        <Button variant="outline" onClick={handlePreview}><Eye className="w-4 h-4 mr-2" /> Preview PDF</Button>
        <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" /> Save Settings</Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Info */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" /> Company Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <Input value={form.companyName} onChange={e => upd("companyName", e.target.value)} placeholder="Your Roofing Co." />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={form.companyAddress} onChange={e => upd("companyAddress", e.target.value)} placeholder="123 Main St, City, State ZIP" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.companyPhone} onChange={e => upd("companyPhone", e.target.value)} placeholder="(555) 000-0000" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.companyEmail} onChange={e => upd("companyEmail", e.target.value)} placeholder="info@yourcompany.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.companyWebsite} onChange={e => upd("companyWebsite", e.target.value)} placeholder="www.yourcompany.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Footer Text</Label>
              <Textarea rows={2} value={form.footerText} onChange={e => upd("footerText", e.target.value)} placeholder="Thank you for your business!" />
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Branding & Colors</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1.5">
              <Label>Primary Color <span className="text-muted-foreground text-xs">(header, table header, footer)</span></Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={e => upd("primaryColor", e.target.value)} className="h-10 w-16 rounded cursor-pointer border" />
                <Input value={form.primaryColor} onChange={e => upd("primaryColor", e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Accent Color <span className="text-muted-foreground text-xs">(document type badge, balance due)</span></Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.accentColor} onChange={e => upd("accentColor", e.target.value)} className="h-10 w-16 rounded cursor-pointer border" />
                <Input value={form.accentColor} onChange={e => upd("accentColor", e.target.value)} className="font-mono" />
              </div>
            </div>

            {/* Live preview card */}
            <div className="rounded-xl overflow-hidden border shadow-sm">
              <div className="p-4 text-white text-sm font-bold flex justify-between items-center" style={{ background: form.primaryColor }}>
                <span>{form.companyName || "Your Company"}</span>
                <span className="px-3 py-1 rounded text-xs font-bold" style={{ background: form.accentColor }}>INVOICE</span>
              </div>
              <div className="p-4 bg-white text-xs space-y-1.5">
                <div className="flex justify-between border-b pb-1"><span className="text-gray-500">Description</span><span className="text-gray-500">Total</span></div>
                <div className="flex justify-between"><span>Architectural Shingles</span><span>$3,250.00</span></div>
                <div className="flex justify-between"><span>Labor</span><span>$3,000.00</span></div>
                <div className="flex justify-between border-t pt-1 font-bold"><span>TOTAL</span><span>$6,655.50</span></div>
              </div>
              <div className="p-2 text-white text-center text-xs" style={{ background: form.primaryColor }}>
                {form.footerText || "Thank you for your business!"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}