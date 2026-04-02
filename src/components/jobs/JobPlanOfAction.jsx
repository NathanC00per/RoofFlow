import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList } from "lucide-react";

const FIELDS = [
  { key: "plan_of_action",         label: "Scope of Works / Plan of Action", placeholder: "Describe in detail what work will be carried out, step by step..." },
  { key: "plan_materials_required",label: "Materials Required",               placeholder: "List all materials needed — membrane type, fixings, insulation, etc." },
  { key: "plan_access_notes",      label: "Access & Site Notes",              placeholder: "How will the crew access the roof? Any site-specific constraints?" },
  { key: "plan_health_safety",     label: "Health & Safety Considerations",   placeholder: "Edge protection, PPE requirements, working at height precautions..." },
  { key: "plan_timeline",          label: "Estimated Timeline & Phasing",     placeholder: "e.g. Day 1 — strip & prepare, Day 2 — install membrane, Day 3 — finish & inspect" },
];

export default function JobPlanOfAction({ value = {}, onChange, readOnly = false }) {
  const hasAny = FIELDS.some(f => value[f.key]);
  if (readOnly && !hasAny) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" /> Plan of Action
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Document the full plan for this job — scope, materials, access, H&S and timeline.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {FIELDS.map(({ key, label, placeholder }) => {
          const val = value[key] || "";
          if (readOnly && !val) return null;
          return (
            <div key={key} className="space-y-1.5">
              <Label className="text-sm font-medium">{label}</Label>
              {readOnly ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded-lg p-3 border">{val}</p>
              ) : (
                <Textarea
                  rows={3}
                  value={val}
                  onChange={e => onChange({ ...value, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}