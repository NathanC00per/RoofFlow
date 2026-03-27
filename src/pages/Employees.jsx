import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import PageHeader from "@/components/shared/PageHeader";
import { PlusCircle, Phone, Mail, Search, Pencil, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLES = [
  { value: "foreman", label: "Foreman" },
  { value: "roofer", label: "Roofer" },
  { value: "laborer", label: "Laborer" },
  { value: "estimator", label: "Estimator" },
  { value: "office", label: "Office" },
  { value: "apprentice", label: "Apprentice" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

const statusColors = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-slate-100 text-slate-500",
  on_leave: "bg-amber-100 text-amber-700",
};

const emptyForm = {
  first_name: "", last_name: "", phone: "", email: "",
  role: "roofer", status: "active", hourly_rate: "",
  start_date: "", emergency_contact: "", emergency_phone: "", notes: ""
};

export default function Employees() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const queryClient = useQueryClient();

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 200),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, hourly_rate: data.hourly_rate ? Number(data.hourly_rate) : undefined };
      if (editingEmployee) return base44.entities.Employee.update(editingEmployee.id, payload);
      return base44.entities.Employee.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success(editingEmployee ? "Employee updated!" : "Employee added!");
      setDialogOpen(false);
      setEditingEmployee(null);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee removed");
    },
  });

  const openEdit = (emp) => {
    setEditingEmployee(emp);
    setForm({ ...emptyForm, ...emp, hourly_rate: emp.hourly_rate || "" });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingEmployee(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const filtered = employees.filter(e =>
    !search || `${e.first_name} ${e.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader title="Employees" subtitle={`${employees.length} team members`}>
        <Button onClick={openCreate}><PlusCircle className="w-4 h-4 mr-2" /> Add Employee</Button>
      </PageHeader>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search employees..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 max-w-sm" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-16 text-muted-foreground">No employees found</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(emp => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{emp.first_name} {emp.last_name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{emp.role}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={cn("text-xs", statusColors[emp.status])}>
                    {emp.status === "on_leave" ? "On Leave" : emp.status?.charAt(0).toUpperCase() + emp.status?.slice(1)}
                  </Badge>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                  {emp.phone && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{emp.phone}</p>}
                  {emp.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{emp.email}</p>}
                  {emp.hourly_rate && <p className="font-medium text-foreground">${emp.hourly_rate}/hr</p>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(emp)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(emp.id)}>
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Employee Form Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEmployee ? "Edit Employee" : "Add Employee"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input value={form.first_name} onChange={e => update("first_name", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input value={form.last_name} onChange={e => update("last_name", e.target.value)} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => update("phone", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Role *</Label>
                <Select value={form.role} onValueChange={v => update("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => update("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUS_OPTIONS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hourly Rate ($)</Label>
                <Input type="number" value={form.hourly_rate} onChange={e => update("hourly_rate", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => update("start_date", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Emergency Contact</Label>
                <Input value={form.emergency_contact} onChange={e => update("emergency_contact", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Emergency Phone</Label>
                <Input value={form.emergency_phone} onChange={e => update("emergency_phone", e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {editingEmployee ? "Update" : "Add Employee"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}