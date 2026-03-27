import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import { computeDocumentTotals } from "@/components/documents/DocumentTotals";
import { TrendingUp, TrendingDown, AlertCircle, Info, ChevronDown, ChevronUp, Euro } from "lucide-react";
import { format, startOfQuarter, endOfQuarter, subQuarters } from "date-fns";

// Irish VAT rates
const IRISH_VAT_RATES = [
  { rate: 23, label: "Standard Rate", description: "General goods & services" },
  { rate: 13.5, label: "Reduced Rate", description: "Construction services, building materials, fuel" },
  { rate: 9, label: "Second Reduced Rate", description: "Hospitality, newspapers, sporting facilities" },
  { rate: 4.8, label: "Livestock Rate", description: "Livestock supply" },
  { rate: 0, label: "Zero Rate", description: "Food, children's clothing, exports" },
];

// Irish VAT write-off / reclaim rules
const VAT_WRITEOFF_RULES = [
  {
    title: "Construction Services (13.5%)",
    applicable: true,
    description: "Roofing works, repairs, and construction services are subject to the 13.5% VAT rate under Irish law. You can reclaim VAT on materials purchased for business use.",
    reclaimable: true,
  },
  {
    title: "Business Vehicle Expenses",
    applicable: true,
    description: "VAT on commercial vehicles (vans, trucks) used exclusively for business is 100% reclaimable. Cars are blocked from VAT reclaim unless used as taxis or driving instruction.",
    reclaimable: true,
  },
  {
    title: "Tools & Equipment",
    applicable: true,
    description: "VAT on tools and equipment purchased for business use is fully reclaimable as input VAT.",
    reclaimable: true,
  },
  {
    title: "Fuel (Business Use)",
    applicable: true,
    description: "VAT on diesel for commercial vehicles is 100% reclaimable. Petrol VAT cannot be reclaimed. For mixed-use vehicles, only the business proportion is reclaimable.",
    reclaimable: true,
  },
  {
    title: "Entertainment & Subsistence",
    applicable: false,
    description: "Staff entertainment and subsistence expenses are blocked — VAT cannot be reclaimed on these. Client entertainment is also blocked.",
    reclaimable: false,
  },
  {
    title: "Materials & Supplies",
    applicable: true,
    description: "VAT on building materials, shingles, underlayment, fixings, and other roofing supplies is fully reclaimable as input VAT when purchased for business jobs.",
    reclaimable: true,
  },
  {
    title: "Insurance Premiums",
    applicable: false,
    description: "Insurance premiums are generally exempt from VAT in Ireland — there is no VAT to reclaim.",
    reclaimable: false,
  },
  {
    title: "Professional Services",
    applicable: true,
    description: "VAT on accountancy, legal, and other professional services purchased for your business is reclaimable.",
    reclaimable: true,
  },
];

// Helper: extract VAT collected from invoices
function extractVatFromInvoices(invoices) {
  let total = 0;
  for (const inv of invoices) {
    if (["void"].includes(inv.status)) continue;
    const { taxBreakdown } = computeDocumentTotals(inv.line_items || [], inv.discount_amount || 0, 0);
    for (const g of taxBreakdown) total += g.taxAmount;
  }
  return total;
}

// Helper: estimate VAT reclaimable from expenses
const EXPENSE_VAT_RATES = {
  materials: 13.5,
  equipment: 23,
  fuel: 23,
  tools: 23,
  office: 23,
  permits: 0,
  labor: 0,
  insurance: 0,
  other: 23,
};

function extractVatFromExpenses(expenses) {
  let total = 0;
  for (const exp of expenses) {
    if (exp.status === "rejected") continue;
    const rate = EXPENSE_VAT_RATES[exp.category] || 0;
    if (rate === 0) continue;
    // Back-calculate VAT from gross amount (assume amount is VAT inclusive)
    const vatAmount = (exp.amount || 0) * (rate / (100 + rate));
    total += vatAmount;
  }
  return total;
}

function quarterLabel(date) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  return `Q${q} ${date.getFullYear()}`;
}

function StatCard({ label, value, sub, icon: Icon, trend, color = "text-foreground" }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>€{Number(value || 0).toFixed(2)}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        {Icon && <div className="p-2 rounded-lg bg-muted"><Icon className="w-5 h-5 text-muted-foreground" /></div>}
      </CardContent>
    </Card>
  );
}

export default function VatTracker() {
  const [expandedRule, setExpandedRule] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState(0); // 0 = current, 1 = last, etc.

  const { data: invoices = [] } = useQuery({ queryKey: ["invoices"], queryFn: () => base44.entities.Invoice.list() });
  const { data: expenses = [] } = useQuery({ queryKey: ["expenses"], queryFn: () => base44.entities.Expense.list() });

  const quarterDate = useMemo(() => subQuarters(new Date(), selectedQuarter), [selectedQuarter]);
  const qStart = startOfQuarter(quarterDate);
  const qEnd = endOfQuarter(quarterDate);

  const quarterInvoices = useMemo(() =>
    invoices.filter(inv => {
      if (!inv.issued_date) return false;
      const d = new Date(inv.issued_date);
      return d >= qStart && d <= qEnd;
    }), [invoices, qStart, qEnd]);

  const quarterExpenses = useMemo(() =>
    expenses.filter(exp => {
      if (!exp.date) return false;
      const d = new Date(exp.date);
      return d >= qStart && d <= qEnd;
    }), [expenses, qStart, qEnd]);

  const vatCollected = useMemo(() => extractVatFromInvoices(quarterInvoices), [quarterInvoices]);
  const vatReclaimable = useMemo(() => extractVatFromExpenses(quarterExpenses), [quarterExpenses]);
  const vatOwed = Math.max(0, vatCollected - vatReclaimable);
  const vatPosition = vatCollected - vatReclaimable; // negative = Revenue owes you

  // Rate breakdown from invoices this quarter
  const rateBreakdown = useMemo(() => {
    const groups = {};
    for (const inv of quarterInvoices) {
      if (inv.status === "void") continue;
      const { taxBreakdown } = computeDocumentTotals(inv.line_items || [], inv.discount_amount || 0, 0);
      for (const g of taxBreakdown) {
        if (!groups[g.rate]) groups[g.rate] = { rate: g.rate, taxableAmount: 0, vatAmount: 0 };
        groups[g.rate].taxableAmount += g.taxableAmount;
        groups[g.rate].vatAmount += g.taxAmount;
      }
    }
    return Object.values(groups).sort((a, b) => b.rate - a.rate);
  }, [quarterInvoices]);

  // Expense VAT breakdown
  const expenseBreakdown = useMemo(() => {
    const groups = {};
    for (const exp of quarterExpenses) {
      if (exp.status === "rejected") continue;
      const rate = EXPENSE_VAT_RATES[exp.category] || 0;
      if (rate === 0) continue;
      const vatAmount = (exp.amount || 0) * (rate / (100 + rate));
      const key = exp.category;
      if (!groups[key]) groups[key] = { category: key, grossAmount: 0, vatAmount: 0, rate };
      groups[key].grossAmount += exp.amount || 0;
      groups[key].vatAmount += vatAmount;
    }
    return Object.values(groups);
  }, [quarterExpenses]);

  const quarters = [-1, 0, 1, 2, 3].map(offset => {
    const d = subQuarters(new Date(), offset);
    return { offset, label: quarterLabel(d) };
  }).filter(q => q.offset >= 0);

  return (
    <div>
      <PageHeader
        title="VAT Tracker"
        subtitle="Track VAT collected, input VAT reclaim, and Irish tax obligations"
      />

      {/* Quarter selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {quarters.map(q => (
          <Button
            key={q.offset}
            variant={selectedQuarter === q.offset ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedQuarter(q.offset)}
          >
            {q.offset === 0 ? "Current Quarter" : q.label}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {format(qStart, "d MMM")} – {format(qEnd, "d MMM yyyy")}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="VAT Collected (Output)" value={vatCollected} sub={`From ${quarterInvoices.length} invoices`} icon={TrendingUp} color="text-primary" />
        <StatCard label="Input VAT Reclaimable" value={vatReclaimable} sub={`From ${quarterExpenses.length} expenses`} icon={TrendingDown} color="text-emerald-600" />
        <StatCard
          label={vatPosition >= 0 ? "VAT Owed to Revenue" : "VAT Refund Due"}
          value={Math.abs(vatPosition)}
          sub={vatPosition >= 0 ? "Pay by your VAT return date" : "Refund from Revenue"}
          icon={Euro}
          color={vatPosition >= 0 ? "text-destructive" : "text-emerald-600"}
        />
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">VAT Return Period</p>
            <p className="text-lg font-bold mt-1">{quarterLabel(quarterDate)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Due: {format(new Date(qEnd.getFullYear(), qEnd.getMonth() + 2, 19), "d MMM yyyy")}</p>
            <Badge variant="secondary" className="mt-2 bg-amber-100 text-amber-700 text-xs">Bi-monthly returns</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Output VAT breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Output VAT (Collected)</CardTitle></CardHeader>
          <CardContent>
            {rateBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No VAT-applicable invoices this quarter</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-3 text-xs text-muted-foreground font-medium pb-2 border-b">
                  <span>Rate</span><span className="text-right">Taxable Amount</span><span className="text-right">VAT</span>
                </div>
                {rateBreakdown.map(g => (
                  <div key={g.rate} className="grid grid-cols-3 text-sm py-2 border-b last:border-0">
                    <span className="font-medium">{g.rate}%</span>
                    <span className="text-right">€{g.taxableAmount.toFixed(2)}</span>
                    <span className="text-right font-semibold">€{g.vatAmount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="grid grid-cols-3 text-sm pt-2 font-bold">
                  <span>Total</span><span></span><span className="text-right">€{vatCollected.toFixed(2)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Input VAT breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="w-4 h-4 text-emerald-600" /> Input VAT (Reclaimable from Expenses)</CardTitle></CardHeader>
          <CardContent>
            {expenseBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No VAT-applicable expenses this quarter</p>
            ) : (
              <div className="space-y-0">
                <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium pb-2 border-b">
                  <span className="col-span-2">Category</span><span className="text-right">Gross</span><span className="text-right">VAT Reclaimable</span>
                </div>
                {expenseBreakdown.map(g => (
                  <div key={g.category} className="grid grid-cols-4 text-sm py-2 border-b last:border-0 items-center">
                    <span className="col-span-2 capitalize font-medium">{g.category}</span>
                    <span className="text-right">€{g.grossAmount.toFixed(2)}</span>
                    <span className="text-right font-semibold text-emerald-600">€{g.vatAmount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="grid grid-cols-4 text-sm pt-2 font-bold">
                  <span className="col-span-3">Total Reclaimable</span>
                  <span className="text-right text-emerald-600">€{vatReclaimable.toFixed(2)}</span>
                </div>
              </div>
            )}
            <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs text-amber-800 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                Input VAT is estimated by back-calculating from expense amounts based on category. Verify with your actual VAT invoices from suppliers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* VAT owed summary */}
      <Card className="mb-8 border-2 border-primary/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Net VAT Position for {quarterLabel(quarterDate)}</p>
              <p className={`text-3xl font-bold mt-1 ${vatPosition >= 0 ? "text-destructive" : "text-emerald-600"}`}>
                {vatPosition >= 0 ? "Pay" : "Reclaim"} €{Math.abs(vatPosition).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                €{vatCollected.toFixed(2)} collected − €{vatReclaimable.toFixed(2)} input = €{vatPosition.toFixed(2)}
              </p>
            </div>
            <div className="text-sm space-y-1">
              <p className="font-medium">VAT Return Due Date</p>
              <p className="text-muted-foreground">{format(new Date(qEnd.getFullYear(), qEnd.getMonth() + 2, 19), "d MMMM yyyy")}</p>
              <p className="text-xs text-muted-foreground">File via ROS (Revenue Online Service)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Irish VAT write-off rules */}
      <div>
        <h2 className="text-base font-semibold mb-1">Irish VAT Reclaim Rules</h2>
        <p className="text-sm text-muted-foreground mb-4">Applicable write-offs and reclaim rules under Irish VAT law for construction businesses</p>
        <div className="space-y-2">
          {VAT_WRITEOFF_RULES.map((rule, i) => (
            <div
              key={i}
              className={`rounded-lg border ${rule.reclaimable ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50"}`}
            >
              <button
                className="w-full flex items-center justify-between p-4 text-left"
                onClick={() => setExpandedRule(expandedRule === i ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${rule.reclaimable ? "bg-emerald-500" : "bg-red-400"}`} />
                  <span className="text-sm font-medium">{rule.title}</span>
                  <Badge variant="secondary" className={rule.reclaimable ? "bg-emerald-100 text-emerald-700 text-xs" : "bg-red-100 text-red-700 text-xs"}>
                    {rule.reclaimable ? "Reclaimable" : "Blocked"}
                  </Badge>
                </div>
                {expandedRule === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {expandedRule === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground">{rule.description}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-800">Disclaimer</p>
              <p className="text-xs text-blue-700 mt-1">
                This tracker provides estimates for reference purposes only. Always consult a qualified Irish tax accountant or Revenue for official guidance.
                VAT returns must be filed through ROS (Revenue Online Service) by the 19th of the month following each bi-monthly period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}