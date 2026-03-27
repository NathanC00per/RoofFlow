import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutTemplate } from "lucide-react";

export default function CustomFieldsDisplay({ job }) {
  const fields = (job.custom_fields || []).filter(f => {
    if (f.type === "photo") return Array.isArray(f.value) && f.value.length > 0;
    return f.value !== "" && f.value !== null && f.value !== undefined;
  });

  if (!fields.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-primary" />
          {job.template_name || "Custom Fields"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fields.map((f, i) => {
            if (f.type === "photo") {
              return (
                <div key={i} className="md:col-span-2">
                  <p className="text-xs text-muted-foreground mb-2">{f.label}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {f.value.map((url, j) => (
                      <a key={j} href={url} target="_blank" rel="noopener noreferrer">
                        <img src={url} alt={`${f.label} ${j + 1}`} className="w-full h-20 object-cover rounded-lg border hover:opacity-90 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={i}>
                <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                <p className="text-sm font-medium whitespace-pre-wrap">{String(f.value)}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}