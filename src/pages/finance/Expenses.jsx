import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PlusCircle, Upload, Camera, Loader2, Trash2, ImageIcon, Sparkles, ExternalLink, PackagePlus } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["materials","labor","equipment","fuel","tools","permits","insurance","office","other"];
const PAYMENT_METHODS = ["cash","check","credit_card","debit_card","ach","other"];
const CAT_COLORS = {
  materials: "bg-blue-100 text-blue-700", labor: "bg-purple-100 text-purple-700",
  equipment: "bg-amber-100 text-amber-700", fuel: "bg-orange-100 text-orange-700",
  tools: "bg-cyan-100 text-cyan-700", permits: "bg-red-100 text-red-700",
  insurance: "bg-green-100 text-green-700", office: "bg-slate-100 text-slate-600",
  other: "bg-gray-100 text-gray-600"
};

const EMPTY = {
  date: format(new Date(), "yyyy-MM-dd"),
  vendor: "", description: "", amount: "", category: "materials",
  payment_method: "credit_card", job_id: "", notes: "", receipt_url: "", status: "pending"
};

export default function Expenses() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [filterCat, setFilterCat] = useState("all");

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => base44.entities.Expense.list("-date", 200)
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list()
  });

  const { data: materials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => base44.entities.Material.list()
  });

  // State for the "add detected materials" prompt
  const [detectedMaterials, setDetectedMaterials] = useState([]);
  const [addingMaterials, setAddingMaterials] = useState(false);
  const [savingMaterials, setSavingMaterials] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (data) => {
      const payload = { ...data, amount: parseFloat(data.amount) || 0 };
      return editing
        ? base44.entities.Expense.update(editing.id, payload)
        : base44.entities.Expense.create(payload);
    },
    onSuccess: async (_, data) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(editing ? "Expense updated!" : "Expense added!");
      handleClose();
      // Only detect materials for materials-category expenses
      if (data.category === "materials" && (data.description || data.notes || data.vendor)) {
        detectNewMaterials(data);
      }
    }
  });

  async function detectNewMaterials(expense) {
    try {
      const text = [expense.vendor, expense.description, expense.notes].filter(Boolean).join(". ");
      const existingNames = materials.map(m => m.name.toLowerCase());
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `From this roofing materials expense entry, extract a list of specific roofing material items that were likely purchased. Only return distinct material product names (e.g. "Ridge Cap Shingles", "Flashing Roll", "Roofing Felt"). Be concise and specific. Entry: "${text}"`,
        response_json_schema: {
          type: "object",
          properties: {
            items: { type: "array", items: { type: "string" }, description: "List of material names detected" }
          }
        }
      });
      const detected = (result?.items || []).filter(name =>
        name && !existingNames.some(e => e.includes(name.toLowerCase()) || name.toLowerCase().includes(e))
      );
      if (detected.length > 0) {
        setDetectedMaterials(detected.map(name => ({ name, unit: "each", unit_price: "", include: true })));
        setAddingMaterials(true);
      }
    } catch {
      // silently fail — this is non-critical
    }
  }

  async function handleSaveDetectedMaterials() {
    const toAdd = detectedMaterials.filter(m => m.include && m.name);
    if (!toAdd.length) { setAddingMaterials(false); return; }
    setSavingMaterials(true);
    try {
      await Promise.all(toAdd.map(m =>
        base44.entities.Material.create({
          name: m.name,
          unit: m.unit || "each",
          unit_price: parseFloat(m.unit_price) || 0,
          is_active: true,
        })
      ));
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success(`${toAdd.length} material${toAdd.length > 1 ? "s" : ""} added to catalogue!`);
      setAddingMaterials(false);
      setDetectedMaterials([]);
    } finally {
      setSavingMaterials(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Deleted"); }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Expense.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] })
  });

  function handleClose() {
    setOpen(false);
    setForm(EMPTY);
    setEditing(null);
  }

  function openEdit(exp) {
    setEditing(exp);
    setForm({ ...EMPTY, ...exp, amount: String(exp.amount || "") });
    setOpen(true);
  }

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  async function handleFileUpload(file) {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      upd("receipt_url", file_url);
      toast.success("Receipt uploaded!");
      // Auto-scan with AI
      await handleOCRScan(file_url);
    } catch (e) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleOCRScan(imageUrl) {
    const url = imageUrl || form.receipt_url;
    if (!url) { toast.error("Upload a receipt first"); return; }
    setScanning(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract expense data from this receipt/invoice image. Return only the JSON fields you can confidently identify.`,
        file_urls: [url],
        response_json_schema: {
          type: "object",
          properties: {
            vendor: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD format" },
            amount: { type: "number" },
            description: { type: "string" },
            category: { type: "string", enum: ["materials","labor","equipment","fuel","tools","permits","insurance","office","other"] },
            payment_method: { type: "string", enum: ["cash","check","credit_card","debit_card","ach","other"] }
          }
        }
      });
      if (result) {
        setForm(p => ({
          ...p,
          vendor: result.vendor || p.vendor,
          date: result.date || p.date,
          amount: result.amount ? String(result.amount) : p.amount,
          description: result.description || p.description,
          category: result.category || p.category,
          payment_method: result.payment_method || p.payment_method,
        }));
        toast.success("Receipt data extracted automatically!");
      }
    } catch (e) {
      toast.error("Scan failed");
    } finally {
      setScanning(false);
    }
  }

  const filtered = filterCat === "all" ? expenses : expenses.filter(e => e.category === filterCat);
  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Expenses" subtitle={`${filtered.length} records • $${totalFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })} total`}>
        <Button onClick={() => { setForm(EMPTY); setEditing(null); setOpen(true); }}>
          <PlusCircle className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </PageHeader>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilterCat("all")}
          className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border", filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted")}
        >All</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={cn("px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border", filterCat === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted")}
          >{cat}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No expenses yet. Add your first expense or upload a receipt.</p>
            <Button className="mt-4" onClick={() => { setForm(EMPTY); setEditing(null); setOpen(true); }}>Add Expense</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <Card key={exp.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(exp)}>
              <CardContent className="p-4 flex items-center gap-4">
                {/* Receipt thumbnail */}
                <div className="w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0 overflow-hidden bg-muted">
                  {exp.receipt_url ? (
                    <img src={exp.receipt_url} alt="receipt" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{exp.vendor || "Unknown Vendor"}</span>
                    <Badge variant="secondary" className={cn("text-xs capitalize", CAT_COLORS[exp.category])}>{exp.category}</Badge>
                    {exp.status === "approved" && <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">Approved</Badge>}
                    {exp.status === "rejected" && <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">Rejected</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {exp.date ? format(new Date(exp.date), "MMM d, yyyy") : "—"}
                    {exp.description ? ` • ${exp.description}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-sm">${(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  {exp.status === "pending" && (
                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600 border-emerald-200" onClick={() => approveMutation.mutate({ id: exp.id, status: "approved" })}>✓</Button>
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200" onClick={() => approveMutation.mutate({ id: exp.id, status: "rejected" })}>✕</Button>
                    </div>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-8 w-8"><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader><AlertDialogTitle>Delete expense?</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate(exp.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Detected Materials Dialog */}
      <Dialog open={addingMaterials} onOpenChange={v => { if (!v) { setAddingMaterials(false); setDetectedMaterials([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-primary" /> New Materials Detected
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              These materials from the expense aren't in your catalogue yet. Would you like to add them?
            </p>
          </DialogHeader>
          <div className="space-y-3">
            {detectedMaterials.map((m, i) => (
              <div key={i} className="flex items-center gap-3 border rounded-lg p-3">
                <input
                  type="checkbox"
                  checked={m.include}
                  onChange={e => setDetectedMaterials(prev => prev.map((x, xi) => xi === i ? { ...x, include: e.target.checked } : x))}
                  className="w-4 h-4 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={m.unit} onValueChange={v => setDetectedMaterials(prev => prev.map((x, xi) => xi === i ? { ...x, unit: v } : x))}>
                    <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["each","sq_ft","bundle","roll","gallon","box","sheet","linear_ft","square","bag","tube"].map(u => (
                        <SelectItem key={u} value={u} className="text-xs">{u.replace("_"," ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number" step="0.01" placeholder="Price"
                    value={m.unit_price}
                    onChange={e => setDetectedMaterials(prev => prev.map((x, xi) => xi === i ? { ...x, unit_price: e.target.value } : x))}
                    className="w-20 h-7 text-xs"
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddingMaterials(false); setDetectedMaterials([]); }}>Skip</Button>
            <Button onClick={handleSaveDetectedMaterials} disabled={savingMaterials || !detectedMaterials.some(m => m.include)}>
              {savingMaterials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-2" />}
              Add to Catalogue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>

          {/* Receipt Upload Zone */}
          <div
            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {form.receipt_url ? (
              <div className="relative">
                <img src={form.receipt_url} alt="receipt" className="max-h-40 mx-auto rounded-lg object-contain" />
                <div className="flex justify-center gap-2 mt-2">
                  <Button
                    type="button" size="sm" variant="outline"
                    disabled={scanning}
                    onClick={e => { e.stopPropagation(); handleOCRScan(); }}
                  >
                    {scanning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                    {scanning ? "Scanning…" : "Re-scan with AI"}
                  </Button>
                  <a href={form.receipt_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                    <Button type="button" size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                  </a>
                </div>
              </div>
            ) : (
              <div className="py-4">
                {uploading || scanning ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                )}
                <p className="text-sm text-muted-foreground">
                  {uploading ? "Uploading receipt…" : scanning ? "Scanning with AI…" : "Click or drag to upload receipt"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF — AI will extract data automatically</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value = ""; }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => upd("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ($) *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => upd("amount", e.target.value)} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Vendor</Label>
              <Input placeholder="e.g. ABC Supply Co." value={form.vendor} onChange={e => upd("vendor", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => upd("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_"," ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => upd("payment_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_"," ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Linked Job</Label>
              <Select value={form.job_id || "none"} onValueChange={v => upd("job_id", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.customer_name} – {j.address?.split(",")[0]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => upd("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Description / Notes</Label>
              <Textarea rows={2} value={form.notes || form.description} onChange={e => upd("notes", e.target.value)} placeholder="Optional notes..." />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={handleClose}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.amount || !form.date}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editing ? "Update" : "Save Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}