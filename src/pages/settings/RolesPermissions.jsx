import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import PageHeader from "@/components/shared/PageHeader";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, ROLE_PRESETS } from "@/lib/permissions";
import { Plus, Save, Trash2, Shield, ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

function RoleCard({ role, onSave, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description || "");
  const [perms, setPerms] = useState(new Set(role.permissions || []));
  const [dirty, setDirty] = useState(false);

  function togglePerm(key) {
    setPerms(p => {
      const next = new Set(p);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setDirty(true);
  }

  function toggleGroup(keys) {
    const allOn = keys.every(k => perms.has(k));
    setPerms(p => {
      const next = new Set(p);
      keys.forEach(k => allOn ? next.delete(k) : next.add(k));
      return next;
    });
    setDirty(true);
  }

  function applyPreset(presetKey) {
    const preset = ROLE_PRESETS[presetKey];
    if (!preset) return;
    setPerms(new Set(preset.permissions));
    setDirty(true);
    toast.success(`Applied "${preset.label}" preset`);
  }

  function save() {
    onSave(role.id, { name, description, permissions: [...perms] });
    setDirty(false);
  }

  const preset_entries = Object.entries(ROLE_PRESETS);

  return (
    <Card className={`transition-shadow ${expanded ? "shadow-md" : ""}`}>
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between pb-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Shield className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="font-semibold truncate">{role.name}</p>
            {role.description && <p className="text-xs text-muted-foreground truncate">{role.description}</p>}
          </div>
          <Badge variant="secondary" className="flex-shrink-0 text-xs">{role.permissions?.length || 0} permissions</Badge>
        </div>
        <div className="flex items-center gap-2 ml-3" onClick={e => e.stopPropagation()}>
          {dirty && <Button size="sm" onClick={save} className="gap-1"><Save className="w-3 h-3" />Save</Button>}
          {!role.is_system && (
            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => onDelete(role.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 space-y-5 border-t">
          {/* Basic info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Role Name</Label>
              <Input value={name} onChange={e => { setName(e.target.value); setDirty(true); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input value={description} onChange={e => { setDescription(e.target.value); setDirty(true); }} />
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" /> Apply Preset
            </p>
            <div className="flex flex-wrap gap-2">
              {preset_entries.map(([key, p]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="px-3 py-1 rounded-full border text-xs font-medium hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Permissions matrix */}
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Permissions</p>
            {PERMISSION_GROUPS.map(group => {
              const allOn = group.keys.every(k => perms.has(k));
              const someOn = group.keys.some(k => perms.has(k));
              return (
                <div key={group.label} className="rounded-xl border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox
                      id={`grp-${group.label}-${role.id}`}
                      checked={allOn}
                      ref={el => el && (el.indeterminate = someOn && !allOn)}
                      onCheckedChange={() => toggleGroup(group.keys)}
                    />
                    <Label htmlFor={`grp-${group.label}-${role.id}`} className="font-semibold text-sm cursor-pointer">{group.label}</Label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-y-2 gap-x-4 ml-6">
                    {group.keys.map(key => (
                      <div key={key} className="flex items-center gap-2">
                        <Checkbox
                          id={`${key}-${role.id}`}
                          checked={perms.has(key)}
                          onCheckedChange={() => togglePerm(key)}
                        />
                        <Label htmlFor={`${key}-${role.id}`} className="text-xs cursor-pointer text-muted-foreground">
                          {ALL_PERMISSIONS[key]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <Button onClick={save} className="w-full gap-2">
            <Save className="w-4 h-4" />Save Role
          </Button>
        </CardContent>
      )}
    </Card>
  );
}

export default function RolesPermissions() {
  const { can } = usePermissions();
  const qc = useQueryClient();
  const [newName, setNewName] = useState("");

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => base44.entities.Role.list(),
  });

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Role.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role saved"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Role.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role deleted"); },
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Role.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); setNewName(""); toast.success("Role created"); },
  });

  function handleCreate() {
    if (!newName.trim()) return;
    createMutation.mutate({ name: newName.trim(), permissions: [], preset: "custom" });
  }

  if (!can("roles.view")) {
    return <div className="p-8 text-center text-muted-foreground">You don't have permission to view roles.</div>;
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Roles & Permissions"
        subtitle="Define what each role can see and do across the system"
      >
        {can("roles.edit") && (
          <div className="flex items-center gap-2">
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="New role name..."
              className="w-44"
              onKeyDown={e => e.key === "Enter" && handleCreate()}
            />
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />Create Role
            </Button>
          </div>
        )}
      </PageHeader>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No custom roles yet. Create one or apply a preset above.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {roles.map(role => (
            <RoleCard
              key={role.id}
              role={role}
              onSave={(id, data) => saveMutation.mutate({ id, data })}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}