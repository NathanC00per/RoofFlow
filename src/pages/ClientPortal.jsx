import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Briefcase, FileText, Receipt, LogOut, Phone, Mail,
  Clock, CheckCircle2, AlertCircle, ChevronRight, Building2
} from "lucide-react";

function StatusBadge({ status }) {
  const map = {
    lead: ["bg-slate-100 text-slate-600", "New"],
    estimate_scheduled: ["bg-blue-100 text-blue-700", "Est. Scheduled"],
    estimate_sent: ["bg-purple-100 text-purple-700", "Quote Sent"],
    approved: ["bg-emerald-100 text-emerald-700", "Approved"],
    scheduled: ["bg-amber-100 text-amber-700", "Scheduled"],
    in_progress: ["bg-orange-100 text-orange-700", "In Progress"],
    completed: ["bg-green-100 text-green-700", "Completed"],
    cancelled: ["bg-red-100 text-red-700", "Cancelled"],
    draft: ["bg-slate-100 text-slate-600", "Draft"],
    sent: ["bg-blue-100 text-blue-700", "Sent"],
    partial: ["bg-amber-100 text-amber-700", "Partially Paid"],
    paid: ["bg-green-100 text-green-700", "Paid"],
    overdue: ["bg-red-100 text-red-700", "Overdue"],
    void: ["bg-slate-100 text-slate-500", "Void"],
  };
  const [cls, label] = map[status] || ["bg-muted text-muted-foreground", status];
  return <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>;
}

const TABS = [
  { key: "jobs",      label: "My Jobs",     icon: Briefcase },
  { key: "estimates", label: "Quotes",       icon: FileText },
  { key: "invoices",  label: "Invoices",     icon: Receipt },
];

export default function ClientPortal() {
  const [co, setCo] = useState(getCompanySettings());
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("jobs");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin(window.location.pathname);
    });
    const handle = () => setCo(getCompanySettings());
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  const primary = co.primaryColor || "#1e3a5f";
  const accent  = co.accentColor  || "#e8730a";
  const name    = co.companyName  || "RoofPro";

  const { data: jobs = [] } = useQuery({
    queryKey: ["portal-jobs", user?.email],
    queryFn: () => base44.entities.Job.filter({ customer_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: estimates = [] } = useQuery({
    queryKey: ["portal-estimates", user?.email],
    queryFn: async () => {
      const jobIds = jobs.map(j => j.id);
      if (!jobIds.length) return [];
      return base44.entities.Estimate.list("-created_date", 50);
    },
    enabled: !!user?.email && jobs.length > 0,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["portal-invoices", user?.email],
    queryFn: async () => base44.entities.Invoice.list("-created_date", 50),
    enabled: !!user?.email && jobs.length > 0,
  });

  const jobIds = new Set(jobs.map(j => j.id));
  const myEstimates = estimates.filter(e => jobIds.has(e.job_id));
  const myInvoices  = invoices.filter(i => jobIds.has(i.job_id));

  const overdueInvoices = myInvoices.filter(i => i.status === "overdue").length;
  const balanceDue = myInvoices.reduce((s, i) => s + (i.balance_due || 0), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: primary }}>
        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      {/* Header */}
      <header className="sticky top-0 z-40 shadow-sm" style={{ background: primary }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {co.logoUrl
              ? <img src={co.logoUrl} alt={name} className="h-9 w-9 object-contain rounded-lg bg-white/10 p-0.5" />
              : <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: accent }}>{name[0]}</div>
            }
            <div>
              <p className="text-white font-bold text-base leading-tight">{name}</p>
              <p className="text-white/60 text-xs">Client Portal</p>
            </div>
          </div>
          <button
            onClick={() => base44.auth.logout("/website")}
            className="flex items-center gap-1.5 text-white/70 hover:text-white text-sm transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Welcome */}
        <div className="rounded-2xl p-5 text-white" style={{ background: primary }}>
          <p className="text-white/70 text-sm mb-0.5">Welcome back,</p>
          <h2 className="text-xl font-bold">{user.full_name || user.email}</h2>
          <p className="text-white/60 text-xs mt-1">{user.email}</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
            <p className="text-2xl font-bold text-slate-800">{jobs.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Jobs</p>
          </div>
          <div className="bg-white rounded-2xl p-4 text-center shadow-sm border">
            <p className="text-2xl font-bold text-slate-800">{myInvoices.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Invoices</p>
          </div>
          <div className={`rounded-2xl p-4 text-center shadow-sm border ${overdueInvoices > 0 ? "bg-red-50 border-red-200" : "bg-white"}`}>
            <p className={`text-2xl font-bold ${overdueInvoices > 0 ? "text-red-600" : "text-slate-800"}`}>
              €{balanceDue.toLocaleString()}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Balance Due</p>
          </div>
        </div>

        {/* Overdue alert */}
        {overdueInvoices > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              You have <strong>{overdueInvoices} overdue invoice{overdueInvoices !== 1 ? "s" : ""}</strong>. Please settle these as soon as possible.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 bg-slate-100 rounded-2xl p-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === key ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="space-y-3">
          {tab === "jobs" && (
            jobs.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm border">
                <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No jobs yet</p>
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.id} className="bg-white rounded-2xl p-4 shadow-sm border">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 truncate">{job.address}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{job.city}{job.city && job.job_type ? " · " : ""}{job.job_type?.replace("_", " ")}</p>
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                  {job.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2">{job.description}</p>}
                  {(job.start_date || job.estimated_cost) && (
                    <div className="flex gap-4 mt-3 pt-3 border-t text-xs text-slate-400">
                      {job.start_date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.start_date}</span>}
                      {job.estimated_cost && <span>Est. €{job.estimated_cost.toLocaleString()}</span>}
                    </div>
                  )}
                </div>
              ))
            )
          )}

          {tab === "estimates" && (
            myEstimates.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm border">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No quotes yet</p>
              </div>
            ) : (
              myEstimates.map(est => (
                <div key={est.id} className="bg-white rounded-2xl p-4 shadow-sm border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800">{est.estimate_number || "Estimate"}</p>
                    <StatusBadge status={est.status} />
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    {est.issued_date && <span>Issued: {est.issued_date}</span>}
                    {est.expiry_date && <span>Expires: {est.expiry_date}</span>}
                    {est.total && <span className="font-semibold text-slate-700">€{est.total.toLocaleString()}</span>}
                  </div>
                </div>
              ))
            )
          )}

          {tab === "invoices" && (
            myInvoices.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center shadow-sm border">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No invoices yet</p>
              </div>
            ) : (
              myInvoices.map(inv => (
                <div key={inv.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${inv.status === "overdue" ? "border-red-200 bg-red-50/30" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-slate-800">{inv.invoice_number || "Invoice"}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                  <div className="flex gap-4 text-xs text-slate-400">
                    {inv.due_date && <span>Due: {inv.due_date}</span>}
                    {inv.total != null && <span>Total: €{inv.total.toLocaleString()}</span>}
                    {inv.balance_due > 0 && (
                      <span className="font-semibold text-red-600">Balance: €{inv.balance_due.toLocaleString()}</span>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>

        {/* Contact footer */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border">
          <p className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Contact Us
          </p>
          <div className="space-y-2">
            {co.companyPhone && (
              <a href={`tel:${co.companyPhone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors">
                <Phone className="w-4 h-4" /> {co.companyPhone}
              </a>
            )}
            {co.companyEmail && (
              <a href={`mailto:${co.companyEmail}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition-colors">
                <Mail className="w-4 h-4" /> {co.companyEmail}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}