import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";

function Stat({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-lg p-4 ${highlight ? "bg-primary/5 border border-primary/20" : "bg-muted/40"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function JobFinancials({ job, invoices = [], expenses = [], timesheets = [] }) {
  const fmt = (n) => `$${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const jobInvoices = invoices.filter(inv => inv.job_id === job.id);
  const jobExpenses = expenses.filter(exp => exp.job_id === job.id);

  const invoicedTotal = jobInvoices.reduce((s, inv) => s + (inv.total || 0), 0);
  const amountPaid = jobInvoices.reduce((s, inv) => s + (inv.amount_paid || 0), 0);
  const outstanding = invoicedTotal - amountPaid;

  // Estimated cost from job line items or estimated_cost field
  const estimatedFromLineItems = (job.line_items || []).reduce((s, li) => s + (li.total || (li.quantity || 0) * (li.unit_price || 0)), 0);
  const estimatedCost = estimatedFromLineItems > 0 ? estimatedFromLineItems : (job.estimated_cost || 0);

  // Actual cost = recorded expenses + labour (timesheet wage costs) + actual_cost field
  const expensesTotal = jobExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const labourCost = timesheets.filter(t => t.job_id === job.id).reduce((s, t) => s + (t.wage_cost || 0), 0);
  const actualCost = expensesTotal + labourCost + (job.actual_cost || 0);

  // Profit = revenue collected - actual costs
  const grossProfit = amountPaid - actualCost;
  const margin = amountPaid > 0 ? ((grossProfit / amountPaid) * 100) : null;

  // Cost overrun
  const costVariance = estimatedCost > 0 ? actualCost - estimatedCost : null;
  const isOverBudget = costVariance !== null && costVariance > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Key metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          <Stat label="Invoiced" value={fmt(invoicedTotal)} sub={`${jobInvoices.length} invoice${jobInvoices.length !== 1 ? "s" : ""}`} />
          <Stat label="Collected" value={fmt(amountPaid)} sub={outstanding > 0 ? `${fmt(outstanding)} outstanding` : "Fully paid"} highlight />
          <Stat label="Est. Cost" value={fmt(estimatedCost)} sub={estimatedFromLineItems > 0 ? "From line items" : "From job estimate"} />
          <Stat label="Actual Cost" value={fmt(actualCost)} sub={`${fmt(expensesTotal)} expenses + ${fmt(labourCost)} labour`} />
        </div>

        {/* Budget variance */}
        {costVariance !== null && (
          <div className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${isOverBudget ? "bg-destructive/10 text-destructive" : "bg-emerald-50 text-emerald-700"}`}>
            {isOverBudget
              ? <><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span><strong>{fmt(costVariance)}</strong> over budget</span></>
              : <><CheckCircle2 className="w-4 h-4 flex-shrink-0" /><span><strong>{fmt(Math.abs(costVariance))}</strong> under budget</span></>
            }
          </div>
        )}

        {/* Profit */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Net Profit (after all costs)</p>
              <p className={`text-2xl font-bold ${grossProfit >= 0 ? "text-emerald-600" : "text-destructive"}`}>
                {fmt(grossProfit)}
              </p>
              {margin !== null && (
                <p className="text-xs text-muted-foreground mt-0.5">{margin.toFixed(1)}% margin</p>
              )}
            </div>
            {grossProfit >= 0
              ? <TrendingUp className="w-10 h-10 text-emerald-200" />
              : <TrendingDown className="w-10 h-10 text-red-200" />
            }
          </div>
        </div>

        {/* Invoice breakdown */}
        {jobInvoices.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoices</p>
            {jobInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">#{inv.invoice_number || inv.id.slice(0,8)}</span>
                <div className="flex items-center gap-3">
                  <span className="font-medium">{fmt(inv.total)}</span>
                  <Badge variant="outline" className="text-xs capitalize">{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expense breakdown */}
        {jobExpenses.length > 0 && (
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Logged Expenses</p>
            {jobExpenses.map(exp => (
              <div key={exp.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{exp.vendor || exp.description || exp.category}</span>
                <span className="font-medium text-destructive">{fmt(exp.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}