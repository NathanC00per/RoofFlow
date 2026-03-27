import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, Receipt, ChevronRight, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  void: "bg-slate-100 text-slate-400",
};

export default function InvoicesList() {
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => base44.entities.Invoice.list("-created_date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
  });

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));
  const unpaid = invoices.filter(i => !["paid", "void"].includes(i.status));
  const totalOutstanding = unpaid.reduce((s, i) => s + (i.balance_due || i.total || 0), 0);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Invoices" subtitle={`${invoices.length} total • $${totalOutstanding.toLocaleString()} outstanding`}>
        <Link to="/invoices/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" /> New Invoice</Button>
        </Link>
      </PageHeader>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Receipt className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No invoices yet</p>
            <Link to="/invoices/new"><Button className="mt-4" variant="outline">Create First Invoice</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map(inv => {
            const job = jobMap[inv.job_id];
            const isOverdue = inv.status !== "paid" && inv.due_date && new Date(inv.due_date) < new Date();
            const displayStatus = isOverdue && inv.status === "sent" ? "overdue" : inv.status;
            return (
              <Link key={inv.id} to={`/invoices/${inv.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{inv.invoice_number || "—"}</span>
                        {job && (
                          <span className="flex items-center gap-1 text-sm font-semibold truncate">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            {job.customer_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job?.address || ""}
                        {inv.due_date ? ` • Due ${format(new Date(inv.due_date), "MMM d, yyyy")}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <Badge variant="secondary" className={cn("text-xs", STATUS_STYLES[displayStatus])}>
                        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold text-sm">${Number(inv.total || 0).toLocaleString()}</p>
                        {inv.balance_due > 0 && inv.status !== "paid" && (
                          <p className="text-xs text-muted-foreground">Due: ${Number(inv.balance_due).toLocaleString()}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}