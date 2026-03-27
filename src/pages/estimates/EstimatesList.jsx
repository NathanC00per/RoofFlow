import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, FileText, ChevronRight, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
};

export default function EstimatesList() {
  const { data: estimates = [], isLoading } = useQuery({
    queryKey: ["estimates"],
    queryFn: () => base44.entities.Estimate.list("-created_date", 200),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
  });

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Estimates" subtitle={`${estimates.length} total estimates`}>
        <Link to="/estimates/new">
          <Button><PlusCircle className="w-4 h-4 mr-2" /> New Estimate</Button>
        </Link>
      </PageHeader>

      {estimates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No estimates yet</p>
            <Link to="/estimates/new"><Button className="mt-4" variant="outline">Create First Estimate</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {estimates.map(est => {
            const job = jobMap[est.job_id];
            return (
              <Link key={est.id} to={`/estimates/${est.id}`}>
                <Card className="hover:shadow-md transition-all hover:border-primary/20 cursor-pointer">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-xs text-muted-foreground">{est.estimate_number || "—"}</span>
                        {job && (
                          <span className="flex items-center gap-1 text-sm font-semibold truncate">
                            <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                            {job.customer_name}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{job?.address || "No address"}{est.issued_date ? ` • Issued ${format(new Date(est.issued_date), "MMM d, yyyy")}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <Badge variant="secondary" className={cn("text-xs", STATUS_STYLES[est.status])}>{est.status}</Badge>
                      {est.total != null && <span className="font-semibold text-sm">${Number(est.total).toLocaleString()}</span>}
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