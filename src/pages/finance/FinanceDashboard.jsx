import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import PageHeader from "@/components/shared/PageHeader";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, FileText, Receipt, AlertCircle,
  FilePlus, ChevronRight, ArrowRight, Wallet
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { toast } from "sonner";

const INVOICE_STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-slate-100 text-slate-400",
};

const ESTIMATE_STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
};

function StatCard({ title, value, sub, icon: IconComp, color = "text-primary", bgColor = "bg-muted" }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{title}</p>
          <p className={cn("text-2xl font-bold mt-1.5", color)}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={cn("p-2.5 rounded-xl", bgColor)}>
          <IconComp className={cn("w-5 h-5", color)} />
        </div>
      </CardContent>
    </Card>
  );
}

export default function FinanceDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list("-created_date", 200) });
  const { data: estimates = [] } = useQuery({ queryKey: ["estimates"], queryFn: () => base44.entities.Estimate.list("-created_date", 200) });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list("-created_date", 200) });
  const { data: jobs = [] } = useQuery({ queryKey: ["jobs"], queryFn: () => base44.entities.Job.list() });

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  // KPIs
  const totalRevenue = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);
  const outstanding = invoices.filter(i => !["paid", "void"].includes(i.status)).reduce((s, i) => s + (i.balance_due || i.total || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;
  const overdueInvoices = invoices.filter(i => !["paid","void"].includes(i.status) && i.due_date && new Date(i.due_date) < new Date());
  const pendingEstimates = estimates.filter(e => e.status === "sent");

  // 6-month bar chart data
  const chartData = Array.from({ length: 6 }, (_, i) => {
    const month = subMonths(new Date(), 5 - i);
    const start = startOfMonth(month);
    const end = endOfMonth(month);
    const revenue = invoices
      .filter(inv => inv.status === "paid" && inv.issued_date && parseISO(inv.issued_date) >= start && parseISO(inv.issued_date) <= end)
      .reduce((s, inv) => s + (inv.total || 0), 0);
    const expense = expenses
      .filter(exp => exp.date && parseISO(exp.date) >= start && parseISO(exp.date) <= end)
      .reduce((s, exp) => s + (exp.amount || 0), 0);
    return { month: format(month, "MMM"), Revenue: Math.round(revenue), Expenses: Math.round(expense), Profit: Math.round(revenue - expense) };
  });

  // Convert estimate to invoice
  const convertMutation = useMutation({
    mutationFn: async (estimate) => {
      const allInv = await base44.entities.Invoice.list("-created_date", 1);
      const num = `INV-${String((allInv.length || 0) + 1).padStart(4, "0")}`;
      return base44.entities.Invoice.create({
        job_id: estimate.job_id,
        estimate_id: estimate.id,
        invoice_number: num,
        status: "draft",
        issued_date: format(new Date(), "yyyy-MM-dd"),
        line_items: estimate.line_items || [],
        subtotal: estimate.subtotal,
        tax_rate: estimate.tax_rate,
        tax_amount: estimate.tax_amount,
        discount_amount: estimate.discount_amount,
        total: estimate.total,
        balance_due: estimate.total,
        amount_paid: 0,
        notes: estimate.notes,
      });
    },
    onSuccess: (inv) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created from estimate!");
      navigate(`/invoices/${inv.id}`);
    },
  });

  const recentInvoices = [...invoices].slice(0, 5);
  const approvedEstimates = estimates.filter(e => e.status === "approved" && !invoices.find(i => i.estimate_id === e.id));

  return (
    <div>
      <PageHeader title="Finance Dashboard" subtitle="Overview of revenue, expenses & documents">
        <Link to="/invoices/new"><Button size="sm"><Receipt className="w-4 h-4 mr-2" />New Invoice</Button></Link>
        <Link to="/estimates/new"><Button size="sm" variant="outline"><FileText className="w-4 h-4 mr-2" />New Estimate</Button></Link>
      </PageHeader>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Revenue" value={`€${totalRevenue.toLocaleString()}`} sub="Paid invoices" icon={DollarSign} color="text-emerald-600" bgColor="bg-emerald-50" />
        <StatCard title="Outstanding" value={`€${outstanding.toLocaleString()}`} sub={`${invoices.filter(i => !["paid","void"].includes(i.status)).length} invoices`} icon={Wallet} color="text-amber-600" bgColor="bg-amber-50" />
        <StatCard title="Total Expenses" value={`€${totalExpenses.toLocaleString()}`} sub={`${expenses.length} records`} icon={TrendingDown} color="text-red-500" bgColor="bg-red-50" />
        <StatCard title="Net Profit" value={`€${profit.toLocaleString()}`} sub="Revenue − Expenses" icon={TrendingUp} color={profit >= 0 ? "text-emerald-600" : "text-red-500"} bgColor={profit >= 0 ? "bg-emerald-50" : "bg-red-50"} />
      </div>

      {/* Chart */}
      <Card className="mb-8 border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Revenue vs Expenses — Last 6 Months</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `€${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => `€${v.toLocaleString()}`} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }} />
              <Legend />
              <Bar dataKey="Revenue" fill="hsl(var(--chart-3))" radius={[4,4,0,0]} />
              <Bar dataKey="Expenses" fill="hsl(var(--chart-5))" radius={[4,4,0,0]} />
              <Bar dataKey="Profit" fill="hsl(var(--chart-1))" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Approved estimates ready to convert */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Convert Estimates → Invoices</CardTitle>
            <Link to="/estimates"><span className="text-xs text-primary hover:underline">View all</span></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {approvedEstimates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No approved estimates pending conversion</p>
            ) : approvedEstimates.slice(0, 5).map(est => {
              const job = jobMap[est.job_id];
              return (
                <div key={est.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{est.estimate_number || "Estimate"}</p>
                    <p className="text-xs text-muted-foreground">{job?.customer_name || "—"} • €{(est.total || 0).toLocaleString()}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="ml-3 flex-shrink-0 text-xs"
                    onClick={() => convertMutation.mutate(est)}
                    disabled={convertMutation.isPending}
                  >
                    <FilePlus className="w-3.5 h-3.5 mr-1" /> Convert
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Overdue / action-needed invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {overdueInvoices.length > 0 && <AlertCircle className="w-4 h-4 text-red-500" />}
              Overdue Invoices
            </CardTitle>
            <Link to="/invoices"><span className="text-xs text-primary hover:underline">View all</span></Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdueInvoices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No overdue invoices 🎉</p>
            ) : overdueInvoices.slice(0, 5).map(inv => {
              const job = jobMap[inv.job_id];
              return (
                <Link key={inv.id} to={`/invoices/${inv.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition cursor-pointer">
                    <div>
                      <p className="text-sm font-medium">{inv.invoice_number || "—"}</p>
                      <p className="text-xs text-muted-foreground">{job?.customer_name} • Due {inv.due_date ? format(new Date(inv.due_date), "MMM d") : "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-red-600">€{(inv.balance_due || inv.total || 0).toLocaleString()}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Invoices</CardTitle>
          <Link to="/invoices"><span className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></span></Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentInvoices.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No invoices yet</p>
          ) : recentInvoices.map(inv => {
            const job = jobMap[inv.job_id];
            const isOverdue = !["paid","void"].includes(inv.status) && inv.due_date && new Date(inv.due_date) < new Date();
            const statusKey = isOverdue && inv.status === "sent" ? "overdue" : inv.status;
            return (
              <Link key={inv.id} to={`/invoices/${inv.id}`}>
                <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/40 transition cursor-pointer">
                  <div>
                    <p className="text-sm font-medium">{inv.invoice_number || "—"}</p>
                    <p className="text-xs text-muted-foreground">{job?.customer_name || "—"} {inv.due_date ? `• Due ${format(new Date(inv.due_date), "MMM d")}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className={cn("text-xs", INVOICE_STATUS_STYLES[statusKey])}>
                      {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                    </Badge>
                    <span className="text-sm font-semibold">€{(inv.total || 0).toLocaleString()}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}