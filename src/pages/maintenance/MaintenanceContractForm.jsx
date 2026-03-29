import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PageHeader from "@/components/shared/PageHeader";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "bi-annually", label: "Bi-Annually (every 6 months)" },
  { value: "annually", label: "Annually (yearly)" },
];

const ROOF_TYPES = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal" },
  { value: "tile", label: "Tile" },
  { value: "flat", label: "Flat" },
  { value: "slate", label: "Slate" },
  { value: "wood_shake", label: "Wood Shake" },
  { value: "other", label: "Other" },
];

export default function MaintenanceContractForm() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEdit = window.location.pathname.includes("/edit");
  const contractId = isEdit ? window.location.pathname.split("/maintenance/")[1].replace("/edit", "") : null;

  const [form, setForm] = useState({
    contract_name: "",
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    customer_id: "",
    service_address: "",
    service_city: "",
    service_state: "",
    service_zip: "",
    start_date: "",
    end_date: "",
    frequency: "bi-annually",
    next_service_date: "",
    status: "active",
    estimated_cost_per_visit: "",
    roof_type: "",
    assigned_employee_ids: [],
    description: "",
    notes: "",
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const { data: existingContract } = useQuery({
    queryKey: ["maintenance-contract", contractId],
    queryFn: async () => {
      const res = await base44.entities.MaintenanceContract.filter({ id: contractId });
      return res[0];
    },
    enabled: !!contractId,
  });

  useEffect(() => {
    if (existingContract) {
      setForm({
        ...existingContract,
        estimated_cost_per_visit: existingContract.estimated_cost_per_visit ?? "",
        assigned_employee_ids: existingContract.assigned_employee_ids || [],
      });
    }
  }, [existingContract]);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCustomerSelect = (customerId) => {
    const c = customers.find((cu) => cu.id === customerId);
    if (!c) return;
    setForm((prev) => ({
      ...prev,
      customer_id: c.id,
      customer_name: `${c.first_name} ${c.last_name}`,
      customer_email: c.email || "",
      customer_phone: c.phone || "",
      service_address: c.address || prev.service_address,
      service_city: c.city || prev.service_city,
      service_state: c.state || prev.service_state,
      service_zip: c.zip || prev.service_zip,
    }));
  };

  const toggleEmployee = (id) => {
    setForm((prev) => ({
      ...prev,
      assigned_employee_ids: prev.assigned_employee_ids.includes(id)
        ? prev.assigned_employee_ids.filter((e) => e !== id)
        : [...prev.assigned_employee_ids, id],
    }));
  };

  const saveMutation = useMutation({
    mutationFn: (data) =>
      contractId
        ? base44.entities.MaintenanceContract.update(contractId, data)
        : base44.entities.MaintenanceContract.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-contracts"] });
      toast.success(contractId ? "Contract updated" : "Contract created");
      navigate(`/maintenance/${result?.id || contractId}`);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      estimated_cost_per_visit: form.estimated_cost_per_visit ? Number(form.estimated_cost_per_visit) : undefined,
    };
    saveMutation.mutate(data);
  };

  const activeEmployees = employees.filter((e) => e.status === "active");

  return (
    <div>
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate("/maintenance")}>
        <ArrowLeft className="w-4 h-4 mr-2" /> Back
      </Button>
      <PageHeader title={contractId ? "Edit Contract" : "New Maintenance Contract"} />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">

        {/* Contract Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Contract Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Contract Name *</Label>
              <Input value={form.contract_name} onChange={(e) => set("contract_name", e.target.value)} placeholder="e.g. Annual Roof Maintenance - Smith Property" required />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Services included in this contract..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Frequency *</Label>
                <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} required />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} />
              </div>
              <div>
                <Label>Next Service Date *</Label>
                <Input type="date" value={form.next_service_date} onChange={(e) => set("next_service_date", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Est. Cost Per Visit (£)</Label>
                <Input type="number" min="0" step="0.01" value={form.estimated_cost_per_visit} onChange={(e) => set("estimated_cost_per_visit", e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Roof Type</Label>
                <Select value={form.roof_type} onValueChange={(v) => set("roof_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Select roof type" /></SelectTrigger>
                  <SelectContent>
                    {ROOF_TYPES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer */}
        <Card>
          <CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Link Existing Customer</Label>
              <Select value={form.customer_id} onValueChange={handleCustomerSelect}>
                <SelectTrigger><SelectValue placeholder="Select a customer..." /></SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.first_name} {c.last_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Customer Name *</Label>
                <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} required />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label>Email</Label>
                <Input value={form.customer_email} onChange={(e) => set("customer_email", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Service Address */}
        <Card>
          <CardHeader><CardTitle className="text-base">Service Address</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Address *</Label>
              <Input value={form.service_address} onChange={(e) => set("service_address", e.target.value)} required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>City</Label>
                <Input value={form.service_city} onChange={(e) => set("service_city", e.target.value)} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.service_state} onChange={(e) => set("service_state", e.target.value)} />
              </div>
              <div>
                <Label>Zip</Label>
                <Input value={form.service_zip} onChange={(e) => set("service_zip", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Crew */}
        {activeEmployees.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Default Crew</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">These employees will be pre-assigned when generating service jobs.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activeEmployees.map((emp) => {
                  const selected = form.assigned_employee_ids.includes(emp.id);
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmployee(emp.id)}
                      className={`text-left p-2.5 rounded-lg border text-sm transition-colors ${selected ? "bg-primary/10 border-primary text-primary font-medium" : "hover:bg-muted/50"}`}
                    >
                      {emp.first_name} {emp.last_name}
                      <span className="block text-xs capitalize text-muted-foreground">{emp.role}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
          <CardContent>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any special access instructions, notes for crew..." rows={3} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3 pb-8">
          <Button type="button" variant="outline" onClick={() => navigate("/maintenance")}>Cancel</Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Contract"}
          </Button>
        </div>
      </form>
    </div>
  );
}