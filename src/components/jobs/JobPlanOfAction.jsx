import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ClipboardList, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const FIELDS = [
  {
    key: "plan_of_action",
    label: "Scope of Works / Plan of Action",
    placeholder: "Describe in detail what work will be carried out, step by step...",
    aiContext: "scope of works and plan of action for a roofing job. Rewrite as a clear, professional, numbered sequence of work stages.",
  },
  {
    key: "plan_materials_required",
    label: "Materials Required",
    placeholder: "List all materials needed — membrane type, fixings, insulation, etc.",
    aiContext: "materials required list for a roofing job. Rewrite as a clean, professional bulleted list with quantities where mentioned.",
  },
  {
    key: "plan_access_notes",
    label: "Access & Site Notes",
    placeholder: "How will the crew access the roof? Any site-specific constraints?",
    aiContext: "access and site notes for a roofing job. Rewrite as clear, professional site instructions for the crew.",
  },
  {
    key: "plan_health_safety",
    label: "Health & Safety Considerations",
    placeholder: "Edge protection, PPE requirements, working at height precautions...",
    aiContext: "health and safety considerations for a roofing job. Rewrite as a professional H&S checklist using standard roofing industry terminology.",
  },
  {
    key: "plan_timeline",
    label: "Estimated Timeline & Phasing",
    placeholder: "e.g. Day 1 — strip & prepare, Day 2 — install membrane, Day 3 — finish & inspect",
    aiContext: "estimated timeline and phasing for a roofing job. Rewrite as a clear day-by-day or phase-by-phase schedule.",
  },
];

export default function JobPlanOfAction({ value = {}, onChange, readOnly = false }) {
  const [polishing, setPolishing] = useState({});
  const hasAny = FIELDS.some(f => value[f.key]);
  if (readOnly && !hasAny) return null;

  async function handlePolish(field) {
    const text = value[field.key];
    if (!text?.trim()) {
      toast.error("Please enter some content first.");
      return;
    }
    setPolishing(prev => ({ ...prev, [field.key]: true }));
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a professional roofing contractor writing official job documentation.

The following is a rough draft of the "${field.label}" section for a job. Rewrite it as a ${field.aiContext}

Rules:
- Use formal, professional UK/Irish roofing industry language
- Correct spelling and grammar
- Standardise terminology (e.g. "membrane" not "plastic sheet", "working at height" not "up on roof")
- Keep all factual details the user mentioned — do not invent new information
- Output only the rewritten text, no preamble or explanation

Draft input:
${text}`,
      });
      onChange({ ...value, [field.key]: result });
      toast.success("Content polished by AI");
    } catch {
      toast.error("AI polish failed, please try again.");
    } finally {
      setPolishing(prev => ({ ...prev, [field.key]: false }));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" /> Plan of Action
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Document the full plan for this job. Use the <Sparkles className="inline w-3 h-3 text-amber-500 mx-0.5" /> AI button on any field to standardise the wording.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        {FIELDS.map((field) => {
          const val = value[field.key] || "";
          if (readOnly && !val) return null;
          return (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm font-medium">{field.label}</Label>
                {!readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    onClick={() => handlePolish(field)}
                    disabled={polishing[field.key] || !val?.trim()}
                  >
                    {polishing[field.key]
                      ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      : <Sparkles className="w-3 h-3 mr-1" />
                    }
                    AI Polish
                  </Button>
                )}
              </div>
              {readOnly ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 rounded-lg p-3 border">{val}</p>
              ) : (
                <Textarea
                  rows={3}
                  value={val}
                  onChange={e => onChange({ ...value, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}