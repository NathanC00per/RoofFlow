import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { Save, Building2, Palette, CreditCard } from "lucide-react";
import { toast } from "sonner";

export const COMPANY_STORAGE_KEY = "company_settings";
export const COMPANY_DEFAULTS = {
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  vatNumber: "",
  companyReg: "",
  primaryColor: "#1e3a5f",
  accentColor: "#e8730a",
  footerText: "Thank you for your business!",
  // Payment details
  bankName: "",
  accountName: "",
  iban: "",
  bic: "",
  paymentNotes: "",
};

export function getCompanySettings() {
  try {
    const saved = localStorage.getItem(COMPANY_STORAGE_KEY);
    return saved ? { ...COMPANY_DEFAULTS, ...JSON.parse(saved) } : COMPANY_DEFAULTS;
  } catch { return COMPANY_DEFAULTS; }
}

export default function CompanySettings() {
  const [form, setForm] = useState(() => getCompanySettings());
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  function handleSave() {
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(form));
    toast.success("Company settings saved!");
  }

  return (
    <div>
      <PageHeader title="Company Settings" subtitle="Your business details, branding, and payment information">
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
              <Textarea rows={2} value={form.companyAddress} onChange={e => upd("companyAddress", e.target.value)} placeholder="123 Main St, Dublin, Ireland" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.companyPhone} onChange={e => upd("companyPhone", e.target.value)} placeholder="+353 1 234 5678" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={form.companyEmail} onChange={e => upd("companyEmail", e.target.value)} placeholder="info@yourcompany.ie" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Website</Label>
              <Input value={form.companyWebsite} onChange={e => upd("companyWebsite", e.target.value)} placeholder="www.yourcompany.ie" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>VAT Number</Label>
                <Input value={form.vatNumber} onChange={e => upd("vatNumber", e.target.value)} placeholder="IE1234567A" />
              </div>
              <div className="space-y-1.5">
                <Label>Company Reg No.</Label>
                <Input value={form.companyReg} onChange={e => upd("companyReg", e.target.value)} placeholder="123456" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Palette className="w-4 h-4" /> Branding & Colours</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label>Primary Colour <span className="text-muted-foreground text-xs">(header, table header, footer)</span></Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={e => upd("primaryColor", e.target.value)} className="h-10 w-16 rounded cursor-pointer border" />
                <Input value={form.primaryColor} onChange={e => upd("primaryColor", e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Accent Colour <span className="text-muted-foreground text-xs">(document badge, balance due)</span></Label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.accentColor} onChange={e => upd("accentColor", e.target.value)} className="h-10 w-16 rounded cursor-pointer border" />
                <Input value={form.accentColor} onChange={e => upd("accentColor", e.target.value)} className="font-mono" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Document Footer Text</Label>
              <Textarea rows={2} value={form.footerText} onChange={e => upd("footerText", e.target.value)} placeholder="Thank you for your business!" />
            </div>

            {/* Live mini-preview */}
            <div className="rounded-xl overflow-hidden border shadow-sm mt-2">
              <div className="p-3 text-white text-sm font-bold flex justify-between items-center" style={{ background: form.primaryColor }}>
                <span>{form.companyName || "Your Company"}</span>
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: form.accentColor }}>INVOICE</span>
              </div>
              <div className="p-3 bg-white text-xs space-y-1">
                <div className="flex justify-between border-b pb-1 text-gray-400"><span>Description</span><span>Total</span></div>
                <div className="flex justify-between"><span>Roofing Works</span><span>€3,250.00</span></div>
                <div className="flex justify-between border-t pt-1 font-bold"><span>TOTAL</span><span>€3,250.00</span></div>
              </div>
              <div className="p-2 text-white text-center text-xs" style={{ background: form.primaryColor }}>
                {form.footerText || "Thank you for your business!"}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Bank Name</Label>
              <Input value={form.bankName} onChange={e => upd("bankName", e.target.value)} placeholder="Bank of Ireland" />
            </div>
            <div className="space-y-1.5">
              <Label>Account Name</Label>
              <Input value={form.accountName} onChange={e => upd("accountName", e.target.value)} placeholder="Your Roofing Co. Ltd" />
            </div>
            <div className="space-y-1.5">
              <Label>IBAN</Label>
              <Input value={form.iban} onChange={e => upd("iban", e.target.value)} placeholder="IE12 BOFI 9000 0112 3456 78" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>BIC / SWIFT</Label>
              <Input value={form.bic} onChange={e => upd("bic", e.target.value)} placeholder="BOFIIE2D" className="font-mono" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Payment Notes <span className="text-muted-foreground text-xs">(shown on invoices)</span></Label>
              <Textarea rows={2} value={form.paymentNotes} onChange={e => upd("paymentNotes", e.target.value)} placeholder="Please include your invoice number as reference when making payment." />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}