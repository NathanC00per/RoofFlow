import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const UNITS = [
  { value: "each", label: "Each" },
  { value: "sq_ft", label: "Sq Ft" },
  { value: "bundle", label: "Bundle" },
  { value: "roll", label: "Roll" },
  { value: "gallon", label: "Gallon" },
  { value: "box", label: "Box" },
  { value: "sheet", label: "Sheet" },
  { value: "linear_ft", label: "Linear Ft" },
  { value: "square", label: "Square (100 sq ft)" },
  { value: "bag", label: "Bag" },
  { value: "tube", label: "Tube" },
];

const empty = { name: "", category_id: "", description: "", unit: "each", unit_cost: "", unit_price: "", sku: "", supplier: "" };

export default function MaterialFormDialog({ open, onClose, existing, categories }) {
  const [form, setForm] = useState(empty);
  const queryClient = useQueryClient();

  useEffect(() => {
    setForm(existing ? { ...empty, ...existing, unit_cost: existing.unit_cost ?? "", unit_price: existing.unit_price ?? "" } : empty);
  }, [existing, open]);

  const mutation = useMutation({
    mutationFn: (data) => {
      const cat = categories.find(c => c.id === data.category_id);
      const payload = {
        ...data,
        category_name: cat?.name || "",
        unit_cost: data.unit_cost !== "" ? Number(data.unit_cost) : undefined,
        unit_price: Number(data.unit_price),
      };
      return existing ? base44.entities.Material.update(existing.id, payload) : base44.entities.Material.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success(existing ? "Material updated!" : "Material added!");
      onClose();
    },
  });

  const update = (f, v) => setForm(p => ({ ...p, [f]: v }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Material" : "Add Material"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Architectural Shingles 30yr" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category_id} onValueChange={v => update("category_id", v)}>
                <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Unit *</Label>
              <Select value={form.unit} onValueChange={v => update("unit", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Your Cost ($/unit)</Label>
              <Input type="number" step="0.01" value={form.unit_cost} onChange={e => update("unit_cost", e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-1.5">
              <Label>Sell Price ($/unit) *</Label>
              <Input type="number" step="0.01" value={form.unit_price} onChange={e => update("unit_price", e.target.value)} placeholder="0.00" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>SKU</Label>
              <Input value={form.sku} onChange={e => update("sku", e.target.value)} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Supplier</Label>
              <Input value={form.supplier} onChange={e => update("supplier", e.target.value)} placeholder="Optional" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => update("description", e.target.value)} rows={2} />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>{existing ? "Update" : "Add Material"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}