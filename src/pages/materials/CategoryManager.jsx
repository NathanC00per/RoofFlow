import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, PlusCircle, Tag } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#84cc16"];

export default function CategoryManager({ open, onClose }) {
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);
  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery({
    queryKey: ["material-categories"],
    queryFn: () => base44.entities.MaterialCategory.list("name"),
  });

  const createMutation = useMutation({
    mutationFn: () => base44.entities.MaterialCategory.create({ name: newName, description: newDesc, color: newColor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-categories"] });
      toast.success("Category created!");
      setNewName("");
      setNewDesc("");
      setNewColor(COLORS[0]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MaterialCategory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["material-categories"] });
      toast.success("Category deleted");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Tag className="w-4 h-4" /> Material Categories</DialogTitle>
        </DialogHeader>

        {/* Existing categories */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No categories yet</p>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-2.5 rounded-lg border">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || "#94a3b8" }} />
                  <div>
                    <p className="text-sm font-medium">{cat.name}</p>
                    {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteMutation.mutate(cat.id)}>
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>

        {/* Add new */}
        <div className="border-t pt-4 space-y-3">
          <p className="text-sm font-semibold">Add New Category</p>
          <div className="space-y-1.5">
            <Label>Name *</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Shingles, Underlayment, Fasteners" />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={2} />
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  className="w-6 h-6 rounded-full border-2 transition-all"
                  style={{ backgroundColor: c, borderColor: newColor === c ? "#1e293b" : "transparent" }}
                />
              ))}
            </div>
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={!newName || createMutation.isPending} className="w-full">
            <PlusCircle className="w-4 h-4 mr-2" /> Add Category
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}