import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import {
  ArrowLeft, Pencil, Trash2, Zap, Phone, Mail, MapPin,
  CalendarClock, Users, DollarSign, RefreshCw, ExternalLink
} from "lucide-react";
import { format, addMonths, addWeeks, addYears } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_STYLES = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  expired: "bg-gray-100 text-gray-700",
  cancelled: "bg-red-100 text-red-800",
};

const FREQ_LABELS = {
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly (every 3 months)",
  "bi-annually": "Bi-Annually (every 6 months)",
  annually: "Annually",
};

function getNextDate(currentDate, frequency) {
  const d = new Date(currentDate);
  switch (frequency) {
    case "weekly": return format(addWeeks(d, 1), "yyyy-MM-dd");
    case "monthly": return format(addMonths(d, 1), "yyyy-MM-dd");
    case "quarterly": return format(addMonths(d, 3), "yyyy-MM-dd");
    case "bi-annually": return format(addMonths(d, 6), "yyyy-MM-dd");
    case "annually": return format(addYears(d, 1), "yyyy-MM-dd");
    default: return format(addMonths(d, 6), "yyyy-MM-dd");
  }
}

export default function MaintenanceContractDetail() {
  const contractId = window.location.pathname.split("/maintenance/")[1];
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: contract, isLoading } = useQuery({
    queryKey: ["maintenance-contract", contractId],
    queryFn: async () => {
      const res = await base44.entities.MaintenanceContract.filter({ id: contractId });
      return res[0];
    },
    enabled: !!contractId,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: linkedJobs = [] } = useQuery({
    queryKey: ["jobs-for-contract", contractId],
    queryFn: () => base44.entities.Job.filter({ maintenance_contract_id: contractId }),
    enabled: !!contractId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.MaintenanceContract.delete(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      toast.success("Contract deleted");
      navigate("/maintenance");
    },
  });

  const generateJobMutation = useMutation({
    mutationFn: async () => {
      setGenerating(true);
      // Create a job from this contract
      const newJob = await base44.entities.Job.create({
        customer_name: contract.customer_name,
        customer_email: contract.customer_email,
        customer_phone: contract.customer_phone,
        customer_id: contract.customer_id,
        address: contract.service_address,
        city: contract.service_city,
        state: contract.service_state,
        zip: contract.service_zip,
        job_type: "repair",
        status: "scheduled",
        priority: "medium",
        start_date: contract.next_service_date,
        estimated_cost: contract.estimated_cost_per_visit,
        description: `Maintenance visit from contract: ${contract.contract_name}\n\n${contract.description || ""}`.trim(),
        roof_type: contract.roof_type,
        assigned_employees: (contract.assigned_employee_ids || []),
        maintenance_contract_id: contractId,
        maintenance_contract_name: contract.contract_name,
      });

      // Advance the next_service_date
      const newNextDate = getNextDate(contract.next_service_date, contract.frequency);
      await base44.entities.MaintenanceContract.update(contractId, {
        next_service_date: newNextDate,
        jobs_generated: (contract.jobs_generated || 0) + 1,
      });

      return newJob;
    },
    onSuccess: (newJob) => {
      setGenerating(false);
      queryClient.invalidateQueries({ queryKey: ["maintenance-contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["jobs-for-contract", contractId] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Service job generated!", {
        description: `Job created for ${format(new Date(contract.next_service_date), "MMM d, yyyy")}`,
        action: { label: "View Job", onClick: () => navigate(`/jobs/${newJob.id}`) },
      });
    },
    onError: () => setGenerating(false),
  });

  if (isLoading || !contract) {
    return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  const assignedEmployees = employees.filter((e) => (contract.assigned_employee_ids || []).includes(e.id));
  const isServiceDue = contract.next_service_date && new Date(contract.next_service_date) <= new Date();

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/maintenance")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Contracts
      </Button>

      <PageHeader
        title={contract.contract_name}
        subtitle={`${FREQ_LABELS[contract.frequency] || contract.frequency} · ${contract.customer_name}`}
      >
        <Button
          onClick={() => generateJobMutation.mutate()}
          disabled={generating || generateJobMutation.isPending || contract.status !== "active"}
          className={isServiceDue ? "bg-orange-600 hover:bg-orange-700" : ""}
        >
          <Zap className="w-4 h-4 mr-2" />
          {generating ? "Generating..." : isServiceDue ? "Service Due — Generate Job" : "Generate Service Job"}
        </Button>
        <Link to={`/maintenance/${contractId}/edit`}>
          <Button variant="outline" size="icon"><Pencil className="w-4 h-4" /></Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="icon"><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this contract?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone. Generated jobs will remain.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main */}
        <div className="lg:col-span-2 space-y-6">

          {/* Service Schedule */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CalendarClock className="w-4 h-4" />Service Schedule</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <Badge className={STATUS_STYLES[contract.status] || ""}>{contract.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Frequency</p>
                <p className="text-sm font-medium">{FREQ_LABELS[contract.frequency] || contract.frequency}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Start Date</p>
                <p className="text-sm font-medium">{contract.start_date ? format(new Date(contract.start_date), "MMM d, yyyy") : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">End Date</p>
                <p className="text-sm font-medium">{contract.end_date ? format(new Date(contract.end_date), "MMM d, yyyy") : "Ongoing"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Next Service Date</p>
                <p className={`text-sm font-semibold ${isServiceDue ? "text-orange-600" : ""}`}>
                  {contract.next_service_date ? format(new Date(contract.next_service_date), "MMM d, yyyy") : "—"}
                  {isServiceDue && " ⚠ Due"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Jobs Generated</p>
                <p className="text-sm font-medium">{contract.jobs_generated || 0}</p>
              </div>
              {contract.estimated_cost_per_visit && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Est. Cost / Visit</p>
                  <p className="text-sm font-medium flex items-center gap-1"><DollarSign className="w-3.5 h-3.5" />£{contract.estimated_cost_per_visit.toLocaleString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          {contract.description && (
            <Card>
              <CardHeader><CardTitle className="text-base">Scope of Services</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.description}</p></CardContent>
            </Card>
          )}

          {/* Generated Jobs */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><RefreshCw className="w-4 h-4" />Generated Service Jobs</CardTitle></CardHeader>
            <CardContent>
              {linkedJobs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No jobs generated yet. Click "Generate Service Job" to create the first visit.</p>
              ) : (
                <div className="space-y-2">
                  {linkedJobs.map((job) => (
                    <Link key={job.id} to={`/jobs/${job.id}`} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{job.start_date ? format(new Date(job.start_date), "MMM d, yyyy") : "No date"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{job.status?.replace(/_/g, " ")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {contract.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-muted-foreground whitespace-pre-wrap">{contract.notes}</p></CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">

          {/* Customer */}
          <Card>
            <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="font-semibold">{contract.customer_name}</p>
              {contract.customer_phone && (
                <a href={`tel:${contract.customer_phone}`} className="text-sm flex items-center gap-2 text-primary hover:underline">
                  <Phone className="w-3.5 h-3.5" />{contract.customer_phone}
                </a>
              )}
              {contract.customer_email && (
                <a href={`mailto:${contract.customer_email}`} className="text-sm flex items-center gap-2 text-primary hover:underline">
                  <Mail className="w-3.5 h-3.5" />{contract.customer_email}
                </a>
              )}
              {contract.customer_id && (
                <Link to={`/customers/${contract.customer_id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />View Customer Profile
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Service Address</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {[contract.service_address, contract.service_city, contract.service_state, contract.service_zip].filter(Boolean).join(", ")}
              </p>
            </CardContent>
          </Card>

          {/* Crew */}
          {assignedEmployees.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />Default Crew</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {assignedEmployees.map((emp) => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{emp.role}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}