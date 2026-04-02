import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Loader2, ExternalLink } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const CATEGORIES = [
  { key: "photos_access",   label: "Access & Approach",  desc: "Ladders, access points, scaffolding setup" },
  { key: "photos_overall",  label: "Overall Roof",        desc: "Wide shots of the full roof from all angles" },
  { key: "photos_damage",   label: "Damage",              desc: "Close-up shots of all damage areas" },
  { key: "photos_interior", label: "Interior",            desc: "Ceiling, loft, internal water damage" },
  { key: "photos_exterior", label: "Exterior / Facade",   desc: "Walls, gutters, fascia, soffits" },
];

function PhotoGrid({ urls, onRemove }) {
  if (!urls?.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
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

export default function JobPhotos({ value = {}, onChange, readOnly = false }) {
  const [uploading, setUploading] = useState({});

  async function handleUpload(categoryKey, files) {
    if (!files?.length) return;
    setUploading(prev => ({ ...prev, [categoryKey]: true }));
    try {
      const uploaded = await Promise.all(
        Array.from(files).map(file => base44.integrations.Core.UploadFile({ file }))
      );
      const newUrls = uploaded.map(r => r.file_url);
      const existing = value[categoryKey] || [];
      onChange({ ...value, [categoryKey]: [...existing, ...newUrls] });
      toast.success(`${newUrls.length} photo(s) uploaded`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(prev => ({ ...prev, [categoryKey]: false }));
    }
  }

  function removePhoto(categoryKey, index) {
    const updated = (value[categoryKey] || []).filter((_, i) => i !== index);
    onChange({ ...value, [categoryKey]: updated });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> Site Photography
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Upload photos for each category to document the job site.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {CATEGORIES.map(({ key, label, desc }) => {
          const photos = value[key] || [];
          const isUploading = uploading[key];
          return (
            <div key={key} className="border rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
                {!readOnly && (
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handleUpload(key, e.target.files)}
                    />
                    <Button type="button" variant="outline" size="sm" asChild>
                      <span>
                        {isUploading
                          ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          : <Upload className="w-3.5 h-3.5 mr-1.5" />
                        }
                        {photos.length > 0 ? `Add More (${photos.length})` : "Upload"}
                      </span>
                    </Button>
                  </label>
                )}
              </div>
              {photos.length === 0 && (
                <p className="text-xs text-muted-foreground mt-3 italic">No photos uploaded yet.</p>
              )}
              <PhotoGrid
                urls={photos}
                onRemove={readOnly ? null : (i) => removePhoto(key, i)}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}