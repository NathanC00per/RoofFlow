import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "@/components/shared/PageHeader";
import { Plus, Search, CalendarClock, ChevronRight, AlertTriangle } from "lucide-react";
import { format, isPast, isWithinInterval, addDays } from "date-fns";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-800",
};

const FREQ_LABELS = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  "bi-annually": "Bi-Annual",
  annually: "Annual",
};

export default function MaintenanceContracts() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["maintenance-contracts"],
    queryFn: () => base44.entities.MaintenanceContract.list("-created_date"),
  });

  const filtered = contracts.filter((c) => {
    const matchSearch =
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.contract_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.service_address?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const isDueSoon = (date) => {
    if (!date) return false;
    const d = new Date(date);
    return isWithinInterval(d, { start: new Date(), end: addDays(new Date(), 14) }) || isPast(d);
  };

  return (
    <div>
      <PageHeader title="Maintenance Contracts" subtitle="Manage recurring service agreements">
        <Link to="/maintenance/new">
          <Button><Plus className="w-4 h-4 mr-2" />New Contract</Button>
        </Link>
      </PageHeader>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search contracts..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["all", "active", "pending", "expired", "cancelled"].map((s) => (
            <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} className="capitalize">
              {s === "all" ? "All" : s}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No contracts found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((contract) => (
            <Link key={contract.id} to={`/maintenance/${contract.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-sm">{contract.contract_name}</span>
                        <Badge className={STATUS_STYLES[contract.status] || ""}>{contract.status}</Badge>
                        <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                          {FREQ_LABELS[contract.frequency] || contract.frequency}
                        </span>
                        {isDueSoon(contract.next_service_date) && (
                          <span className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                            <AlertTriangle className="w-3 h-3" /> Service Due
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{contract.customer_name} · {contract.service_address}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span>Next visit: <strong className={isDueSoon(contract.next_service_date) ? "text-orange-600" : "text-foreground"}>
                          {contract.next_service_date ? format(new Date(contract.next_service_date), "MMM d, yyyy") : "—"}
                        </strong></span>
                        {contract.end_date && <span>Expires: {format(new Date(contract.end_date), "MMM d, yyyy")}</span>}
                        {contract.estimated_cost_per_visit && <span>£{contract.estimated_cost_per_visit.toLocaleString()} / visit</span>}
                        <span>{contract.jobs_generated || 0} jobs generated</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}