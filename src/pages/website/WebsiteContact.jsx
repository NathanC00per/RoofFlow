import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Phone, Mail, MapPin, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function WebsiteContact() {
  const [co, setCo] = useState(getCompanySettings());
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const handle = () => setCo(getCompanySettings());
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  const primary = co.primaryColor || "#1e3a5f";
  const accent  = co.accentColor  || "#e8730a";

  function upd(k, v) { setForm(p => ({ ...p, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) { toast.error("Please fill in all required fields"); return; }
    setSending(true);
    try {
      // Save to CommunicationLog so it appears in the internal Communications section
      await base44.entities.CommunicationLog.create({
        type: "web_enquiry",
        direction: "incoming",
        phone_number: form.phone || "N/A",
        contact_name: form.name,
        message_body: `Service: ${form.service || "Not specified"}\n\nMessage:\n${form.message}\n\nEmail: ${form.email}`,
        timestamp: new Date().toISOString(),
        status: "completed",
        notes: `Web enquiry from ${form.name} (${form.email})`,
      });

      if (co.companyEmail) {
        await base44.integrations.Core.SendEmail({
          to: co.companyEmail,
          subject: `New enquiry from ${form.name}`,
          body: `Name: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\nService: ${form.service}\n\nMessage:\n${form.message}`,
        });
      }
      setSent(true);
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="py-20 text-white text-center" style={{ background: primary }}>
        <h1 className="text-5xl font-extrabold mb-4">Get in Touch</h1>
        <p className="text-white/75 text-xl max-w-2xl mx-auto px-4">
          Request a free quote or ask us anything — roof inspections are always free of charge.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Contact info */}
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Contact Information</h2>
          <div className="space-y-5">
            {co.companyPhone && (
              <a href={`tel:${co.companyPhone}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}20` }}>
                  <Phone className="w-5 h-5" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Phone</p>
                  <p className="text-slate-800 font-semibold group-hover:underline">{co.companyPhone}</p>
                </div>
              </a>
            )}
            {co.companyEmail && (
              <a href={`mailto:${co.companyEmail}`} className="flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}20` }}>
                  <Mail className="w-5 h-5" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Email</p>
                  <p className="text-slate-800 font-semibold group-hover:underline">{co.companyEmail}</p>
                </div>
              </a>
            )}
            {co.companyAddress && (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${accent}20` }}>
                  <MapPin className="w-5 h-5" style={{ color: accent }} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Address</p>
                  <p className="text-slate-800 font-semibold whitespace-pre-line">{co.companyAddress}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form */}
        <div>
          {sent ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Message Sent!</h3>
              <p className="text-slate-500">Thank you for getting in touch. We'll respond within 24 hours.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="+353..." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email *</Label>
                <Input type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Service Needed</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                  value={form.service}
                  onChange={e => upd("service", e.target.value)}
                >
                  <option value="">Select a service...</option>
                  {["New Roof Installation","Roof Repair","Roof Inspection & Quotation (Free)","PVC Roof System","Resitrix / Rubber Roofing","Maintenance Contract","Other"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Message *</Label>
                <Textarea rows={5} value={form.message} onChange={e => upd("message", e.target.value)} placeholder="Describe what you need..." />
              </div>
              <Button
                type="submit"
                disabled={sending}
                className="w-full text-white border-0 hover:opacity-90"
                style={{ background: primary }}
              >
                {sending ? "Sending..." : "Send Message"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}