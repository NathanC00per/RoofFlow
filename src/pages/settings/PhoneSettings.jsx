import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import PageHeader from "@/components/shared/PageHeader";
import { usePermissions } from "@/hooks/usePermissions";
import {
  Phone, PhoneCall, PhoneOff, Plus, Trash2, Save, CheckCircle2,
  ArrowRight, Users, User, RotateCcw, Voicemail, ChevronDown, ChevronUp,
  AlertCircle, Pencil, X
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_LABELS = {
  foreman: "Foreman", roofer: "Roofer", laborer: "Laborer",
  estimator: "Estimator", office: "Office", apprentice: "Apprentice"
};

const ROUTING_ICONS = {
  employee: User,
  role: Users,
  round_robin: RotateCcw,
};

function CallFlowDiagram({ routes, employees }) {
  const activeRoutes = routes.filter(r => r.is_active);
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Live Call Flow</p>
      <div className="flex items-center gap-2 text-sm flex-wrap">
        <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
          <PhoneCall className="w-4 h-4 text-emerald-400" />
          <span>Incoming Call</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2">
          <Phone className="w-4 h-4 text-blue-400" />
          <span>IVR Menu</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="flex flex-col gap-1">
          {activeRoutes.length === 0 ? (
            <div className="bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2 text-amber-300 text-xs">
              No active routes
            </div>
          ) : activeRoutes.map(r => {
            const nums = getRouteNumbers(r, employees);
            return (
              <div key={r.id} className="flex items-center gap-2 bg-slate-700 rounded-lg px-3 py-2 text-sm">
                <span className="text-slate-300">{r.description}</span>
                <ArrowRight className="w-3 h-3 text-slate-500" />
                {nums.length > 0
                  ? <span className="text-emerald-400 font-mono text-xs">{nums.join(', ')}</span>
                  : <span className="text-red-400 text-xs">⚠ No phone numbers!</span>
                }
              </div>
            );
          })}
        </div>
        <ArrowRight className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-lg px-3 py-2">
          <Voicemail className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 text-sm">No answer → Voicemail</span>
        </div>
      </div>
    </div>
  );
}

function getRouteNumbers(route, employees) {
  const numbers = [];
  if (route.routing_type === 'employee' && route.target_employee_ids?.length) {
    for (const empId of route.target_employee_ids) {
      const emp = employees.find(e => e.id === empId);
      if (emp?.phone) numbers.push(emp.phone);
    }
  } else if (route.routing_type === 'role' && route.target_role) {
    for (const emp of employees) {
      if (emp.role === route.target_role && emp.phone) numbers.push(emp.phone);
    }
  } else if (route.routing_type === 'round_robin') {
    for (const emp of employees) {
      if (emp.phone) numbers.push(emp.phone);
    }
  }
  if (route.forward_number) numbers.push(route.forward_number);
  return numbers;
}

function RouteCard({ route, employees, roles, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...route });
  const Icon = ROUTING_ICONS[route.routing_type] || User;
  const dialNumbers = getRouteNumbers(route, employees);
  const hasNumbers = dialNumbers.length > 0;

  function save() {
    onUpdate(route.id, form);
    setEditing(false);
  }

  if (!editing) {
    return (
      <Card className={cn("transition-all", !hasNumbers && "border-amber-200 bg-amber-50/30")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                route.is_active ? "bg-primary/10" : "bg-muted"
              )}>
                <Icon className={cn("w-4 h-4", route.is_active ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{route.description}</span>
                  <Badge variant={route.is_active ? "default" : "secondary"} className="text-xs">
                    {route.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <Badge variant="outline" className="text-xs capitalize">
                    {route.routing_type?.replace('_', ' ')}
                  </Badge>
                </div>
                {route.routing_type === 'employee' && route.target_employee_names?.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">{route.target_employee_names.join(', ')}</p>
                )}
                {route.routing_type === 'role' && route.target_role && (
                  <p className="text-xs text-muted-foreground mt-1">Role: {ROLE_LABELS[route.target_role] || route.target_role}</p>
                )}
                {/* Phone numbers */}
                {hasNumbers ? (
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {dialNumbers.map((n, i) => (
                      <span key={i} className="text-xs font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">{n}</span>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-1.5">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                    <span className="text-xs text-amber-600">No phone numbers — calls will go to voicemail</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">Ring timeout: {route.ring_timeout || 30}s</p>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(true)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => onDelete(route.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Edit Route</CardTitle>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(false)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Route Name</Label>
            <Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Sales" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Ring Timeout (seconds)</Label>
            <Input type="number" value={form.ring_timeout || 30} onChange={e => setForm({ ...form, ring_timeout: parseInt(e.target.value) || 30 })} min="5" max="120" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Routing Type</Label>
          <Select value={form.routing_type} onValueChange={v => setForm({ ...form, routing_type: v, target_role: '', target_employee_ids: [], target_employee_names: [] })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Specific Employee(s)</SelectItem>
              <SelectItem value="role">By Role (all in that role)</SelectItem>
              <SelectItem value="round_robin">Round-Robin (all active)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {form.routing_type === 'role' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Target Role</Label>
            <Select value={form.target_role || ''} onValueChange={v => setForm({ ...form, target_role: v })}>
              <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLE_LABELS).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.target_role && (
              <div className="mt-2 space-y-1">
                {employees.filter(e => e.role === form.target_role).map(emp => (
                  <div key={emp.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className={cn("w-1.5 h-1.5 rounded-full", emp.phone ? "bg-emerald-500" : "bg-red-400")} />
                    {emp.first_name} {emp.last_name}
                    <span className="font-mono">{emp.phone || 'no phone'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {form.routing_type === 'employee' && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Select Employees to Ring</Label>
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {employees.map(emp => {
                const selected = (form.target_employee_ids || []).includes(emp.id);
                return (
                  <label key={emp.id} className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors", selected && "bg-primary/5")}>
                    <Checkbox
                      checked={selected}
                      onCheckedChange={checked => {
                        const ids = form.target_employee_ids || [];
                        const names = form.target_employee_names || [];
                        const name = `${emp.first_name} ${emp.last_name}`;
                        if (checked) {
                          setForm({ ...form, target_employee_ids: [...ids, emp.id], target_employee_names: [...names, name] });
                        } else {
                          setForm({ ...form, target_employee_ids: ids.filter(id => id !== emp.id), target_employee_names: names.filter(n => n !== name) });
                        }
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{emp.first_name} {emp.last_name}</span>
                      <span className="text-xs text-muted-foreground ml-2 capitalize">({ROLE_LABELS[emp.role] || emp.role})</span>
                    </div>
                    {emp.phone
                      ? <span className="text-xs font-mono text-emerald-600 flex-shrink-0">{emp.phone}</span>
                      : <span className="text-xs text-red-400 flex-shrink-0">no phone</span>
                    }
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Fallback Forward Number (optional)</Label>
          <Input value={form.forward_number || ''} onChange={e => setForm({ ...form, forward_number: e.target.value })} placeholder="+353 87 123 4567" />
          <p className="text-xs text-muted-foreground">If set, this number is also dialled in parallel</p>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id={`active-${route.id}`} checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
          <Label htmlFor={`active-${route.id}`} className="text-sm cursor-pointer">Route is active</Label>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
          <Button onClick={save}><Save className="w-4 h-4 mr-2" />Save Route</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function IVRSection({ employees }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  const { data: ivrConfigs = [] } = useQuery({
    queryKey: ["ivr_configs"],
    queryFn: () => base44.entities.IVRConfig.list(),
  });
  const { data: routes = [] } = useQuery({
    queryKey: ["phone_routing"],
    queryFn: () => base44.entities.PhoneRouting.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data) => ivrConfigs[0]?.id
      ? base44.entities.IVRConfig.update(ivrConfigs[0].id, data)
      : base44.entities.IVRConfig.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ivr_configs"] });
      setEditing(false);
      toast.success("IVR menu saved");
    },
  });

  const activeIvr = ivrConfigs[0];

  function startEdit() {
    setForm(activeIvr ? { ...activeIvr } : {
      name: "Main Menu",
      greeting_message: "Welcome to DC&S Roofing. Please select from the following options.",
      menu_options: [],
      timeout_seconds: 5,
      max_attempts: 3,
      is_active: true,
    });
    setEditing(true);
  }

  function addOption() {
    const usedDigits = (form.menu_options || []).map(o => o.digit);
    const nextDigit = ['1','2','3','4','5','6','7','8','9'].find(d => !usedDigits.includes(d)) || '1';
    setForm({ ...form, menu_options: [...(form.menu_options || []), { digit: nextDigit, label: '', description_text: `Press ${nextDigit} for `, route_id: '', route_description: '' }] });
  }

  function removeOption(i) {
    setForm({ ...form, menu_options: form.menu_options.filter((_, idx) => idx !== i) });
  }

  function updateOption(i, field, value) {
    const opts = [...form.menu_options];
    opts[i] = { ...opts[i], [field]: value };
    setForm({ ...form, menu_options: opts });
  }

  if (editing && form) {
    return (
      <Card className="border-primary/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">IVR Menu Configuration</CardTitle>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Greeting Message</Label>
            <Textarea value={form.greeting_message} onChange={e => setForm({ ...form, greeting_message: e.target.value })} rows={3} placeholder="Welcome to our company..." />
            <p className="text-xs text-muted-foreground">This is read aloud to callers when they call in</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Input Timeout (seconds)</Label>
              <Input type="number" value={form.timeout_seconds} onChange={e => setForm({ ...form, timeout_seconds: parseInt(e.target.value) })} min="3" max="30" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Max Retry Attempts</Label>
              <Input type="number" value={form.max_attempts} onChange={e => setForm({ ...form, max_attempts: parseInt(e.target.value) })} min="1" max="5" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Menu Options</Label>
              <Button size="sm" variant="outline" onClick={addOption}><Plus className="w-3.5 h-3.5 mr-1" />Add Option</Button>
            </div>
            {(form.menu_options || []).map((opt, i) => (
              <div key={i} className="border rounded-lg p-3 bg-muted/30 space-y-2">
                <div className="flex gap-2 items-start">
                  <div className="w-16 flex-shrink-0">
                    <Label className="text-[10px] text-muted-foreground">Key</Label>
                    <Select value={opt.digit} onValueChange={v => updateOption(i, 'digit', v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['1','2','3','4','5','6','7','8','9','0'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Label className="text-[10px] text-muted-foreground">Label</Label>
                    <Input value={opt.label} onChange={e => updateOption(i, 'label', e.target.value)} className="h-8 text-sm" placeholder="e.g. Sales" />
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive mt-5 h-8 w-8 p-0" onClick={() => removeOption(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Prompt (read aloud)</Label>
                  <Input value={opt.description_text} onChange={e => updateOption(i, 'description_text', e.target.value)} className="h-8 text-sm" placeholder={`Press ${opt.digit} for ${opt.label}`} />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Route To</Label>
                  <Select value={opt.route_id || ''} onValueChange={v => {
                    const r = routes.find(r => r.id === v);
                    updateOption(i, 'route_id', v);
                    updateOption(i, 'route_description', r?.description || '');
                  }}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select route..." /></SelectTrigger>
                    <SelectContent>
                      {routes.map(r => <SelectItem key={r.id} value={r.id}>{r.description}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            {(form.menu_options || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">No options yet. Add some above.</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="ivr-active" checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            <Label htmlFor="ivr-active" className="text-sm cursor-pointer">IVR menu is active</Label>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />Save IVR Menu
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{activeIvr?.name || "No IVR configured"}</span>
                {activeIvr && <Badge variant={activeIvr.is_active ? "default" : "secondary"} className="text-xs">{activeIvr.is_active ? "Active" : "Inactive"}</Badge>}
              </div>
              {activeIvr ? (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{activeIvr.greeting_message}</p>
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {activeIvr.menu_options.map(opt => (
                      <Badge key={opt.digit} variant="outline" className="text-xs">Press {opt.digit}: {opt.label}</Badge>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">Calls will route directly to employees without a menu</p>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={startEdit} className="flex-shrink-0">
            <Pencil className="w-3.5 h-3.5 mr-1.5" />{activeIvr ? 'Edit' : 'Configure'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PhoneSettings() {
  const { isAdmin, can } = usePermissions();
  const qc = useQueryClient();
  const [creatingNew, setCreatingNew] = useState(false);
  const [newForm, setNewForm] = useState({ description: '', routing_type: 'employee', target_employee_ids: [], target_employee_names: [], is_active: true, ring_timeout: 30 });

  const { data: routes = [] } = useQuery({
    queryKey: ["phone_routing"],
    queryFn: () => base44.entities.PhoneRouting.list("-priority", 50),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PhoneRouting.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["phone_routing"] }); toast.success("Route saved"); },
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

  const activeRoutes = routes.filter(r => r.is_active);
  const missingNumbers = activeRoutes.filter(r => getRouteNumbers(r, employees).length === 0);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Phone & Call Routing" subtitle="Configure how incoming calls reach your team">
        <Button onClick={() => setCreatingNew(true)} className="gap-2">
          <Plus className="w-4 h-4" />New Route
        </Button>
      </PageHeader>

      {/* Twilio status */}
      <Card className="border-emerald-200 bg-emerald-50">
        <CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-emerald-900">Twilio Connected</p>
            <p className="text-emerald-700 text-xs mt-0.5">
              Point your Twilio number's webhook to: <code className="font-mono bg-emerald-100 px-1 rounded text-[10px] break-all">https://69c5eb4003825e02f32c8e2c.base44.app/api/apps/69c5eb4003825e02f32c8e2c/functions/handleIncomingCall</code>
            </p>
          </div>
          {missingNumbers.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-100 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              {missingNumbers.length} route{missingNumbers.length > 1 ? 's' : ''} missing phone numbers
            </div>
          )}
        </CardContent>
      </Card>

      {/* Call flow diagram */}
      <CallFlowDiagram routes={routes} employees={employees} />

      {/* IVR */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Voice Menu (IVR)</h2>
        <IVRSection employees={employees} />
      </div>

      {/* Routes */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Call Routes ({routes.length})
        </h2>

        {/* Create new */}
        {creatingNew && (
          <Card className="border-primary mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">New Call Route</CardTitle>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setCreatingNew(false)}><X className="w-4 h-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Route Name</Label>
                  <Input value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })} placeholder="e.g. Sales, Support" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Ring Timeout (s)</Label>
                  <Input type="number" value={newForm.ring_timeout} onChange={e => setNewForm({ ...newForm, ring_timeout: parseInt(e.target.value) || 30 })} min="5" max="120" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Routing Type</Label>
                <Select value={newForm.routing_type} onValueChange={v => setNewForm({ ...newForm, routing_type: v, target_role: '', target_employee_ids: [], target_employee_names: [] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Specific Employee(s)</SelectItem>
                    <SelectItem value="role">By Role</SelectItem>
                    <SelectItem value="round_robin">Round-Robin (all active)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newForm.routing_type === 'employee' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Select Employees</Label>
                  <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                    {employees.map(emp => {
                      const selected = (newForm.target_employee_ids || []).includes(emp.id);
                      return (
                        <label key={emp.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50">
                          <Checkbox checked={selected} onCheckedChange={checked => {
                            const ids = newForm.target_employee_ids || [];
                            const names = newForm.target_employee_names || [];
                            const name = `${emp.first_name} ${emp.last_name}`;
                            if (checked) {
                              setNewForm({ ...newForm, target_employee_ids: [...ids, emp.id], target_employee_names: [...names, name] });
                            } else {
                              setNewForm({ ...newForm, target_employee_ids: ids.filter(id => id !== emp.id), target_employee_names: names.filter(n => n !== name) });
                            }
                          }} />
                          <span className="text-sm flex-1">{emp.first_name} {emp.last_name} <span className="text-xs text-muted-foreground capitalize">({ROLE_LABELS[emp.role] || emp.role})</span></span>
                          {emp.phone ? <span className="text-xs font-mono text-emerald-600">{emp.phone}</span> : <span className="text-xs text-red-400">no phone</span>}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
              {newForm.routing_type === 'role' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Target Role</Label>
                  <Select value={newForm.target_role || ''} onValueChange={v => setNewForm({ ...newForm, target_role: v })}>
                    <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([val, label]) => <SelectItem key={val} value={val}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setCreatingNew(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate(newForm)} disabled={!newForm.description}>
                  <Plus className="w-4 h-4 mr-2" />Create Route
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {routes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Phone className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No call routes yet</p>
              <Button onClick={() => setCreatingNew(true)} variant="outline" className="mt-4">Create First Route</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {routes.map(route => (
              <RouteCard
                key={route.id}
                route={route}
                employees={employees}
                roles={[]}
                onUpdate={(id, data) => updateMutation.mutate({ id, data })}
                onDelete={id => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}