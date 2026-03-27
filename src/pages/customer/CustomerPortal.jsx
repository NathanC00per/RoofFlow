import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { generateDocumentPDF } from "@/lib/generatePDF";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { getTemplateForDoc } from "@/pages/settings/Templates";
import { format } from "date-fns";
import {
  Search, Download, FileText, Receipt, HardHat,
  Phone, Mail, ChevronDown, ChevronUp, Calendar, Lock, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────
function simpleHash(str) { return btoa(encodeURIComponent(str)); }

const SESSION_KEY = "portal_session";

function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch { return null; }
}
function saveSession(data) { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); }
function clearSession() { sessionStorage.removeItem(SESSION_KEY); }

// ── Status maps ───────────────────────────────────────────────────────────────
const EST_STATUS  = { draft:"bg-slate-100 text-slate-600", sent:"bg-blue-100 text-blue-700", approved:"bg-emerald-100 text-emerald-700", rejected:"bg-red-100 text-red-700", expired:"bg-amber-100 text-amber-700" };
const INV_STATUS  = { draft:"bg-slate-100 text-slate-600", sent:"bg-blue-100 text-blue-700", partial:"bg-amber-100 text-amber-700", paid:"bg-emerald-100 text-emerald-700", overdue:"bg-red-100 text-red-700", void:"bg-slate-100 text-slate-400" };
const JOB_LABELS  = { lead:"Enquiry Received", estimate_scheduled:"Estimate Scheduled", estimate_sent:"Estimate Sent", approved:"Approved", scheduled:"Work Scheduled", in_progress:"Work In Progress", completed:"Completed", cancelled:"Cancelled" };
const JOB_PROGRESS= { lead:10, estimate_scheduled:20, estimate_sent:35, approved:50, scheduled:65, in_progress:80, completed:100, cancelled:0 };

// ── Login Screen ──────────────────────────────────────────────────────────────
function LoginScreen({ onSuccess }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const company = getCompanySettings();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    const customers = await base44.entities.Customer.filter({ email: email.trim().toLowerCase() });
    const customer = customers[0];
    if (!customer) { setError("No account found for this email address."); setLoading(false); return; }
    if (!customer.portal_enabled) { setError("Portal access has not been enabled for your account. Please contact us."); setLoading(false); return; }
    if (customer.portal_password_hash !== simpleHash(password)) { setError("Incorrect password. Please try again."); setLoading(false); return; }
    setLoading(false);
    onSuccess(customer);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <HardHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">{company.companyName || "Customer Portal"}</h1>
          <p className="text-slate-400 text-sm mt-1">View your jobs, estimates & invoices</p>
        </div>
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="font-semibold text-base mb-1">Sign in to your account</h2>
            <p className="text-sm text-muted-foreground mb-5">Use the email and password provided by our team.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email address</label>
                <Input type="email" placeholder="you@example.com" value={email} onChange={e => { setEmail(e.target.value); setError(""); }} autoFocus required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Password</label>
                <Input type="password" placeholder="••••••••" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} required />
              </div>
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── First-login: set own password + GDPR consent ──────────────────────────────
function FirstLoginScreen({ customer, onComplete }) {
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [gdpr, setGdpr]             = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const company = getCompanySettings();
  const qc = useQueryClient();

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (!gdpr) { setError("You must accept the data processing terms to continue."); return; }
    setLoading(true);
    await base44.entities.Customer.update(customer.id, {
      portal_password_hash: simpleHash(password),
      portal_first_login: false,
      gdpr_consent: true,
      gdpr_consent_date: new Date().toISOString().split("T")[0],
    });
    qc.invalidateQueries(["customers"]);
    setLoading(false);
    onComplete({ ...customer, portal_first_login: false, gdpr_consent: true });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome to your portal</h1>
          <p className="text-slate-400 text-sm mt-1">Please set your personal password to continue.</p>
        </div>
        <Card className="border-0 shadow-2xl">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">New password</label>
                <Input type="password" placeholder="Min. 8 characters" value={password} onChange={e => { setPassword(e.target.value); setError(""); }} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirm password</label>
                <Input type="password" placeholder="Repeat password" value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} required />
              </div>

              {/* GDPR consent */}
              <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs font-semibold">Data Processing Consent (GDPR)</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  By using this portal, <strong>{company.companyName || "our company"}</strong> will store and process your personal data (name, contact details, project photos, and financial documents) for the purpose of managing your roofing project. Your data is kept securely and not shared with third parties. You may request deletion at any time by contacting us.
                </p>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} className="mt-0.5 flex-shrink-0" />
                  <span>I understand and consent to my data being processed as described above.</span>
                </label>
              </div>

              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !gdpr}>
                {loading ? "Setting up..." : "Set password & continue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Job accordion ─────────────────────────────────────────────────────────────
function JobAccordion({ job, estimates, invoices }) {
  const [open, setOpen] = useState(false);
  const company = getCompanySettings();
  const progress = JOB_PROGRESS[job.status] ?? 0;

  function downloadEst(est) { generateDocumentPDF({ type: "ESTIMATE", doc: est, job, company, template: getTemplateForDoc("estimate") }); }
  function downloadInv(inv) { generateDocumentPDF({ type: "INVOICE",  doc: inv, job, company, template: getTemplateForDoc("invoice") }); }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <button className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-semibold text-base">{job.address}</p>
            <Badge className="text-xs bg-primary/10 text-primary capitalize">{JOB_LABELS[job.status] || job.status}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {job.start_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Started {format(new Date(job.start_date), "MMM d, yyyy")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{estimates.length} estimate{estimates.length !== 1 ? "s" : ""} · {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
          </div>
          {progress > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={cn("h-full rounded-full transition-all", progress === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-muted-foreground w-8">{progress}%</span>
            </div>
          )}
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="border-t divide-y">
          <div className="px-5 py-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Job Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {job.job_type && <div><span className="text-muted-foreground">Type: </span>{job.job_type.replace(/_/g, " ")}</div>}
              {job.roof_type && <div><span className="text-muted-foreground">Roof: </span>{job.roof_type.replace(/_/g, " ")}</div>}
              {job.end_date && <div><span className="text-muted-foreground">Est. completion: </span>{format(new Date(job.end_date), "MMM d, yyyy")}</div>}
            </div>
            {job.description && <p className="mt-2 text-sm text-muted-foreground">{job.description}</p>}
          </div>

          {estimates.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Estimates</p>
              <div className="space-y-2">
                {estimates.map(est => (
                  <div key={est.id} className="flex items-center justify-between rounded-lg border px-4 py-3 bg-background">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{est.estimate_number || "Estimate"}</p>
                        <p className="text-xs text-muted-foreground">{est.issued_date ? format(new Date(est.issued_date), "MMM d, yyyy") : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">€{(est.total || 0).toLocaleString()}</span>
                      <Badge className={cn("text-xs", EST_STATUS[est.status] || "bg-slate-100 text-slate-600")}>{est.status}</Badge>
                      <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => downloadEst(est)}><Download className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {invoices.length > 0 && (
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Invoices</p>
              <div className="space-y-2">
                {invoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg border px-4 py-3 bg-background">
                    <div className="flex items-center gap-3">
                      <Receipt className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{inv.invoice_number || "Invoice"}</p>
                        <p className="text-xs text-muted-foreground">{inv.due_date ? `Due ${format(new Date(inv.due_date), "MMM d, yyyy")}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">€{(inv.total || 0).toLocaleString()}</p>
                        {inv.balance_due > 0 && inv.status !== "paid" && <p className="text-xs text-amber-600">Balance: €{inv.balance_due.toLocaleString()}</p>}
                      </div>
                      <Badge className={cn("text-xs", INV_STATUS[inv.status] || "bg-slate-100 text-slate-600")}>{inv.status}</Badge>
                      <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => downloadInv(inv)}><Download className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {estimates.length === 0 && invoices.length === 0 && (
            <div className="px-5 py-4 text-sm text-muted-foreground">No documents yet for this job.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main portal ───────────────────────────────────────────────────────────────
export default function CustomerPortal() {
  const [session, setSession] = useState(() => getSession());
  const [search, setSearch]   = useState("");
  const company = getCompanySettings();
  const qc = useQueryClient();

  const customer = session?.customer;

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["portal_jobs", customer?.email],
    queryFn: () => base44.entities.Job.filter({ customer_email: customer.email }),
    enabled: !!customer && !customer.portal_first_login,
  });

  const { data: allEstimates = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list(),
    enabled: !!customer && !customer.portal_first_login,
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: !!customer && !customer.portal_first_login,
  });

  function handleLogin(c) {
    if (c.portal_first_login) {
      setSession({ customer: c });
    } else {
      const sess = { customer: c };
      saveSession(sess);
      setSession(sess);
    }
  }

  function handleFirstLoginComplete(updatedCustomer) {
    const sess = { customer: updatedCustomer };
    saveSession(sess);
    setSession(sess);
  }

  function handleLogout() { clearSession(); setSession(null); }

  if (!customer) return <LoginScreen onSuccess={handleLogin} />;
  if (customer.portal_first_login) return (
    <FirstLoginScreen customer={customer} onComplete={handleFirstLoginComplete} />
  );

  const filtered = jobs.filter(j =>
    !search || j.address?.toLowerCase().includes(search.toLowerCase()) || j.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: company.primaryColor || "#1e3a5f" }}>
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">{company.companyName || "Customer Portal"}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{customer.first_name} {customer.last_name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs">Sign out</Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">View your job progress and download your documents.</p>
        </div>

        {(company.companyPhone || company.companyEmail) && (
          <Card className="border-0 bg-primary/5">
            <CardContent className="p-4 flex flex-wrap gap-4 text-sm">
              <p className="font-medium text-primary w-full text-xs uppercase tracking-wide">Contact Us</p>
              {company.companyPhone && (
                <a href={`tel:${company.companyPhone}`} className="flex items-center gap-1.5 text-foreground hover:text-primary">
                  <Phone className="w-3.5 h-3.5" /> {company.companyPhone}
                </a>
              )}
              {company.companyEmail && (
                <a href={`mailto:${company.companyEmail}`} className="flex items-center gap-1.5 text-foreground hover:text-primary">
                  <Mail className="w-3.5 h-3.5" /> {company.companyEmail}
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {jobs.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by address..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}

        {loadingJobs && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!loadingJobs && jobs.length === 0 && (
          <div className="text-center py-16">
            <HardHat className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-medium">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">No jobs are linked to your account yet.<br />Please contact us if you think this is a mistake.</p>
          </div>
        )}

        {filtered.map(job => {
          const jobEstimates = allEstimates.filter(e => e.job_id === job.id);
          const jobInvoices  = allInvoices.filter(i => i.job_id === job.id);
          return <JobAccordion key={job.id} job={job} estimates={jobEstimates} invoices={jobInvoices} />;
        })}
      </div>
    </div>
  );
}