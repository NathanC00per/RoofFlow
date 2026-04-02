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
  Sparkles, ExternalLink, PackagePlus, X, CheckSquare, Square, Check, XCircle, Pencil
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

const EMPTY = {
  date: format(new Date(), "yyyy-MM-dd"),
  vendor: "", description: "", amount: "", category: "materials",
  payment_method: "credit_card", job_id: "", notes: "", receipt_url: "", status: "pending"
};

const UNIT_MAP = { "sq ft": "sq_ft", "sqft": "sq_ft", "linear ft": "linear_ft", "sq": "square" };
function normaliseUnit(raw) {
  if (!raw) return "each";
  const lower = raw.toLowerCase().trim();
  if (UNIT_MAP[lower]) return UNIT_MAP[lower];
  return UNITS.find(v => lower.includes(v.replace("_", " ")) || lower.includes(v)) || "each";
}

// Material status: "pending" | "accepted" | "rejected"
function makeMaterialItem(item) {
  return {
    name: item.name || "",
    model_number: item.model_number || "",
    dimensions: item.dimensions || "",
    unit: normaliseUnit(item.unit),
    unit_price: item.unit_price ? String(item.unit_price) : "",
    status: "pending", // pending / accepted / rejected
    editing: false,
  };
}

export default function Expenses() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [filterCat, setFilterCat] = useState("all");

  // Multi-file upload state
  const [receiptFiles, setReceiptFiles] = useState([]); // [{ url, scanning, name }]
  const [globalUploading, setGlobalUploading] = useState(false);

  // Materials review dialog
  const [detectedMaterials, setDetectedMaterials] = useState([]);
  const [addingMaterials, setAddingMaterials] = useState(false);
  const [savingMaterials, setSavingMaterials] = useState(false);
  const [scannedLineItems, setScannedLineItems] = useState([]);

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
      if (data.category === "materials") {
        detectNewMaterials(data);
      }
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

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function handleClose() {
    setOpen(false);
    setForm(EMPTY);
    setEditing(null);
    setReceiptFiles([]);
    setScannedLineItems([]);
  }

  function openEdit(exp) {
    setEditing(exp);
    setForm({ ...EMPTY, ...exp, amount: String(exp.amount || "") });
    setReceiptFiles(exp.receipt_url ? [{ url: exp.receipt_url, name: "receipt", scanning: false }] : []);
    setOpen(true);
  }

  const upd = (f, v) => setForm(p => ({ ...p, [f]: v }));

  // ─── Multi-file upload ─────────────────────────────────────────────────────
  async function handleFilesSelected(files) {
    if (!files?.length) return;
    setGlobalUploading(true);
    const fileArray = Array.from(files);

    // Upload all files in parallel
    const uploaded = await Promise.allSettled(
      fileArray.map(async (file) => {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        return { url: file_url, name: file.name, scanning: false };
      })
    );

    const succeeded = uploaded
      .filter(r => r.status === "fulfilled")
      .map(r => r.value);

    setReceiptFiles(prev => {
      const combined = [...prev, ...succeeded];
      // Set the first uploaded file as the primary receipt_url if not set
      if (combined.length > 0) {
        upd("receipt_url", combined[0].url);
      }
      return combined;
    });
    setGlobalUploading(false);

    if (succeeded.length) toast.success(`${succeeded.length} file(s) uploaded`);

    // Auto-scan all newly uploaded files
    for (const file of succeeded) {
      await scanFile(file.url);
    }
  }

  function removeReceiptFile(url) {
    setReceiptFiles(prev => {
      const updated = prev.filter(f => f.url !== url);
      upd("receipt_url", updated[0]?.url || "");
      return updated;
    });
  }

  // ─── OCR Scan ─────────────────────────────────────────────────────────────
  async function scanFile(url) {
    setReceiptFiles(prev => prev.map(f => f.url === url ? { ...f, scanning: true } : f));
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
                  name: { type: "string" },
                  model_number: { type: "string" },
                  dimensions: { type: "string" },
                  quantity: { type: "number" },
                  unit: { type: "string" },
                  unit_price: { type: "number" },
                  total: { type: "number" }
                }
              }
            }
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
        if (result.line_items?.length) {
          setScannedLineItems(prev => [...prev, ...result.line_items]);
        }
        toast.success(`Scanned — ${result.line_items?.length || 0} line item(s) detected`);
      }
    } catch {
      toast.error("Scan failed for one file");
    } finally {
      setReceiptFiles(prev => prev.map(f => f.url === url ? { ...f, scanning: false } : f));
    }
  }

  // ─── Material Detection ────────────────────────────────────────────────────
  async function detectNewMaterials(expense) {
    try {
      const existingNames = materials.map(m => m.name.toLowerCase());
      let candidates = [];

      if (scannedLineItems.length > 0) {
        candidates = scannedLineItems.map(makeMaterialItem);
      } else {
        const text = [expense.vendor, expense.description, expense.notes].filter(Boolean).join(". ");
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `From this roofing materials expense entry, extract each individual material item purchased including its name, model/product number if mentioned, dimensions if mentioned, and unit price if mentioned. Entry: "${text}"`,
          response_json_schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    model_number: { type: "string" },
                    dimensions: { type: "string" },
                    unit: { type: "string" },
                    unit_price: { type: "number" }
                  }
                }
              }
            }
          }
        });
        candidates = (result?.items || []).map(makeMaterialItem);
      }

      const newItems = candidates.filter(c =>
        c.name && !existingNames.some(e => e.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(e))
      );

      setScannedLineItems([]);

      if (newItems.length > 0) {
        setDetectedMaterials(newItems);
        setAddingMaterials(true);
      }
    } catch {
      // non-critical, fail silently
    }
  }

  // ─── Save Materials ────────────────────────────────────────────────────────
  async function handleSaveDetectedMaterials() {
    const toAdd = detectedMaterials.filter(m => m.status === "accepted" && m.name);
    if (!toAdd.length) { setAddingMaterials(false); return; }
    setSavingMaterials(true);
    try {
      await Promise.all(toAdd.map(m =>
        base44.entities.Material.create({
          name: m.name,
          sku: m.model_number || undefined,
          description: m.dimensions || undefined,
          unit: m.unit || "each",
          unit_price: parseFloat(m.unit_price) || 0,
          unit_cost: parseFloat(m.unit_price) || 0,
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

  function updMaterial(i, field, val) {
    setDetectedMaterials(prev => prev.map((x, xi) => xi === i ? { ...x, [field]: val } : x));
  }

  const pendingOrAccepted = detectedMaterials.filter(m => m.status !== "rejected");
  const allAccepted = pendingOrAccepted.length > 0 && pendingOrAccepted.every(m => m.status === "accepted");

  function toggleSelectAll() {
    if (allAccepted) {
      setDetectedMaterials(prev => prev.map(m => m.status !== "rejected" ? { ...m, status: "pending" } : m));
    } else {
      setDetectedMaterials(prev => prev.map(m => m.status !== "rejected" ? { ...m, status: "accepted" } : m));
    }
  }

  const acceptedCount = detectedMaterials.filter(m => m.status === "accepted").length;

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filtered = filterCat === "all" ? expenses : expenses.filter(e => e.category === filterCat);
  const totalFiltered = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const anyScanning = receiptFiles.some(f => f.scanning);

  return (
    <div>
      <PageHeader title="Expenses" subtitle={`${filtered.length} records • €${totalFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })} total`}>
        <Button onClick={() => { setForm(EMPTY); setEditing(null); setReceiptFiles([]); setOpen(true); }}>
          <PlusCircle className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </PageHeader>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setFilterCat("all")} className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-all border", filterCat === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted")}>All</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} className={cn("px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-all border", filterCat === cat ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:bg-muted")}>{cat}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="text-center py-16">
          <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No expenses yet.</p>
          <Button className="mt-4" onClick={() => { setForm(EMPTY); setEditing(null); setReceiptFiles([]); setOpen(true); }}>Add Expense</Button>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(exp => (
            <Card key={exp.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(exp)}>
              <CardContent className="p-4 flex items-center gap-4">
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
                  <span className="font-bold text-sm">€{(exp.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
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

      {/* ── Add/Edit Expense Dialog ── */}
      <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>

          {/* Multi-file Upload Zone */}
          <div
            className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-muted/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {receiptFiles.length > 0 ? (
              <div onClick={e => e.stopPropagation()}>
                <div className="flex flex-wrap gap-2 justify-center mb-3">
                  {receiptFiles.map((f, i) => (
                    <div key={f.url} className="relative group w-20 h-20">
                      <img src={f.url} alt="" className="w-full h-full object-cover rounded-lg border" />
                      {f.scanning && (
                        <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                          <Loader2 className="w-5 h-5 text-white animate-spin" />
                        </div>
                      )}
                      <button
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        onClick={() => removeReceiptFile(f.url)}
                      >
                        <X className="w-3 h-3" />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1 rounded">primary</span>
                      )}
                    </div>
                  ))}
                  {/* Add more */}
                  <label className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground">
                    <Upload className="w-4 h-4 mb-1" />
                    <span className="text-[10px]">Add more</span>
                    <input type="file" accept="image/*,application/pdf" multiple className="hidden"
                      onChange={e => { handleFilesSelected(e.target.files); e.target.value = ""; }} />
                  </label>
                </div>
                <div className="flex justify-center gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={anyScanning}
                    onClick={() => receiptFiles.forEach(f => !f.scanning && scanFile(f.url))}>
                    {anyScanning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                    {anyScanning ? "Scanning…" : "Re-scan All"}
                  </Button>
                  {receiptFiles[0] && (
                    <a href={receiptFiles[0].url} target="_blank" rel="noopener noreferrer">
                      <Button type="button" size="sm" variant="ghost"><ExternalLink className="w-3.5 h-3.5" /></Button>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4">
                {globalUploading ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                )}
                <p className="text-sm text-muted-foreground">
                  {globalUploading ? "Uploading…" : "Click or drag to upload receipt(s)"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF · Multiple files supported · AI auto-scans</p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              multiple
              className="hidden"
              onChange={e => { handleFilesSelected(e.target.files); e.target.value = ""; }}
              onClick={e => e.stopPropagation()}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Date *</Label>
              <Input type="date" value={form.date} onChange={e => upd("date", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Amount (€) *</Label>
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
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => upd("payment_method", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map(m => <SelectItem key={m} value={m} className="capitalize">{m.replace("_", " ")}</SelectItem>)}</SelectContent>
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

      {/* ── Materials Review Dialog ── */}
      <Dialog open={addingMaterials} onOpenChange={v => { if (!v) { setAddingMaterials(false); setDetectedMaterials([]); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-primary" /> New Materials Detected
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {detectedMaterials.length} item{detectedMaterials.length !== 1 ? "s" : ""} not in your catalogue. Review, edit, accept or reject each one before adding.
            </p>
          </DialogHeader>

          {/* Bulk actions bar */}
          <div className="flex items-center justify-between px-1 pb-1 border-b">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {allAccepted
                ? <CheckSquare className="w-4 h-4 text-primary" />
                : <Square className="w-4 h-4" />
              }
              {allAccepted ? "Deselect all" : "Accept all"}
            </button>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="text-emerald-600 font-medium">{acceptedCount} accepted</span>
              <span className="text-red-500 font-medium">{detectedMaterials.filter(m => m.status === "rejected").length} rejected</span>
              <span>{detectedMaterials.filter(m => m.status === "pending").length} pending</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1 py-1">
            {detectedMaterials.map((m, i) => (
              <MaterialReviewRow
                key={i}
                material={m}
                onChange={(field, val) => updMaterial(i, field, val)}
              />
            ))}
          </div>

          <DialogFooter className="border-t pt-3 mt-0">
            <Button variant="outline" onClick={() => { setAddingMaterials(false); setDetectedMaterials([]); }}>
              Skip All
            </Button>
            <Button
              onClick={handleSaveDetectedMaterials}
              disabled={savingMaterials || acceptedCount === 0}
            >
              {savingMaterials ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackagePlus className="w-4 h-4 mr-2" />}
              Add {acceptedCount > 0 ? `${acceptedCount} ` : ""}to Catalogue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Individual material review row ───────────────────────────────────────────
function MaterialReviewRow({ material: m, onChange }) {
  const isAccepted = m.status === "accepted";
  const isRejected = m.status === "rejected";
  const isEditing = m.editing;

  return (
    <div className={cn(
      "border rounded-lg p-3 transition-all",
      isAccepted && "border-emerald-300 bg-emerald-50/50",
      isRejected && "border-red-200 bg-red-50/40 opacity-60",
      !isAccepted && !isRejected && "border-border"
    )}>
      {/* Header row */}
      <div className="flex items-center gap-2">
        {/* Status indicator */}
        <div className="flex gap-1 shrink-0">
          <button
            title="Accept"
            onClick={() => onChange("status", isAccepted ? "pending" : "accepted")}
            className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors", isAccepted ? "bg-emerald-500 text-white" : "border hover:bg-emerald-50 hover:border-emerald-300 text-muted-foreground")}
          >
            <Check className="w-3.5 h-3.5" />
          </button>
          <button
            title="Reject"
            onClick={() => onChange("status", isRejected ? "pending" : "rejected")}
            className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-colors", isRejected ? "bg-red-400 text-white" : "border hover:bg-red-50 hover:border-red-300 text-muted-foreground")}
          >
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Name */}
        {isEditing ? (
          <Input
            value={m.name}
            onChange={e => onChange("name", e.target.value)}
            className="h-7 text-sm font-medium flex-1"
            placeholder="Material name"
            autoFocus
          />
        ) : (
          <span className={cn("flex-1 text-sm font-medium truncate", isRejected && "line-through text-muted-foreground")}>{m.name || <span className="text-muted-foreground italic">Unnamed</span>}</span>
        )}

        {/* Edit toggle */}
        <button
          onClick={() => onChange("editing", !isEditing)}
          className="w-7 h-7 rounded-md border flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors shrink-0"
          title={isEditing ? "Done editing" : "Edit details"}
        >
          {isEditing ? <Check className="w-3.5 h-3.5 text-primary" /> : <Pencil className="w-3 h-3" />}
        </button>
      </div>

      {/* Detail fields — always visible, editable when isEditing */}
      {!isRejected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 ml-16">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Model / SKU</p>
            {isEditing ? (
              <Input value={m.model_number} onChange={e => onChange("model_number", e.target.value)} className="h-6 text-xs" placeholder="ABC-123" />
            ) : (
              <p className="text-xs text-foreground truncate">{m.model_number || <span className="text-muted-foreground/60">—</span>}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Dimensions</p>
            {isEditing ? (
              <Input value={m.dimensions} onChange={e => onChange("dimensions", e.target.value)} className="h-6 text-xs" placeholder="e.g. 1m×5m" />
            ) : (
              <p className="text-xs text-foreground truncate">{m.dimensions || <span className="text-muted-foreground/60">—</span>}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Unit</p>
            {isEditing ? (
              <Select value={m.unit} onValueChange={v => onChange("unit", v)}>
                <SelectTrigger className="h-6 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u} className="text-xs">{u.replace("_", " ")}</SelectItem>)}</SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-foreground">{m.unit?.replace("_", " ")}</p>
            )}
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Unit Price (€)</p>
            {isEditing ? (
              <Input type="number" step="0.01" placeholder="0.00" value={m.unit_price} onChange={e => onChange("unit_price", e.target.value)} className="h-6 text-xs" />
            ) : (
              <p className="text-xs font-medium text-foreground">{m.unit_price ? `€${parseFloat(m.unit_price).toFixed(2)}` : <span className="text-muted-foreground/60">—</span>}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}