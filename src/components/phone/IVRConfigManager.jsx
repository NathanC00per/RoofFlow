import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Save, PhoneOff } from "lucide-react";
import { toast } from "sonner";

const DIGIT_OPTIONS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#"];

export default function IVRConfigManager() {
  const qc = useQueryClient();
  const [creatingNew, setCreatingNew] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);

  const { data: ivrConfigs = [] } = useQuery({
    queryKey: ["ivr_configs"],
    queryFn: () => base44.entities.IVRConfig.list(),
  });

  const { data: routes = [] } = useQuery({
    queryKey: ["phone_routing"],
    queryFn: () => base44.entities.PhoneRouting.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.IVRConfig.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ivr_configs"] });
      setCreatingNew(false);
      setForm(null);
      toast.success("IVR created");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.IVRConfig.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ivr_configs"] });
      setEditingId(null);
      setForm(null);
      toast.success("IVR updated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.IVRConfig.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ivr_configs"] });
      toast.success("IVR deleted");
    },
  });

  function handleCreateNew() {
    setForm({
      name: "",
      greeting_message: "Welcome to our company. ",
      menu_options: [
        { digit: "1", label: "Sales", description_text: "Press 1 for Sales", route_id: "", route_description: "" },
        { digit: "2", label: "Support", description_text: "Press 2 for Support", route_id: "", route_description: "" },
      ],
      timeout_seconds: 5,
      max_attempts: 3,
      is_active: true,
    });
    setCreatingNew(true);
  }

  function handleEdit(ivr) {
    setForm({ ...ivr });
    setEditingId(ivr.id);
  }

  function handleSave() {
    if (!form.name || !form.greeting_message || form.menu_options.length === 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    const data = {
      name: form.name,
      greeting_message: form.greeting_message,
      menu_options: form.menu_options,
      timeout_seconds: form.timeout_seconds,
      max_attempts: form.max_attempts,
      is_active: form.is_active,
    };

    if (creatingNew) {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate({ id: editingId, data });
    }
  }

  function addMenuOption() {
    const newOption = {
      digit: "3",
      label: "New Option",
      description_text: "Press 3 for New Option",
      route_id: "",
      route_description: "",
    };
    setForm({
      ...form,
      menu_options: [...form.menu_options, newOption],
    });
  }

  function removeMenuOption(index) {
    setForm({
      ...form,
      menu_options: form.menu_options.filter((_, i) => i !== index),
    });
  }

  function updateMenuOption(index, field, value) {
    const updated = [...form.menu_options];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, menu_options: updated });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <PhoneOff className="w-5 h-5" /> Interactive Voice Response (IVR)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create voice menus that let callers select their destination by pressing keys
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          New IVR Menu
        </Button>
      </div>

      {/* Edit/Create Form */}
      {(creatingNew || editingId) && form && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-base">{creatingNew ? "Create" : "Edit"} IVR Menu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Menu Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Main Menu"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Greeting Message</Label>
              <Textarea
                value={form.greeting_message}
                onChange={(e) => setForm({ ...form, greeting_message: e.target.value })}
                placeholder="Thank you for calling..."
                className="h-20"
              />
              <p className="text-xs text-muted-foreground">What the caller hears first</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Timeout (seconds)</Label>
              <Input
                type="number"
                value={form.timeout_seconds}
                onChange={(e) => setForm({ ...form, timeout_seconds: parseInt(e.target.value) })}
                min="1"
                max="30"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Max Retry Attempts</Label>
              <Input
                type="number"
                value={form.max_attempts}
                onChange={(e) => setForm({ ...form, max_attempts: parseInt(e.target.value) })}
                min="1"
                max="10"
              />
            </div>

            {/* Menu Options */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Menu Options</Label>
                <Button size="sm" variant="outline" onClick={addMenuOption}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              </div>

              <div className="space-y-3">
                {form.menu_options.map((option, idx) => (
                  <div key={idx} className="border rounded-lg p-3 space-y-2 bg-slate-50">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                          <div className="w-20">
                            <Label className="text-xs text-muted-foreground">Digit</Label>
                            <Select value={option.digit} onValueChange={(v) => updateMenuOption(idx, "digit", v)}>
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {DIGIT_OPTIONS.map((d) => (
                                  <SelectItem key={d} value={d}>
                                    {d}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">Label</Label>
                            <Input
                              value={option.label}
                              onChange={(e) => updateMenuOption(idx, "label", e.target.value)}
                              placeholder="e.g., Sales"
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Prompt Text</Label>
                          <Input
                            value={option.description_text}
                            onChange={(e) => updateMenuOption(idx, "description_text", e.target.value)}
                            placeholder="e.g., Press 1 for Sales"
                            className="h-8 text-sm"
                          />
                        </div>

                        <div>
                           <Label className="text-xs text-muted-foreground">Route To</Label>
                           <Select
                             value={option.route_id || ""}
                             onValueChange={(v) => {
                               const selectedRoute = routes.find((r) => r.id === v);
                               const updated = [...form.menu_options];
                               updated[idx] = {
                                 ...updated[idx],
                                 route_id: v,
                                 route_description: selectedRoute?.description || ""
                               };
                               setForm({ ...form, menu_options: updated });
                             }}
                           >
                             <SelectTrigger className="h-8 text-sm">
                               <SelectValue placeholder="Select route..." />
                             </SelectTrigger>
                             <SelectContent>
                               {routes.map((r) => (
                                 <SelectItem key={r.id} value={r.id}>
                                   {r.description}
                                 </SelectItem>
                               ))}
                             </SelectContent>
                           </Select>
                         </div>
                      </div>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive mt-6"
                        onClick={() => removeMenuOption(idx)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="active" className="text-sm cursor-pointer">
                Active IVR (will be used for all incoming calls)
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCreatingNew(false);
                  setEditingId(null);
                  setForm(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                {creatingNew ? "Create" : "Save"} IVR
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* IVR List */}
      <div className="space-y-3">
        {ivrConfigs.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <PhoneOff className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No IVR menus configured</p>
              <Button onClick={handleCreateNew} variant="outline" className="mt-4">
                Create First IVR
              </Button>
            </CardContent>
          </Card>
        ) : (
          ivrConfigs.map((ivr) => (
            <Card key={ivr.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{ivr.name}</h4>
                      <Badge variant={ivr.is_active ? "default" : "secondary"}>
                        {ivr.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">{ivr.greeting_message}</p>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {ivr.menu_options.map((opt) => (
                        <Badge key={opt.digit} variant="outline" className="text-xs">
                          Press {opt.digit}: {opt.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(ivr)}>
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(ivr.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}