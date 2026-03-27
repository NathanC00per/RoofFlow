import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Renders and manages custom field inputs for a job form.
 * @param {object[]} fields - template field definitions
 * @param {object[]} values - current custom_fields values [{field_id, label, type, value}]
 * @param {function} onChange - called with updated values array
 */
export default function CustomFieldsSection({ fields = [], values = [], onChange }) {
  const [uploading, setUploading] = useState({});

  const getValue = (fieldId) => {
    const entry = values.find(v => v.field_id === fieldId);
    return entry?.value ?? "";
  };

  const setValue = (field, newValue) => {
    const existing = values.filter(v => v.field_id !== field.id);
    onChange([...existing, { field_id: field.id, label: field.label, type: field.type, value: newValue }]);
  };

  const handlePhotoUpload = async (field, files) => {
    if (!files?.length) return;
    setUploading(u => ({ ...u, [field.id]: true }));
    try {
      const urls = await Promise.all(
        Array.from(files).map(file => base44.integrations.Core.UploadFile({ file }).then(r => r.file_url))
      );
      const current = getValue(field.id);
      const existing = Array.isArray(current) ? current : [];
      setValue(field, [...existing, ...urls]);
      toast.success(`${urls.length} photo(s) uploaded`);
    } catch {
      toast.error("Photo upload failed");
    } finally {
      setUploading(u => ({ ...u, [field.id]: false }));
    }
  };

  const removePhoto = (field, url) => {
    const current = getValue(field.id);
    const existing = Array.isArray(current) ? current : [];
    setValue(field, existing.filter(u => u !== url));
  };

  if (!fields.length) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(field => (
        <div
          key={field.id}
          className={field.type === "textarea" || field.type === "photo" ? "md:col-span-2" : ""}
        >
          <FieldInput
            field={field}
            value={getValue(field.id)}
            onChange={(v) => setValue(field, v)}
            onPhotoUpload={(files) => handlePhotoUpload(field, files)}
            onRemovePhoto={(url) => removePhoto(field, url)}
            uploading={!!uploading[field.id]}
          />
        </div>
      ))}
    </div>
  );
}

function FieldInput({ field, value, onChange, onPhotoUpload, onRemovePhoto, uploading }) {
  const fileRef = useRef(null);

  return (
    <div className="space-y-2">
      <Label>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {field.type === "text" && (
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ""} required={field.required} />
      )}

      {field.type === "number" && (
        <Input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ""} required={field.required} />
      )}

      {field.type === "textarea" && (
        <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder || ""} rows={3} required={field.required} />
      )}

      {field.type === "date" && (
        <Input type="date" value={value} onChange={e => onChange(e.target.value)} required={field.required} />
      )}

      {field.type === "select" && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
          <SelectContent>
            {(field.options || []).map(opt => (
              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "photo" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              Upload Photos
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              if (fileRef.current) {
                fileRef.current.setAttribute("capture", "environment");
                fileRef.current.click();
              }
            }} disabled={uploading}>
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => onPhotoUpload(e.target.files)}
          />
          {Array.isArray(value) && value.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {value.map((url, i) => (
                <div key={i} className="relative group">
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg border" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(url)}
                    className="absolute top-1 right-1 bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}