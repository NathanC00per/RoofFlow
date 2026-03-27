import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  Mail, Phone, MapPin, ShieldCheck, Shield, Briefcase,
  FileText, Receipt, ArrowLeft, ArrowRight, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";

const JOB_STATUS_COLORS = {
  lead: "bg-slate-100 text-slate-600",
  estimate_scheduled: "bg-sky-100 text-sky-700",
  estimate_sent: "bg-blue-100 text-blue-700",
  approved: "bg-violet-100 text-violet-700",
  scheduled: "bg-amber-100 text-amber-700",
  in_progress: "bg-orange-100 text-orange-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

const INV_STATUS = {
  draft: "bg-slate-100 text-slate-600", sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700", paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700", void: "bg-slate-100 text-slate-400",
};

export default function CustomerDetail() {
  const { id } = useParams();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => base44.entities.Customer.filter({ id }),
    select: d => d[0],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
    enabled: !!customer,
    select: jobs => jobs.filter(j => j.customer_email === customer?.email),
  });

  const { data: allEstimates = [] } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list(),
  });

  const { data: allInvoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list(),
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!customer) return (
    <div className="text-center py-24 text-muted-foreground">Customer not found.</div>
  );

  const jobIds = jobs.map(j => j.id);
  const estimates = allEstimates.filter(e => jobIds.includes(e.job_id));
  const invoices  = allInvoices.filter(i => jobIds.includes(i.job_id));
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalPaid     = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding   = invoices.filter(i => !["paid","void"].includes(i.status)).reduce((s, i) => s + (i.balance_due || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <Link to="/customers" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Customers
        </Link>
      </div>

      <PageHeader
        title={`${customer.first_name} ${customer.last_name}`}
        subtitle={customer.email}
      >
        <Link to="/customers">
          <Button variant="outline" size="sm">Edit</Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col — details */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {customer.email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="w-4 h-4" />{customer.email}</p>}
              {customer.phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="w-4 h-4" />{customer.phone}</p>}
              {customer.address && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" />{customer.address}{customer.city ? `, ${customer.city}` : ""}{customer.zip ? ` ${customer.zip}` : ""}</p>}
              {customer.notes && <p className="pt-2 text-muted-foreground border-t">{customer.notes}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Portal & GDPR</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {customer.portal_enabled
                  ? <><ShieldCheck className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600 font-medium">Portal enabled</span></>
                  : <><Shield className="w-4 h-4 text-slate-400" /><span className="text-muted-foreground">Portal disabled</span></>
                }
              </div>
              {customer.portal_first_login && customer.portal_enabled && (
                <p className="text-xs text-amber-600">⚠ Customer has not logged in yet</p>
              )}
              <div className="pt-1 border-t">
                {customer.gdpr_consent
                  ? <p className="text-emerald-600">✓ GDPR consent given {customer.gdpr_consent_date ? `on ${format(new Date(customer.gdpr_consent_date), "dd MMM yyyy")}` : ""}</p>
                  : <p className="text-amber-600">⚠ GDPR consent not yet recorded</p>
                }
              </div>
            </CardContent>
          </Card>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Jobs", value: jobs.length, icon: Briefcase },
              { label: "Estimates", value: estimates.length, icon: FileText },
              { label: "Invoices", value: invoices.length, icon: Receipt },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-3 text-center">
                  <s.icon className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Financial Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total invoiced</span><span className="font-semibold">€{totalInvoiced.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total paid</span><span className="font-semibold text-emerald-600">€{totalPaid.toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Outstanding</span><span className={cn("font-bold", outstanding > 0 ? "text-amber-600" : "text-emerald-600")}>€{outstanding.toLocaleString()}</span></div>
            </CardContent>
          </Card>
        </div>

        {/* Right col — jobs / docs */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Jobs</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {jobs.length === 0 && <p className="text-sm text-muted-foreground">No jobs linked yet.</p>}
              {jobs.map(job => (
                <Link key={job.id} to={`/jobs/${job.id}`}>
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{job.address}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge className={cn("text-xs", JOB_STATUS_COLORS[job.status])}>{job.status?.replace(/_/g, " ")}</Badge>
                        {job.start_date && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(job.start_date), "MMM d, yyyy")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {job.estimated_cost && <span className="text-sm font-semibold">€{Number(job.estimated_cost).toLocaleString()}</span>}
                      <ArrowRight className="w-4 h-4 text-muted-foreground/40" />
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Estimates</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {estimates.length === 0 && <p className="text-sm text-muted-foreground">No estimates yet.</p>}
              {estimates.map(est => (
                <Link key={est.id} to={`/estimates/${est.id}`}>
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{est.estimate_number || "Estimate"}</p>
                        <p className="text-xs text-muted-foreground">{est.issued_date ? format(new Date(est.issued_date), "MMM d, yyyy") : ""}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">€{(est.total || 0).toLocaleString()}</span>
                      <Badge className={cn("text-xs", { draft:"bg-slate-100 text-slate-600", sent:"bg-blue-100 text-blue-700", approved:"bg-emerald-100 text-emerald-700", rejected:"bg-red-100 text-red-700", expired:"bg-amber-100 text-amber-700" }[est.status] || "bg-slate-100 text-slate-600")}>{est.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-sm">Invoices</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {invoices.length === 0 && <p className="text-sm text-muted-foreground">No invoices yet.</p>}
              {invoices.map(inv => (
                <Link key={inv.id} to={`/invoices/${inv.id}`}>
                  <div className="flex items-center justify-between rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
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
                        {inv.balance_due > 0 && inv.status !== "paid" && <p className="text-xs text-amber-600">Bal: €{inv.balance_due.toLocaleString()}</p>}
                      </div>
                      <Badge className={cn("text-xs", INV_STATUS[inv.status] || "bg-slate-100 text-slate-600")}>{inv.status}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}