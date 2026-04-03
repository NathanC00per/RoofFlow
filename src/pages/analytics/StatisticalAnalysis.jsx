import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PageHeader from "@/components/shared/PageHeader";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, Cell
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Sparkles, Loader2, AlertCircle, Trophy, Target, Clock, DollarSign, Package, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { subMonths, isAfter, parseISO } from "date-fns";

const JOB_TYPE_LABELS = {
  new_roof: "New Roof", repair: "Repair", inspection: "Inspection",
  gutter: "Gutter", siding: "Siding", maintenance: "Maintenance", other: "Other"
};
const ROOF_TYPE_LABELS = {
  asphalt_shingle: "Asphalt Shingle", metal: "Metal", tile: "Tile",
  flat: "Flat", slate: "Slate", wood_shake: "Wood Shake", other: "Other"
};

const CHART_COLORS = ["#2563eb","#f97316","#16a34a","#9333ea","#0891b2","#dc2626","#ca8a04"];

const TIMEFRAME_OPTIONS = [
  { label: "1 Month", months: 1 },
  { label: "3 Months", months: 3 },
  { label: "6 Months", months: 6 },
  { label: "12 Months", months: 12 },
  { label: "All Time", months: null },
];

function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }
function avg(arr) { return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0; }
function calcMargin(revenue, cost) { return revenue > 0 ? ((revenue - cost) / revenue) * 100 : 0; }

function isInTimeframe(dateStr, cutoff) {
  if (!cutoff || !dateStr) return true;
  try { return isAfter(parseISO(dateStr), cutoff); } catch { return false; }
}

function TrendIcon({ value }) {
  if (value > 5) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (value < -5) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-muted-foreground" />;
}

function StatCard({ label, value, sub, color = "text-foreground" }) {
  return (
    <div className="bg-muted/40 rounded-lg px-4 py-3">
      <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-xl font-bold mt-0.5", color)}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function InsightRow({ rank, label, margin, revenue, count, color }) {
  const trend = margin - 30;
  return (
    <div className="flex items-center gap-3 py-2 border-b last:border-0">
      <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>{rank}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{label}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(Math.max(margin, 0), 100)}%`, background: color }} />
          </div>
          <span className="text-xs text-muted-foreground w-10 text-right">{margin.toFixed(1)}%</span>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold">€{revenue.toLocaleString()}</p>
        <p className="text-[10px] text-muted-foreground">{count} job{count !== 1 ? "s" : ""}</p>
      </div>
      <TrendIcon value={trend} />
    </div>
  );
}

export default function StatisticalAnalysis() {
  const [aiInsight, setAiInsight] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [timeframeMonths, setTimeframeMonths] = useState(3);

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 500)
  });
  const { data: expenses = [] } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 500)
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list()
  });
  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => base44.entities.Material.list()
  });

  // ─── Timeframe cutoff ─────────────────────────────────────────────────────
  const cutoff = useMemo(() => timeframeMonths ? subMonths(new Date(), timeframeMonths) : null, [timeframeMonths]);

  // ─── Filtered by timeframe ────────────────────────────────────────────────
  const filteredJobs = useMemo(() =>
    jobs.filter(j => isInTimeframe(j.created_date || j.start_date, cutoff)),
    [jobs, cutoff]);

  const filteredExpenses = useMemo(() =>
    expenses.filter(e => isInTimeframe(e.date, cutoff)),
    [expenses, cutoff]);

  const filteredInvoices = useMemo(() =>
    invoices.filter(inv => isInTimeframe(inv.issued_date, cutoff)),
    [invoices, cutoff]);

  const completedJobs = useMemo(() => filteredJobs.filter(j => j.status === "completed"), [filteredJobs]);

  // ─── Financial maps ───────────────────────────────────────────────────────
  const revenueByJob = useMemo(() => {
    const map = {};
    for (const inv of filteredInvoices) {
      if (inv.job_id) map[inv.job_id] = (map[inv.job_id] || 0) + (inv.total || 0);
    }
    return map;
  }, [filteredInvoices]);

  const expenseByJob = useMemo(() => {
    const map = {};
    for (const exp of filteredExpenses) {
      if (exp.job_id) map[exp.job_id] = (map[exp.job_id] || 0) + (exp.amount || 0);
    }
    return map;
  }, [filteredExpenses]);

  // ─── Enriched completed jobs ──────────────────────────────────────────────
  const enrichedJobs = useMemo(() => completedJobs.map(j => {
    const revenue = revenueByJob[j.id] || j.actual_cost || j.estimated_cost || 0;
    const cost = expenseByJob[j.id] || 0;
    const profitMargin = calcMargin(revenue, cost);
    const durationDays = j.duration_days || (
      j.start_date && j.end_date
        ? Math.ceil((new Date(j.end_date) - new Date(j.start_date)) / 86400000)
        : null
    );
    return { ...j, revenue, cost, profitMargin, durationDays };
  }), [completedJobs, revenueByJob, expenseByJob]);

  // ─── By job type ──────────────────────────────────────────────────────────
  const byJobType = useMemo(() => {
    const map = {};
    for (const j of enrichedJobs) {
      const key = j.job_type || "other";
      if (!map[key]) map[key] = { type: key, label: JOB_TYPE_LABELS[key] || key, jobs: [] };
      map[key].jobs.push(j);
    }
    return Object.values(map).map(g => ({
      ...g,
      count: g.jobs.length,
      avgRevenue: avg(g.jobs.map(j => j.revenue)),
      avgMargin: avg(g.jobs.filter(j => j.revenue > 0).map(j => j.profitMargin)),
      totalRevenue: g.jobs.reduce((s, j) => s + j.revenue, 0),
      avgDuration: avg(g.jobs.filter(j => j.durationDays).map(j => j.durationDays)),
      conversionRate: pct(g.jobs.length, filteredJobs.filter(j => j.job_type === g.type).length),
    })).sort((a, b) => b.avgMargin - a.avgMargin);
  }, [enrichedJobs, filteredJobs]);

  // ─── By roof type ─────────────────────────────────────────────────────────
  const byRoofType = useMemo(() => {
    const map = {};
    for (const j of enrichedJobs) {
      const key = j.roof_type || "other";
      if (!map[key]) map[key] = { type: key, label: ROOF_TYPE_LABELS[key] || key, jobs: [] };
      map[key].jobs.push(j);
    }
    return Object.values(map).map(g => ({
      ...g,
      count: g.jobs.length,
      avgRevenue: avg(g.jobs.map(j => j.revenue)),
      avgMargin: avg(g.jobs.filter(j => j.revenue > 0).map(j => j.profitMargin)),
      totalRevenue: g.jobs.reduce((s, j) => s + j.revenue, 0),
    })).sort((a, b) => b.avgMargin - a.avgMargin);
  }, [enrichedJobs]);

  // ─── By priority ──────────────────────────────────────────────────────────
  const byPriority = useMemo(() => {
    const map = {};
    for (const j of enrichedJobs) {
      const key = j.priority || "medium";
      if (!map[key]) map[key] = { priority: key, jobs: [] };
      map[key].jobs.push(j);
    }
    return Object.entries(map).map(([k, v]) => ({
      priority: k, count: v.jobs.length,
      avgRevenue: avg(v.jobs.map(j => j.revenue)),
      avgMargin: avg(v.jobs.filter(j => j.revenue > 0).map(j => j.profitMargin)),
    }));
  }, [enrichedJobs]);

  // ─── Materials usage from job line_items ──────────────────────────────────
  const materialUsage = useMemo(() => {
    const map = {};
    for (const j of filteredJobs) {
      for (const li of (j.line_items || [])) {
        if (li.type !== "material" || !li.description) continue;
        const key = li.material_id || li.description;
        if (!map[key]) map[key] = { name: li.description, material_id: li.material_id, totalQty: 0, totalCost: 0, jobCount: 0 };
        map[key].totalQty += (li.quantity || 0);
        map[key].totalCost += (li.total || (li.quantity || 0) * (li.unit_price || 0));
        map[key].jobCount += 1;
      }
    }
    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost).slice(0, 10);
  }, [filteredJobs]);

  // ─── Expense breakdown by category ───────────────────────────────────────
  const expenseByCategory = useMemo(() => {
    const map = {};
    for (const exp of filteredExpenses) {
      const key = exp.category || "other";
      map[key] = (map[key] || 0) + (exp.amount || 0);
    }
    return Object.entries(map).map(([category, amount]) => ({
      category: category.replace(/_/g, " "), amount
    })).sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses]);

  // ─── Crew scatter ─────────────────────────────────────────────────────────
  const crewScatter = useMemo(() =>
    enrichedJobs.filter(j => j.crew_required && j.revenue > 0).map(j => ({
      crew: j.crew_required, margin: Math.round(j.profitMargin),
      revenue: j.revenue, name: j.customer_name
    })), [enrichedJobs]);

  // ─── Pipeline funnel ──────────────────────────────────────────────────────
  const funnelData = useMemo(() => {
    const order = ["lead","estimate_scheduled","estimate_sent","approved","scheduled","in_progress","completed"];
    return order.map(s => ({ status: s.replace(/_/g, " "), count: filteredJobs.filter(j => j.status === s).length }));
  }, [filteredJobs]);

  // ─── Monthly revenue trend ────────────────────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const map = {};
    for (const inv of filteredInvoices) {
      if (!inv.issued_date) continue;
      const key = inv.issued_date.slice(0, 7);
      map[key] = (map[key] || 0) + (inv.total || 0);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([month, revenue]) => ({
      month: month.slice(5) + "/" + month.slice(2, 4), revenue
    }));
  }, [filteredInvoices]);

  const topType = byJobType[0];
  const totalRevenue = enrichedJobs.reduce((s, j) => s + j.revenue, 0);
  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const overallMargin = avg(enrichedJobs.filter(j => j.revenue > 0).map(j => j.profitMargin));

  // ─── AI Insight ───────────────────────────────────────────────────────────
  async function generateAiInsight() {
    if (!enrichedJobs.length && !filteredExpenses.length) {
      toast.error("Not enough data for analysis");
      return;
    }
    setLoadingAi(true);
    try {
      const summary = {
        timeframe: timeframeMonths ? `Last ${timeframeMonths} months` : "All time",
        total_completed_jobs: enrichedJobs.length,
        overall_avg_margin: overallMargin.toFixed(1) + "%",
        total_revenue: Math.round(totalRevenue),
        total_expenses: Math.round(totalExpenses),
        by_job_type: byJobType.map(g => ({ type: g.label, count: g.count, avg_revenue: Math.round(g.avgRevenue), avg_margin: g.avgMargin.toFixed(1) + "%", avg_duration_days: g.avgDuration > 0 ? g.avgDuration.toFixed(1) : null })),
        by_roof_type: byRoofType.map(g => ({ type: g.label, count: g.count, avg_revenue: Math.round(g.avgRevenue), avg_margin: g.avgMargin.toFixed(1) + "%" })),
        top_materials_by_spend: materialUsage.slice(0, 6).map(m => ({ name: m.name, total_spend: Math.round(m.totalCost), job_count: m.jobCount, total_qty: m.totalQty })),
        expense_by_category: expenseByCategory.map(e => ({ category: e.category, amount: Math.round(e.amount) })),
        pipeline_counts: funnelData,
      };
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior business analyst for a roofing company. Analyse the following ${summary.timeframe} performance data and provide: 
1. Which job/roof types are most and least profitable (with numbers)
2. Material purchasing recommendations — identify high-spend materials and recommend bulk purchasing or supplier negotiations to reduce costs
3. Cash flow and expense management insights
4. Specific, actionable next steps the owner should take this month
Be concise, direct and mention actual euro amounts. Data: ${JSON.stringify(summary)}`,
        response_json_schema: {
          type: "object",
          properties: {
            insights: { type: "array", items: { type: "string" } },
            top_recommendation: { type: "string" },
            material_recommendations: { type: "array", items: { type: "string" } },
            risk_flag: { type: "string" }
          }
        }
      });
      setAiInsight(result);
    } catch {
      toast.error("AI analysis failed");
    } finally {
      setLoadingAi(false);
    }
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const hasData = enrichedJobs.length > 0 || filteredExpenses.length > 0;
  const selectedLabel = TIMEFRAME_OPTIONS.find(o => o.months === timeframeMonths)?.label || "Custom";

  return (
    <div>
      <PageHeader
        title="Statistical Analysis"
        subtitle={`${selectedLabel} • ${completedJobs.length} completed jobs`}
      >
        <Button onClick={generateAiInsight} disabled={loadingAi || !hasData}>
          {loadingAi ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
          AI Insights
        </Button>
      </PageHeader>

      {/* ── Timeframe Selector ── */}
      <Card className="mb-6">
        <CardContent className="py-4 px-5">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground shrink-0">
              <Calendar className="w-4 h-4" /> Timeframe:
            </div>
            <div className="flex gap-2 flex-wrap">
              {TIMEFRAME_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => { setTimeframeMonths(opt.months); setAiInsight(null); }}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    timeframeMonths === opt.months
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No data in selected timeframe. Try expanding the range or completing more jobs.</p>
          </CardContent>
        </Card>
      )}

      {hasData && (
        <div className="space-y-6">
          {/* ── AI Insight card ── */}
          {aiInsight && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="font-semibold text-sm text-primary">AI Business Insights · {selectedLabel}</p>
                </div>
                {aiInsight.top_recommendation && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">Top Recommendation</p>
                    <p className="text-sm text-emerald-800">{aiInsight.top_recommendation}</p>
                  </div>
                )}
                {aiInsight.insights?.length > 0 && (
                  <ul className="space-y-1.5">
                    {aiInsight.insights.map((ins, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-primary font-bold shrink-0">•</span>
                        <span>{ins}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {aiInsight.material_recommendations?.length > 0 && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><Package className="w-3.5 h-3.5" /> Material Purchasing Recommendations</p>
                    <ul className="space-y-1">
                      {aiInsight.material_recommendations.map((rec, i) => (
                        <li key={i} className="flex gap-2 text-sm text-blue-800">
                          <span className="font-bold shrink-0">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {aiInsight.risk_flag && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <p className="text-xs font-semibold text-amber-700 mb-1">⚠ Watch Out</p>
                    <p className="text-sm text-amber-800">{aiInsight.risk_flag}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── KPI row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Completed Jobs" value={enrichedJobs.length} sub={selectedLabel} />
            <StatCard label="Total Revenue" value={`€${(totalRevenue / 1000).toFixed(1)}k`} sub="from completed jobs" color="text-emerald-600" />
            <StatCard label="Total Expenses" value={`€${(totalExpenses / 1000).toFixed(1)}k`} sub="all categories" color="text-red-500" />
            <StatCard label="Avg Profit Margin" value={`${overallMargin.toFixed(1)}%`} sub="completed jobs" color={overallMargin > 30 ? "text-emerald-600" : overallMargin > 15 ? "text-amber-600" : "text-red-600"} />
          </div>

          {/* ── Profitability Leaderboard + Avg Revenue ── */}
          {enrichedJobs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /> Profitability by Job Type</CardTitle>
                </CardHeader>
                <CardContent>
                  {byJobType.map((g, i) => (
                    <InsightRow key={g.type} rank={i + 1} label={g.label} margin={g.avgMargin}
                      revenue={g.totalRevenue} count={g.count} color={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Avg Revenue by Job Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byJobType} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [`€${v.toLocaleString()}`, "Avg Revenue"]} />
                      <Bar dataKey="avgRevenue" radius={[4, 4, 0, 0]}>
                        {byJobType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Roof Type Margin + Duration ── */}
          {enrichedJobs.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> Margin by Roof Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byRoofType} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                      <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={90} />
                      <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, "Avg Margin"]} />
                      <Bar dataKey="avgMargin" radius={[0, 4, 4, 0]}>
                        {byRoofType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Avg Duration by Job Type (days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byJobType.filter(g => g.avgDuration > 0)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [v?.toFixed(1) + " days", "Avg Duration"]} />
                      <Bar dataKey="avgDuration" radius={[4, 4, 0, 0]}>
                        {byJobType.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Materials Usage ── */}
          {materialUsage.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4 text-primary" /> Top Materials by Spend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {materialUsage.map((m, i) => {
                      const maxCost = materialUsage[0]?.totalCost || 1;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs font-medium truncate">{m.name}</span>
                              <span className="text-xs font-semibold ml-2 shrink-0">€{Math.round(m.totalCost).toLocaleString()}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${(m.totalCost / maxCost) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Used in {m.jobCount} job{m.jobCount !== 1 ? "s" : ""} · qty {m.totalQty.toFixed(1)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4 text-red-500" /> Expense Breakdown by Category</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={expenseByCategory} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="category" tick={{ fontSize: 10 }} width={70} />
                      <Tooltip formatter={(v) => [`€${v.toLocaleString()}`, "Spend"]} />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {expenseByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Monthly Revenue + Crew Scatter ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {monthlyTrend.length > 1 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Monthly Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `€${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => [`€${v.toLocaleString()}`, "Revenue"]} />
                      <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {crewScatter.length > 2 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Crew Size vs. Profit Margin</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <ScatterChart margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="crew" name="Crew" tick={{ fontSize: 10 }} label={{ value: "Crew size", position: "insideBottom", offset: -5, fontSize: 10 }} />
                      <YAxis dataKey="margin" name="Margin" tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                      <Tooltip cursor={{ strokeDasharray: "3 3" }} content={({ payload }) => {
                        if (!payload?.length) return null;
                        const d = payload[0]?.payload;
                        return <div className="bg-popover border rounded p-2 text-xs shadow"><p className="font-medium">{d.name}</p><p>Crew: {d.crew}</p><p>Margin: {d.margin}%</p><p>Revenue: €{d.revenue?.toLocaleString()}</p></div>;
                      }} />
                      <Scatter data={crewScatter} fill="hsl(var(--primary))" fillOpacity={0.7} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Pipeline Funnel ── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Job Pipeline Funnel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-2">
                {funnelData.filter(d => d.count > 0).map((d, i) => {
                  const maxCount = Math.max(...funnelData.map(x => x.count), 1);
                  const heightPct = Math.max((d.count / maxCount) * 100, 8);
                  return (
                    <div key={d.status} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs font-bold">{d.count}</span>
                      <div className="w-full rounded-t-md transition-all" style={{ height: `${heightPct * 1.2}px`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-[9px] text-muted-foreground text-center capitalize leading-tight">{d.status}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Characteristics Summary Table ── */}
          {byJobType.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Job Type Characteristics Summary</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-muted-foreground font-medium">Job Type</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Jobs</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Avg Revenue</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Avg Margin</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Avg Duration</th>
                      <th className="text-right py-2 text-muted-foreground font-medium">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byJobType.map((g, i) => (
                      <tr key={g.type} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="font-medium">{g.label}</span>
                          </div>
                        </td>
                        <td className="text-right py-2">{g.count}</td>
                        <td className="text-right py-2 font-medium">€{Math.round(g.avgRevenue).toLocaleString()}</td>
                        <td className={cn("text-right py-2 font-semibold", g.avgMargin > 30 ? "text-emerald-600" : g.avgMargin > 15 ? "text-amber-600" : "text-red-600")}>
                          {g.avgMargin.toFixed(1)}%
                        </td>
                        <td className="text-right py-2 text-muted-foreground">
                          {g.avgDuration > 0 ? `${g.avgDuration.toFixed(1)}d` : "—"}
                        </td>
                        <td className="text-right py-2 text-muted-foreground">{g.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}