import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ChevronDown, ChevronUp, Upload, X, Loader2, ExternalLink, Layers } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ROOF_TYPES = [
  { value: "asphalt_shingle", label: "Asphalt Shingle" },
  { value: "metal", label: "Metal" },
  { value: "tile", label: "Tile" },
  { value: "flat", label: "Flat" },
  { value: "slate", label: "Slate" },
  { value: "wood_shake", label: "Wood Shake" },
  { value: "other", label: "Other" },
];

const CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "poor", label: "Poor" },
  { value: "critical", label: "Critical" },
];

function PhotoGrid({ urls, onRemove }) {
  if (!urls?.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
      {urls.map((url, i) => (
        <div key={i} className="relative group aspect-square">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <img src={url} alt="" className="w-full h-full object-cover rounded-lg border" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <ExternalLink className="w-4 h-4 text-white" />
            </div>
          </a>
          {onRemove && (
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function newArea() {
  return {
    id: crypto.randomUUID(),
    name: "",
    area_sq_ft: "",
    roof_type: "",
    condition: "",
    notes: "",
    photos: [],
  };
}

export default function RoofAreasEditor({ value = [], onChange }) {
  const [expanded, setExpanded] = useState({});
  const [uploading, setUploading] = useState({});

  function addArea() {
    const area = newArea();
    const updated = [...value, area];
    onChange(updated);
    setExpanded(prev => ({ ...prev, [area.id]: true }));
  }

  function removeArea(id) {
    onChange(value.filter(a => a.id !== id));
  }

  function updateArea(id, field, val) {
    onChange(value.map(a => a.id === id ? { ...a, [field]: val } : a));
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleUpload(areaId, files) {
    if (!files?.length) return;
    setUploading(prev => ({ ...prev, [areaId]: true }));
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(file => base44.integrations.Core.UploadFile({ file }))
      );
      const newUrls = uploaded.map(r => r.file_url);
      const area = value.find(a => a.id === areaId);
      updateArea(areaId, "photos", [...(area?.photos || []), ...newUrls]);
      toast.success(`${newUrls.length} photo(s) uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(prev => ({ ...prev, [areaId]: false }));
    }
  }

  function removePhoto(areaId, idx) {
    const area = value.find(a => a.id === areaId);
    updateArea(areaId, "photos", (area?.photos || []).filter((_, i) => i !== idx));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" /> Roof Areas / Sections
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Add each distinct roof section with its own details and photos.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addArea}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Area
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {value.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 italic">No roof areas added yet. Click "Add Area" to begin.</p>
        )}
        {value.map((area, idx) => {
          const isOpen = expanded[area.id] !== false; // default open
          const photoCount = area.photos?.length || 0;
          return (
            <div key={area.id} className="border rounded-xl overflow-hidden">
              {/* Header row */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggleExpand(area.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                  <span className="text-sm font-semibold truncate">{area.name || "Unnamed Area"}</span>
                  {area.area_sq_ft && <span className="text-xs text-muted-foreground shrink-0">{area.area_sq_ft} sq ft</span>}
                  {photoCount > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{photoCount} photo{photoCount !== 1 ? "s" : ""}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeArea(area.id); }}
                    className="text-muted-foreground hover:text-destructive transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded body */}
              {isOpen && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Area Name *</Label>
                      <Input
                        value={area.name}
                        onChange={e => updateArea(area.id, "name", e.target.value)}
                        placeholder="e.g. Front Slope, Rear Extension, Flat Roof"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Area (sq ft)</Label>
                      <Input
                        type="number" min="0"
                        value={area.area_sq_ft}
                        onChange={e => updateArea(area.id, "area_sq_ft", e.target.value)}
                        placeholder="e.g. 800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Roof Type</Label>
                      <Select value={area.roof_type || ""} onValueChange={v => updateArea(area.id, "roof_type", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {ROOF_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Condition</Label>
                      <Select value={area.condition || ""} onValueChange={v => updateArea(area.id, "condition", v)}>
                        <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                        <SelectContent>
                          {CONDITION_OPTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Notes</Label>
                      <Textarea
                        value={area.notes}
                        onChange={e => updateArea(area.id, "notes", e.target.value)}
                        placeholder="Specific issues, materials, observations..."
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Photos for this area */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Photos</Label>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={e => handleUpload(area.id, e.target.files)}
                        />
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            {uploading[area.id]
                              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              : <Upload className="w-3.5 h-3.5 mr-1.5" />
                            }
                            {photoCount > 0 ? `Add More (${photoCount})` : "Upload Photos"}
                          </span>
                        </Button>
                      </label>
                    </div>
                    {photoCount === 0 && (
                      <p className="text-xs text-muted-foreground italic">No photos for this area yet.</p>
                    )}
                    <PhotoGrid
                      urls={area.photos || []}
                      onRemove={(i) => removePhoto(area.id, i)}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}