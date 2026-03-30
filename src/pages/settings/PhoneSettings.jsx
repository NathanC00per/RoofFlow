import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { Plus, Save, Trash2, Phone, AlertCircle, CheckCircle2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import AfterHoursConfig from "@/components/phone/AfterHoursConfig";
import IVRConfigManager from "@/components/phone/IVRConfigManager";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function RouteCard({ route, onUpdate, onDelete, roles, employees, allowedRoles }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(route);

  function save() {
    onUpdate(route.id, form);
    setEditing(false);
  }

  if (!editing) {
    const targetDisplay = 
      form.routing_type === "role" ? form.target_role :
      form.routing_type === "employee" ? form.target_employee_names?.join(", ") || "—" :
      "Round-robin";

    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{form.description}</h3>
                <Badge variant={form.is_active ? "default" : "secondary"} className="text-xs">
                  {form.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 capitalize">
                {form.routing_type.replace("_", " ")} → {targetDisplay}
              </p>
              {form.forward_number && (
                <p className="text-sm text-muted-foreground mt-1">
                  Forward to: <span className="font-mono">{form.forward_number}</span> ({form.ring_timeout}s timeout)
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(route.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50">
      <CardContent className="p-5 space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Route Description</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>Give this route a name like "Sales", "Support", or "Billing"</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="e.g., Customer Inquiries"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Routing Type</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-semibold mb-1">Route calls to:</p>
                  <p className="text-xs">• <strong>By Role</strong> - all employees in a specific role (e.g., all "Sales" staff)</p>
                  <p className="text-xs">• <strong>By Employee</strong> - specific team members you choose</p>
                  <p className="text-xs">• <strong>Round-Robin</strong> - distribute calls evenly to all active employees</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Select value={form.routing_type} onValueChange={v => setForm({ ...form, routing_type: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="role">By Role</SelectItem>
              <SelectItem value="employee">By Employee</SelectItem>
              <SelectItem value="round_robin">Round-Robin (All)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.routing_type === "role" && (
          <div className="space-y-1.5">
            <Label className="text-sm">Select Role</Label>
            <Select value={form.target_role || ""} onValueChange={v => setForm({ ...form, target_role: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a role..." />
              </SelectTrigger>
              <SelectContent>
                {allowedRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {form.routing_type === "employee" && (
          <div className="space-y-2">
            <Label className="text-sm">Select Employees</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {employees.map(emp => (
                <div key={emp.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`emp-${emp.id}`}
                    checked={(form.target_employee_ids || []).includes(emp.id)}
                    onCheckedChange={checked => {
                      const ids = form.target_employee_ids || [];
                      const names = form.target_employee_names || [];
                      const empName = `${emp.first_name} ${emp.last_name}`;
                      if (checked) {
                        setForm({
                          ...form,
                          target_employee_ids: [...ids, emp.id],
                          target_employee_names: [...names, empName],
                        });
                      } else {
                        setForm({
                          ...form,
                          target_employee_ids: ids.filter(id => id !== emp.id),
                          target_employee_names: names.filter(n => n !== empName),
                        });
                      }
                    }}
                  />
                  <label htmlFor={`emp-${emp.id}`} className="text-sm cursor-pointer flex-1">
                    {emp.first_name} {emp.last_name}
                    <span className="text-xs text-muted-foreground ml-2 capitalize">({emp.role})</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Forward Number (Optional)</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>If no one answers after the ring timeout, the call goes to this number (e.g., a mobile or external line)</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            value={form.forward_number || ""}
            onChange={e => setForm({ ...form, forward_number: e.target.value })}
            placeholder="+353 87 123 4567"
          />
          <p className="text-xs text-muted-foreground">If no agent answers, call forwards here after timeout</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Ring Timeout (seconds)</Label>
          <Input
            type="number"
            value={form.ring_timeout}
            onChange={e => setForm({ ...form, ring_timeout: parseInt(e.target.value) || 30 })}
            min="5"
            max="120"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="active"
            checked={form.is_active}
            onCheckedChange={checked => setForm({ ...form, is_active: checked })}
          />
          <Label htmlFor="active" className="text-sm cursor-pointer">Active Route</Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          <Button onClick={save} className="gap-2"><Save className="w-4 h-4" />Save Route</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PhoneSettings() {
  const { isAdmin, can } = usePermissions();
  const qc = useQueryClient();
  const [creatingNew, setCreatingNew] = useState(false);

  const { data: routes = [] } = useQuery({
    queryKey: ["phone_routing"],
    queryFn: () => base44.entities.PhoneRouting.list("-priority", 50),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PhoneRouting.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["phone_routing"] }); toast.success("Route updated"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PhoneRouting.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["phone_routing"] }); toast.success("Route deleted"); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PhoneRouting.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["phone_routing"] }); setCreatingNew(false); toast.success("Route created"); },
  });

  if (!isAdmin && !can("phone.manage")) {
    return <div className="p-8 text-center text-muted-foreground">Phone management access required.</div>;
  }

  // Filter roles based on permissions
  const allowedRoles = roles.filter(r => {
    // Admins can assign any role
    if (isAdmin) return true;
    // Non-admins can only assign roles they have access to
    return can(r.name.toLowerCase());
  });

  const sortedRoutes = [...routes].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Company Phone Settings"
        subtitle="Configure how incoming calls are routed to employees and roles"
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setCreatingNew(!creatingNew)} className="gap-2">
                <Plus className="w-4 h-4" />
                New Route
              </Button>
            </TooltipTrigger>
            <TooltipContent>Create a call route to direct incoming calls to specific people or roles</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </PageHeader>

      {/* Twilio Status */}
      <Card className="mb-6 border-emerald-200 bg-emerald-50">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900">Twilio Connected</p>
            <p className="text-emerald-800 mt-1">
              Phone: <span className="font-mono">(configured)</span>
            </p>
            <p className="text-xs text-emerald-700 mt-2">
              Incoming calls to your Twilio number will be routed based on the rules below.
              <a href="#" className="underline ml-1">View webhook setup</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create New Route Form */}
      {creatingNew && (
        <Card className="mb-6 border-primary">
          <CardHeader><CardTitle className="text-base">New Call Route</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const newRoute = {
                  description: formData.get("description"),
                  routing_type: formData.get("routing_type"),
                  target_role: formData.get("target_role") || undefined,
                  is_active: true,
                  priority: 0,
                };
                createMutation.mutate(newRoute);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label className="text-sm">Description</Label>
                <Input name="description" placeholder="e.g., Customer Support" required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Route To</Label>
                <Select name="routing_type" defaultValue="role">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="role">By Role</SelectItem>
                    <SelectItem value="employee">By Employee</SelectItem>
                    <SelectItem value="round_robin">Round-Robin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Target Role</Label>
                <Select name="target_role">
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map(r => <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCreatingNew(false)}>Cancel</Button>
                <Button type="submit">Create Route</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* IVR Configuration */}
      <div className="mt-8 pt-8 border-t">
        <IVRConfigManager />
      </div>

      {/* Routes List */}
      {sortedRoutes.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Phone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No call routes configured yet</p>
            <Button onClick={() => setCreatingNew(true)} variant="outline" className="mt-4">Create First Route</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
           {sortedRoutes.map(route => (
             <RouteCard
               key={route.id}
               route={route}
               roles={roles}
               employees={employees}
               allowedRoles={allowedRoles}
               onUpdate={(id, data) => updateMutation.mutate({ id, data })}
               onDelete={id => deleteMutation.mutate(id)}
             />
           ))}
         </div>
      )}
    </div>
  );
}