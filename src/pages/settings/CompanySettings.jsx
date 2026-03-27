import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/shared/PageHeader";
import { Save, Upload, X, Building2, Palette, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export const COMPANY_STORAGE_KEY = "company_settings";
export const COMPANY_DEFAULTS = {
  companyName: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  companyWebsite: "",
  vatNumber: "",
  companyReg: "",
  logoUrl: "",
  primaryColor: "#1e3a5f",
  accentColor: "#e8730a",
  footerText: "Thank you for your business!",
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

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 rounded-md bg-primary/10"><Icon className="w-4 h-4 text-primary" /></div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function CompanySettings() {
  const [form, setForm] = useState(() => getCompanySettings());
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);
  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      upd("logoUrl", file_url);
      toast.success("Logo uploaded!");
    } catch {
      toast.error("Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  }

  function handleSave() {
    localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(form));
    toast.success("Company settings saved!");
  }

  return (
    <div className="max-w-4xl">
      <PageHeader title="Company Settings" subtitle="Business details, branding, and payment information used on all documents">
        <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save Settings</Button>
      </PageHeader>

      <div className="space-y-8">
        {/* ── Company Info ── */}
        <div className="bg-card rounded-xl border p-6">
          <Section icon={Building2} title="Company Information">
            {/* Logo */}
            <div className="flex items-start gap-6 pb-2">
              <div className="flex-shrink-0">
                <Label className="text-sm font-medium block mb-2">Company Logo</Label>
                <div
                  className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors relative"
                  onClick={() => logoInputRef.current?.click()}
                >
                  {form.logoUrl ? (
                    <>
                      <img src={form.logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                      <button
                        className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5"
                        onClick={e => { e.stopPropagation(); upd("logoUrl", ""); }}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      {uploadingLogo
                        ? <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                        : <><Upload className="w-5 h-5 text-muted-foreground mx-auto mb-1" /><p className="text-xs text-muted-foreground">Upload</p></>
                      }
                    </div>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company Name">
                  <Input value={form.companyName} onChange={e => upd("companyName", e.target.value)} placeholder="Your Roofing Co." />
                </Field>
                <Field label="Website">
                  <Input value={form.companyWebsite} onChange={e => upd("companyWebsite", e.target.value)} placeholder="www.yourcompany.ie" />
                </Field>
                <Field label="Phone">
                  <Input value={form.companyPhone} onChange={e => upd("companyPhone", e.target.value)} placeholder="+353 1 234 5678" />
                </Field>
                <Field label="Email">
                  <Input value={form.companyEmail} onChange={e => upd("companyEmail", e.target.value)} placeholder="info@yourcompany.ie" />
                </Field>
              </div>
            </div>

            <Field label="Address">
              <Textarea rows={2} value={form.companyAddress} onChange={e => upd("companyAddress", e.target.value)} placeholder="123 Main St, Dublin, Ireland" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="VAT Number">
                <Input value={form.vatNumber} onChange={e => upd("vatNumber", e.target.value)} placeholder="IE1234567A" />
              </Field>
              <Field label="Company Reg No.">
                <Input value={form.companyReg} onChange={e => upd("companyReg", e.target.value)} placeholder="123456" />
              </Field>
            </div>
          </Section>
        </div>

        {/* ── Branding ── */}
        <div className="bg-card rounded-xl border p-6">
          <Section icon={Palette} title="Branding & Colours">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Field label="Primary Colour" hint="header, table header, footer">
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.primaryColor} onChange={e => upd("primaryColor", e.target.value)} className="h-9 w-14 rounded-md cursor-pointer border p-0.5" />
                    <Input value={form.primaryColor} onChange={e => upd("primaryColor", e.target.value)} className="font-mono text-sm" />
                  </div>
                </Field>
                <Field label="Accent Colour" hint="badge, balance due highlight">
                  <div className="flex items-center gap-3">
                    <input type="color" value={form.accentColor} onChange={e => upd("accentColor", e.target.value)} className="h-9 w-14 rounded-md cursor-pointer border p-0.5" />
                    <Input value={form.accentColor} onChange={e => upd("accentColor", e.target.value)} className="font-mono text-sm" />
                  </div>
                </Field>
                <Field label="Document Footer Text">
                  <Textarea rows={2} value={form.footerText} onChange={e => upd("footerText", e.target.value)} placeholder="Thank you for your business!" />
                </Field>
              </div>

              {/* Live preview */}
              <div>
                <Label className="text-sm font-medium block mb-2">Live Preview</Label>
                <div className="rounded-xl overflow-hidden border shadow-sm text-xs">
                  <div className="p-3 flex items-center justify-between" style={{ background: form.primaryColor }}>
                    <div className="flex items-center gap-2">
                      {form.logoUrl && <img src={form.logoUrl} alt="" className="h-7 w-7 rounded object-contain bg-white/10 p-0.5" />}
                      <span className="font-bold text-white text-sm">{form.companyName || "Your Company"}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-bold text-white text-xs" style={{ background: form.accentColor }}>INVOICE</span>
                  </div>
                  <div className="p-3 bg-white space-y-1.5">
                    <div className="grid grid-cols-2 border-b pb-1.5 text-gray-400 text-xs"><span>Description</span><span className="text-right">Total</span></div>
                    <div className="grid grid-cols-2 text-xs"><span>Roofing Works</span><span className="text-right">€3,250.00</span></div>
                    <div className="grid grid-cols-2 text-xs"><span>Labour</span><span className="text-right">€1,200.00</span></div>
                    <Separator className="my-1" />
                    <div className="grid grid-cols-2 text-xs font-bold"><span>TOTAL</span><span className="text-right">€4,450.00</span></div>
                  </div>
                  <div className="py-1.5 text-white text-center text-xs" style={{ background: form.primaryColor }}>
                    {form.footerText || "Thank you for your business!"}
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>

        {/* ── Payment Details ── */}
        <div className="bg-card rounded-xl border p-6">
          <Section icon={CreditCard} title="Payment Details">
            <p className="text-xs text-muted-foreground -mt-2">These details appear in the Payment Details section on invoices.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Bank Name">
                <Input value={form.bankName} onChange={e => upd("bankName", e.target.value)} placeholder="Bank of Ireland" />
              </Field>
              <Field label="Account Name">
                <Input value={form.accountName} onChange={e => upd("accountName", e.target.value)} placeholder="Your Roofing Co. Ltd" />
              </Field>
              <Field label="IBAN">
                <Input value={form.iban} onChange={e => upd("iban", e.target.value)} placeholder="IE12 BOFI 9000 0112 3456 78" className="font-mono" />
              </Field>
              <Field label="BIC / SWIFT">
                <Input value={form.bic} onChange={e => upd("bic", e.target.value)} placeholder="BOFIIE2D" className="font-mono" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Payment Instructions" hint="shown on invoices">
                  <Textarea rows={2} value={form.paymentNotes} onChange={e => upd("paymentNotes", e.target.value)} placeholder="Please include your invoice number as reference when making payment." />
                </Field>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}