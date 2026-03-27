import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  MapPin, Phone, Mail, ChevronDown, ChevronUp, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Status styles ─────────────────────────────────────────────────────────────
const EST_STATUS = {
  draft:    "bg-slate-100 text-slate-600",
  sent:     "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired:  "bg-amber-100 text-amber-700",
};
const INV_STATUS = {
  draft:   "bg-slate-100 text-slate-600",
  sent:    "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  paid:    "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void:    "bg-slate-100 text-slate-400",
};
const JOB_STATUS_LABELS = {
  lead: "Enquiry Received", estimate_scheduled: "Estimate Scheduled",
  estimate_sent: "Estimate Sent", approved: "Approved",
  scheduled: "Work Scheduled", in_progress: "Work In Progress",
  completed: "Completed", cancelled: "Cancelled",
};
const JOB_PROGRESS = {
  lead: 10, estimate_scheduled: 20, estimate_sent: 35, approved: 50,
  scheduled: 65, in_progress: 80, completed: 100, cancelled: 0,
};

// ── Email login gate ──────────────────────────────────────────────────────────
function LoginGate({ onLogin }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const company = getCompanySettings();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.includes("@")) { setError("Please enter a valid email."); return; }
    onLogin(email.trim().toLowerCase());
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
            <p className="text-sm text-muted-foreground mb-5">Enter the email address associated with your jobs.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Email address</label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  autoFocus
                />
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
              <Button type="submit" className="w-full">Access My Documents</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ── Job accordion card ────────────────────────────────────────────────────────
function JobAccordion({ job, estimates, invoices }) {
  const [open, setOpen] = useState(false);
  const company = getCompanySettings();
  const progress = JOB_PROGRESS[job.status] ?? 0;

  function downloadEst(est) {
    generateDocumentPDF({ type: "ESTIMATE", doc: est, job, company, template: getTemplateForDoc("estimate") });
  }
  function downloadInv(inv) {
    generateDocumentPDF({ type: "INVOICE", doc: inv, job, company, template: getTemplateForDoc("invoice") });
  }

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left p-5 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="font-semibold text-base">{job.address}</p>
            <Badge className="text-xs bg-primary/10 text-primary capitalize">{JOB_STATUS_LABELS[job.status] || job.status}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1 flex-wrap">
            {job.start_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Started {format(new Date(job.start_date), "MMM d, yyyy")}
              </span>
            )}
            <span className="text-xs text-muted-foreground">{estimates.length} estimate{estimates.length !== 1 ? "s" : ""} · {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Progress bar */}
          {progress > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", progress === 100 ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8">{progress}%</span>
            </div>
          )}
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />}
      </button>

      {open && (
        <div className="border-t divide-y">
          {/* Job details */}
          <div className="px-5 py-4 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Job Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {job.job_type && <div><span className="text-muted-foreground">Type: </span>{job.job_type.replace(/_/g, " ")}</div>}
              {job.roof_type && <div><span className="text-muted-foreground">Roof: </span>{job.roof_type.replace(/_/g, " ")}</div>}
              {job.end_date && <div><span className="text-muted-foreground">Est. completion: </span>{format(new Date(job.end_date), "MMM d, yyyy")}</div>}
            </div>
            {job.description && <p className="mt-2 text-sm text-muted-foreground">{job.description}</p>}
          </div>

          {/* Estimates */}
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
                      <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => downloadEst(est)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
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
                        <p className="text-xs text-muted-foreground">
                          {inv.due_date ? `Due ${format(new Date(inv.due_date), "MMM d, yyyy")}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">€{(inv.total || 0).toLocaleString()}</p>
                        {inv.balance_due > 0 && inv.status !== "paid" && (
                          <p className="text-xs text-amber-600">Balance: €{(inv.balance_due || 0).toLocaleString()}</p>
                        )}
                      </div>
                      <Badge className={cn("text-xs", INV_STATUS[inv.status] || "bg-slate-100 text-slate-600")}>{inv.status}</Badge>
                      <Button size="sm" variant="outline" className="h-7 px-2.5" onClick={() => downloadInv(inv)}>
                        <Download className="w-3.5 h-3.5" />
                      </Button>
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
  const [email, setEmail] = useState(() => sessionStorage.getItem("portal_email") || "");
  const [search, setSearch] = useState("");
  const company = getCompanySettings();

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ["portal_jobs", email],
    queryFn: () => base44.entities.Job.filter({ customer_email: email }),
    enabled: !!email,
  });

  const { data: allEstimates = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list(),
    enabled: !!email,
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
    enabled: !!email,
  });

  function handleLogin(e) {
    sessionStorage.setItem("portal_email", e);
    setEmail(e);
  }

  function handleLogout() {
    sessionStorage.removeItem("portal_email");
    setEmail("");
  }

  if (!email) return <LoginGate onLogin={handleLogin} />;

  const filtered = jobs.filter(j =>
    !search ||
    j.address?.toLowerCase().includes(search.toLowerCase()) ||
    j.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: company.primaryColor || "#1e3a5f" }}>
              <HardHat className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">{company.companyName || "Customer Portal"}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs">Sign out</Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">View your job progress and download your documents.</p>
        </div>

        {/* Company contact */}
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

        {/* Search */}
        {jobs.length > 3 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by address..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}

        {/* Loading */}
        {loadingJobs && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {/* No jobs */}
        {!loadingJobs && jobs.length === 0 && (
          <div className="text-center py-16">
            <HardHat className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="font-medium">No jobs found</p>
            <p className="text-sm text-muted-foreground mt-1">
              No jobs were found for <strong>{email}</strong>.<br />
              Please contact us if you think this is a mistake.
            </p>
          </div>
        )}

        {/* Jobs list */}
        {filtered.map(job => {
          const jobEstimates = allEstimates.filter(e => e.job_id === job.id);
          const jobInvoices  = allInvoices.filter(i => i.job_id === job.id);
          return (
            <JobAccordion key={job.id} job={job} estimates={jobEstimates} invoices={jobInvoices} />
          );
        })}
      </div>
    </div>
  );
}