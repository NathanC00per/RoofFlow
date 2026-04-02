import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  PlusCircle, Upload, Camera, Loader2, Trash2, ImageIcon,
  Sparkles, ExternalLink, PackagePlus, X, CheckSquare, Square,
  Check, XCircle, Pencil, ChevronDown, ChevronRight, FileText
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CATEGORIES = ["materials","labor","equipment","fuel","tools","permits","insurance","office","other"];
const PAYMENT_METHODS = ["cash","check","credit_card","debit_card","ach","other"];
const UNITS = ["each","sq_ft","bundle","roll","gallon","box","sheet","linear_ft","square","bag","tube"];

const CAT_COLORS = {
  materials: "bg-blue-100 text-blue-700", labor: "bg-purple-100 text-purple-700",
  equipment: "bg-amber-100 text-amber-700", fuel: "bg-orange-100 text-orange-700",
  tools: "bg-cyan-100 text-cyan-700", permits: "bg-red-100 text-red-700",
  insurance: "bg-green-100 text-green-700", office: "bg-slate-100 text-slate-600",
  other: "bg-gray-100 text-gray-600"
};

const EMPTY_ENTRY = () => ({
  date: format(new Date(), "yyyy-MM-dd"),
  vendor: "", description: "", amount: "", category: "materials",
  payment_method: "credit_card", job_id: "", notes: "", receipt_url: "", status: "pending"
});

const UNIT_MAP = { "sq ft": "sq_ft", "sqft": "sq_ft", "linear ft": "linear_ft", "sq": "square" };
function normaliseUnit(raw) {
  if (!raw) return "each";
  const lower = raw.toLowerCase().trim();
  if (UNIT_MAP[lower]) return UNIT_MAP[lower];
  return UNITS.find(v => lower.includes(v.replace("_", " ")) || lower.includes(v)) || "each";
}

function makeMaterialItem(item) {
  return {
    name: item.name || "",
    model_number: item.model_number || "",
    dimensions: item.dimensions || "",
    unit: normaliseUnit(item.unit),
    unit_price: item.unit_price ? String(item.unit_price) : "",
    status: "pending",
    editing: false,
  };
}

export default function Expenses() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  // Single-edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editingExp, setEditingExp] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_ENTRY());

  // Multi-entry add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [entries, setEntries] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

  const [filterCat, setFilterCat] = useState("all");

  // Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Materials review
  const [detectedMaterials, setDetectedMaterials] = useState([]);
  const [addingMaterials, setAddingMaterials] = useState(false);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [pendingLineItems, setPendingLineItems] = useState([]);

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

  // ─── Mutations ────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Expense.update(editingExp.id, { ...data, amount: parseFloat(data.amount) || 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense updated!");
      setEditOpen(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Expense.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); toast.success("Deleted"); }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Expense.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["expenses"] })
  });

  // ─── Selection helpers ────────────────────────────────────────────────────
  const filtered = filterCat === "all" ? expenses : expenses.filter(e => e.category === filterCat);
  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const allFilteredSelected = filtered.length > 0 && filtered.every(e => selectedIds.includes(e.id));
  const someSelected = selectedIds.length > 0;

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds(prev => prev.filter(id => !filtered.some(e => e.id === id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...filtered.map(e => e.id)])]);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map(id => base44.entities.Expense.delete(id)));
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(`${selectedIds.length} expense${selectedIds.length > 1 ? "s" : ""} deleted`);
      setSelectedIds([]);
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  }

  async function handleBulkApprove(status) {
    await Promise.all(selectedIds.map(id => base44.entities.Expense.update(id, { status })));
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
    toast.success(`${selectedIds.length} expense${selectedIds.length > 1 ? "s" : ""} marked as ${status}`);
    setSelectedIds([]);
  }

  // ─── Open edit dialog ─────────────────────────────────────────────────────
  function openEdit(exp) {
    setEditingExp(exp);
    setEditForm({ ...EMPTY_ENTRY(), ...exp, amount: String(exp.amount || "") });
    setEditOpen(true);
  }

  // ─── Add dialog helpers ───────────────────────────────────────────────────
  function openAddDialog() { setEntries([]); setAddOpen(true); }
  function closeAddDialog() { setAddOpen(false); setEntries([]); setPendingLineItems([]); }

  function updEntry(id, field, value) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, form: { ...e.form, [field]: value } } : e));
  }
  function removeEntry(id) { setEntries(prev => prev.filter(e => e.id !== id)); }
  function toggleCollapse(id) { setEntries(prev => prev.map(e => e.id === id ? { ...e, collapsed: !e.collapsed } : e)); }

  // ─── File upload + scan ───────────────────────────────────────────────────
  async function handleFilesSelected(files) {
    if (!files?.length) return;
    setUploading(true);
    const fileArray = Array.from(files);
    const uploaded = await Promise.allSettled(
      fileArray.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { file_url, name: file.name };
      })
    );
    const succeeded = uploaded.filter(r => r.status === "fulfilled").map(r => r.value);
    setUploading(false);
    if (!succeeded.length) { toast.error("Upload failed"); return; }
    toast.success(`${succeeded.length} file(s) uploaded — scanning…`);

    const newEntries = succeeded.map(f => ({
      id: Math.random().toString(36).slice(2),
      receipt_url: f.file_url,
      fileName: f.name,
      scanning: true,
      collapsed: false,
      form: { ...EMPTY_ENTRY(), receipt_url: f.file_url },
    }));
    setEntries(prev => [...prev, ...newEntries]);
    await Promise.all(newEntries.map(entry => scanEntry(entry.id, entry.receipt_url)));
  }

  async function scanEntry(entryId, url) {
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, scanning: true } : e));
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a receipt/invoice data extraction assistant for a roofing company. Extract ALL available data from this receipt or invoice image as accurately as possible. For line_items, extract every individual product or service line — including its name, model/product number, dimensions/size if shown, quantity, unit price, and line total. Do not skip any line items.`,
        file_urls: [url],
        response_json_schema: {
          type: "object",
          properties: {
            vendor: { type: "string" },
            date: { type: "string", description: "YYYY-MM-DD format" },
            amount: { type: "number" },
            description: { type: "string" },
            category: { type: "string", enum: CATEGORIES },
            payment_method: { type: "string", enum: PAYMENT_METHODS },
            line_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" }, model_number: { type: "string" },
                  dimensions: { type: "string" }, quantity: { type: "number" },
                  unit: { type: "string" }, unit_price: { type: "number" }, total: { type: "number" }
                }
              }
            }
          }
        }
      });
      setEntries(prev => prev.map(e => {
        if (e.id !== entryId) return e;
        return {
          ...e, scanning: false, collapsed: true, lineItems: result?.line_items || [],
          form: {
            ...e.form,
            vendor: result?.vendor || "",
            date: result?.date || e.form.date,
            amount: result?.amount ? String(result.amount) : "",
            description: result?.description || "",
            category: result?.category || "materials",
            payment_method: result?.payment_method || "credit_card",
          }
        };
      }));
      if (result?.line_items?.length) {
        setPendingLineItems(prev => [...prev, ...result.line_items]);
      }
    } catch {
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, scanning: false } : e));
      toast.error(`Scan failed for one file`);
    }
  }

  async function handleSaveAll() {
    if (!entries.length) return;
    setSavingAll(true);
    try {
      await Promise.all(
        entries.map(entry => base44.entities.Expense.create({ ...entry.form, amount: parseFloat(entry.form.amount) || 0 }))
      );
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(`${entries.length} expense${entries.length > 1 ? "s" : ""} saved!`);
      closeAddDialog();
      if (pendingLineItems.length > 0) detectNewMaterials(pendingLineItems);
    } finally {
      setSavingAll(false);
    }
  }

  // ─── Material detection ───────────────────────────────────────────────────
  async function detectNewMaterials(lineItems) {
    try {
      const existingNames = materials.map(m => m.name.toLowerCase());
      const candidates = lineItems.map(makeMaterialItem);
      const newItems = candidates.filter(c =>
        c.name && !existingNames.some(e => e.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(e))
      );
      if (newItems.length > 0) { setDetectedMaterials(newItems); setAddingMaterials(true); }
    } catch { /* non-critical */ }
  }

  async function handleSaveDetectedMaterials() {
    const toAdd = detectedMaterials.filter(m => m.status === "accepted" && m.name);
    if (!toAdd.length) { setAddingMaterials(false); return; }
    setSavingMaterials(true);
    try {
      await Promise.all(toAdd.map(m =>
        base44.entities.Material.create({
          name: m.name, sku: m.model_number || undefined, description: m.dimensions || undefined,
          unit: m.unit || "each", unit_price: parseFloat(m.unit_price) || 0,
          unit_cost: parseFloat(m.unit_price) || 0, is_active: true,
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

  function updMaterial(i, field, val) {
    setDetectedMaterials(prev => prev.map((x, xi) => xi === i ? { ...x, [field]: val } : x));
  }

  const pendingOrAccepted = detectedMaterials.filter(m => m.status !== "rejected");
  const allAccepted = pendingOrAccepted.length > 0 && pendingOrAccepted.every(m => m.status === "accepted");
  const acceptedCount = detectedMaterials.filter(m => m.status === "accepted").length;

  function toggleSelectAllMaterials() {
    if (allAccepted) {
      setDetectedMaterials(prev => prev.map(m => m.status !== "rejected" ? { ...m, status: "pending" } : m));
    } else {
      setDetectedMaterials(prev => prev.map(m => m.status !== "rejected" ? { ...m, status: "accepted" } : m));
    }
  }

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const anyScanning = entries.some(e => e.scanning);

  return (
    <div>
      <PageHeader title="Expenses" subtitle={`${filtered.length} records • €${totalFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })} total`}>
        <Button onClick={openAddDialog}>
          <PlusCircle className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </PageHeader>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={() => setFilterCat("all")} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border", filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted")}>All</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border", filterCat === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted")}>{cat}</button>
        ))}
      </div>

      {/* Bulk action bar */}
      {filtered.length > 0 && (
        <div className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg border mb-4 transition-all",
          someSelected ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-border"
        )}>
          {/* Select all checkbox */}
          <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm font-medium shrink-0">
            {allFilteredSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : someSelected
                ? <div className="w-4 h-4 rounded border-2 border-primary bg-primary/20 flex items-center justify-center"><div className="w-1.5 h-0.5 bg-primary rounded" /></div>
                : <Square className="w-4 h-4 text-muted-foreground" />
            }
            <span className="text-xs text-muted-foreground">
              {someSelected ? `${selectedIds.length} selected` : "Select all"}
            </span>
          </button>

          {someSelected && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                onClick={() => handleBulkApprove("approved")}>
                <Check className="w-3 h-3 mr-1" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => handleBulkApprove("rejected")}>
                <XCircle className="w-3 h-3 mr-1" /> Reject
              </Button>
              <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/5 ml-auto"
                onClick={() => setConfirmBulkDelete(true)}>
                <Trash2 className="w-3 h-3 mr-1" /> Delete {selectedIds.length}
              </Button>
            </>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-16">
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No expenses yet.</p>
          <Button className="mt-4" onClick={openAddDialog}>Add Expense</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => {
            const isSelected = selectedIds.includes(exp.id);
            return (
              <Card key={exp.id} className={cn("transition-all", isSelected ? "ring-2 ring-primary border-primary" : "hover:shadow-md")}>
                <CardContent className="p-4 flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={e => { e.stopPropagation(); toggleSelect(exp.id); }}
                    className="shrink-0 w-5 h-5 flex items-center justify-center"
                  >
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4 text-muted-foreground/50 hover:text-muted-foreground" />
                    }
                  </button>

                  {/* Thumbnail — clickable to open edit */}
                  <div className="w-12 h-12 rounded-lg border flex items-center justify-center flex-shrink-0 overflow-hidden bg-muted cursor-pointer" onClick={() => openEdit(exp)}>
                    {exp.receipt_url
                      ? <img src={exp.receipt_url} alt="receipt" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-5 h-5 text-muted-foreground" />
                    }
                  </div>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(exp)}>
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

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-bold text-sm">€{(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    {exp.status === "pending" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" className="text-xs h-7 text-emerald-600 border-emerald-200" onClick={e => { e.stopPropagation(); approveMutation.mutate({ id: exp.id, status: "approved" }); }}>✓</Button>
                        <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200" onClick={e => { e.stopPropagation(); approveMutation.mutate({ id: exp.id, status: "rejected" }); }}>✕</Button>
                      </div>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={e => e.stopPropagation()}><Trash2 className="w-3.5 h-3.5 text-muted-foreground" /></Button>
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
            );
          })}
        </div>
      )}

      {/* ── Bulk delete confirmation ── */}
      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} expense{selectedIds.length > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete all selected expenses. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} disabled={bulkDeleting} className="bg-destructive text-destructive-foreground">
              {bulkDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete {selectedIds.length}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── ADD EXPENSES DIALOG (multi-entry) ── */}
      <Dialog open={addOpen} onOpenChange={v => { if (!v) closeAddDialog(); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col gap-0 p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4 text-primary" /> Add Expenses
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-0.5">Upload receipts/invoices — each file becomes a separate expense entry.</p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <label className={cn("flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors", uploading ? "border-primary/50 bg-primary/5" : "hover:bg-muted/40")}>
              {uploading ? <Loader2 className="w-8 h-8 text-primary mb-2 animate-spin" /> : <Camera className="w-8 h-8 text-muted-foreground mb-2" />}
              <p className="text-sm font-medium">{uploading ? "Uploading…" : "Click to upload receipts / invoices"}</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF · Multiple files · AI auto-fills each entry</p>
              <input type="file" accept="image/*,application/pdf" multiple className="hidden"
                onChange={e => { handleFilesSelected(e.target.files); e.target.value = ""; }} />
            </label>

            {entries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {entries.length} Receipt{entries.length > 1 ? "s" : ""} / Invoice{entries.length > 1 ? "s" : ""}
                  </p>
                  {anyScanning && <span className="text-xs text-primary flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Scanning…</span>}
                </div>
                {entries.map((entry, idx) => (
                  <ExpenseEntryRow key={entry.id} entry={entry} index={idx} jobs={jobs}
                    onUpdate={(field, val) => updEntry(entry.id, field, val)}
                    onRemove={() => removeEntry(entry.id)}
                    onToggleCollapse={() => toggleCollapse(entry.id)}
                    onRescan={() => scanEntry(entry.id, entry.receipt_url)}
                  />
                ))}
              </div>
            )}

            {!uploading && (
              <button
                onClick={() => {
                  const id = Math.random().toString(36).slice(2);
                  setEntries(prev => [...prev, { id, receipt_url: "", fileName: "Manual entry", scanning: false, collapsed: false, lineItems: [], form: EMPTY_ENTRY() }]);
                }}
                className="w-full text-xs text-muted-foreground border border-dashed rounded-lg py-2 hover:bg-muted/40 transition-colors flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add manual entry (no receipt)
              </button>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t shrink-0">
            <Button variant="outline" onClick={closeAddDialog}>Cancel</Button>
            <Button onClick={handleSaveAll} disabled={entries.length === 0 || anyScanning || savingAll}>
              {savingAll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Save {entries.length > 0 ? `${entries.length} Expense${entries.length > 1 ? "s" : ""}` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── EDIT SINGLE EXPENSE DIALOG ── */}
      <Dialog open={editOpen} onOpenChange={v => { if (!v) setEditOpen(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editForm.receipt_url && (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
              <img src={editForm.receipt_url} alt="receipt" className="w-16 h-16 object-cover rounded-lg border" />
              <a href={editForm.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="w-3 h-3" /> View receipt
              </a>
            </div>
          )}
          <ExpenseFormFields form={editForm} jobs={jobs} onChange={(f, v) => setEditForm(p => ({ ...p, [f]: v }))} />
          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate(editForm)} disabled={updateMutation.isPending || !editForm.amount || !editForm.date}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MATERIALS REVIEW DIALOG ── */}
      <Dialog open={addingMaterials} onOpenChange={v => { if (!v) { setAddingMaterials(false); setDetectedMaterials([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-primary" /> New Materials Detected
            </DialogTitle>
            <p className="text-sm text-muted-foreground">{detectedMaterials.length} item{detectedMaterials.length !== 1 ? "s" : ""} not in your catalogue.</p>
          </DialogHeader>
          <div className="flex items-center justify-between px-1 pb-1 border-b">
            <button onClick={toggleSelectAllMaterials} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {allAccepted ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              {allAccepted ? "Deselect all" : "Accept all"}
            </button>
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-600 font-medium">{acceptedCount} accepted</span>
              <span className="text-red-500 font-medium">{detectedMaterials.filter(m => m.status === "rejected").length} rejected</span>
              <span className="text-muted-foreground">{detectedMaterials.filter(m => m.status === "pending").length} pending</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
            {detectedMaterials.map((m, i) => (
              <MaterialReviewRow key={i} material={m} onChange={(field, val) => updMaterial(i, field, val)} />
            ))}
          </div>
          <DialogFooter className="border-t pt-3 mt-0">
            <Button variant="outline" onClick={() => { setAddingMaterials(false); setDetectedMaterials([]); }}>Skip All</Button>
            <Button onClick={handleSaveDetectedMaterials} disabled={savingMaterials || acceptedCount === 0}>
              {savingMaterials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-2" />}
              Add {acceptedCount > 0 ? `${acceptedCount} ` : ""}to Catalogue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Collapsible expense entry row ───────────────────────────────────────────
function ExpenseEntryRow({ entry, index, jobs, onUpdate, onRemove, onToggleCollapse, onRescan }) {
  const { form, collapsed, scanning, receipt_url, fileName } = entry;
  const displayName = form.vendor || fileName || `Entry ${index + 1}`;
  const displayAmount = form.amount ? `€${parseFloat(form.amount).toFixed(2)}` : "—";

  return (
    <div className={cn("border rounded-xl overflow-hidden transition-all", scanning && "border-primary/40 bg-primary/5")}>
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors select-none" onClick={onToggleCollapse}>
        <div className="w-10 h-10 rounded-lg border overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {receipt_url ? <img src={receipt_url} alt="" className="w-full h-full object-cover" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {form.date ? format(new Date(form.date + "T00:00:00"), "MMM d, yyyy") : "No date"} · {displayAmount} · <span className="capitalize">{form.category}</span>
          </p>
        </div>
        {scanning && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {receipt_url && !scanning && (
            <button onClick={onRescan} className="w-7 h-7 rounded border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors" title="Re-scan">
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={onRemove} className="w-7 h-7 rounded border flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" title="Remove">
            <X className="w-3.5 h-3.5" />
          </button>
          {collapsed ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {!collapsed && (
        <div className="px-4 pb-4 border-t bg-muted/10">
          <div className="pt-3">
            <ExpenseFormFields form={form} jobs={jobs} onChange={onUpdate} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared form fields ───────────────────────────────────────────────────────
function ExpenseFormFields({ form, jobs, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label className="text-xs">Date *</Label>
        <Input type="date" value={form.date} onChange={e => onChange("date", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Amount (€) *</Label>
        <Input type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => onChange("amount", e.target.value)} />
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label className="text-xs">Vendor</Label>
        <Input placeholder="e.g. ABC Supply Co." value={form.vendor} onChange={e => onChange("vendor", e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Category</Label>
        <Select value={form.category} onValueChange={v => onChange("category", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Payment Method</Label>
        <Select value={form.payment_method} onValueChange={v => onChange("payment_method", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Linked Job</Label>
        <Select value={form.job_id || "none"} onValueChange={v => onChange("job_id", v === "none" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {jobs.map(j => <SelectItem key={j.id} value={j.id}>{j.customer_name} – {j.address?.split(",")[0]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Status</Label>
        <Select value={form.status} onValueChange={v => onChange("status", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 col-span-2">
        <Label className="text-xs">Description / Notes</Label>
        <Textarea rows={2} value={form.notes || form.description || ""} onChange={e => onChange("notes", e.target.value)} placeholder="Optional notes..." />
      </div>
    </div>
  );
}

// ─── Material review row ──────────────────────────────────────────────────────
function MaterialReviewRow({ material: m, onChange }) {
  const isAccepted = m.status === "accepted";
  const isRejected = m.status === "rejected";
  const isEditing = m.editing;

  return (
    <div className={cn("border rounded-lg p-3 transition-all", isAccepted && "border-emerald-300 bg-emerald-50/50", isRejected && "border-red-200 bg-red-50/40 opacity-60", !isAccepted && !isRejected && "border-border")}>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 shrink-0">
          <button title="Accept" onClick={() => onChange("status", isAccepted ? "pending" : "accepted")}
            className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors", isAccepted ? "bg-emerald-500 text-white" : "border hover:bg-emerald-50 hover:border-emerald-300 text-muted-foreground")}>
            <Check className="w-3.5 h-3.5" />
          </button>
          <button title="Reject" onClick={() => onChange("status", isRejected ? "pending" : "rejected")}
            className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors", isRejected ? "bg-red-400 text-white" : "border hover:bg-red-50 hover:border-red-300 text-muted-foreground")}>
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
        {isEditing
          ? <Input value={m.name} onChange={e => onChange("name", e.target.value)} className="h-7 text-sm font-medium flex-1" placeholder="Material name" autoFocus />
          : <span className={cn("flex-1 text-sm font-medium truncate", isRejected && "line-through text-muted-foreground")}>{m.name || <span className="italic text-muted-foreground">Unnamed</span>}</span>
        }
        <button onClick={() => onChange("editing", !isEditing)} className="w-7 h-7 rounded-md border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0">
          {isEditing ? <Check className="w-3.5 h-3.5 text-primary" /> : <Pencil className="w-3 h-3" />}
        </button>
      </div>
      {!isRejected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 ml-16">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Model / SKU</p>
            {isEditing ? <Input value={m.model_number} onChange={e => onChange("model_number", e.target.value)} className="h-6 text-xs" placeholder="ABC-123" />
              : <p className="text-xs truncate">{m.model_number || <span className="text-muted-foreground/60">—</span>}</p>}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Dimensions</p>
            {isEditing ? <Input value={m.dimensions} onChange={e => onChange("dimensions", e.target.value)} className="h-6 text-xs" placeholder="e.g. 1m×5m" />
              : <p className="text-xs truncate">{m.dimensions || <span className="text-muted-foreground/60">—</span>}</p>}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Unit</p>
            {isEditing
              ? <Select value={m.unit} onValueChange={v => onChange("unit", v)}>
                  <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u} className="text-xs">{u.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              : <p className="text-xs">{m.unit?.replace("_", " ")}</p>}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Unit Price (€)</p>
            {isEditing ? <Input type="number" step="0.01" placeholder="0.00" value={m.unit_price} onChange={e => onChange("unit_price", e.target.value)} className="h-6 text-xs" />
              : <p className="text-xs font-medium">{m.unit_price ? `€${parseFloat(m.unit_price).toFixed(2)}` : <span className="text-muted-foreground/60">—</span>}</p>}
          </div>
        </div>
      )}
    </div>
  );
}