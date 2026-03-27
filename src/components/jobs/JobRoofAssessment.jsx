import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HardHat } from "lucide-react";

const CONDITION_STYLES = {
  new: "bg-emerald-100 text-emerald-700",
  good: "bg-green-100 text-green-700",
  fair: "bg-yellow-100 text-yellow-700",
  poor: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const ROOF_TYPE_LABELS = {
  asphalt_shingle: "Asphalt Shingle", metal: "Metal", tile: "Tile",
  flat: "Flat", slate: "Slate", wood_shake: "Wood Shake", other: "Other"
};

export default function JobRoofAssessment({ job }) {
  const hasAssessment = job.roof_condition || job.roof_type || job.roof_age_years || job.roof_area_sq_ft || job.layers_count || (job.damage_types || []).length > 0;

  if (!hasAssessment) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <HardHat className="w-4 h-4 text-primary" /> Roof Assessment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {job.roof_condition && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Condition</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${CONDITION_STYLES[job.roof_condition] || "bg-muted text-muted-foreground"}`}>
                {job.roof_condition}
              </span>
            </div>
          )}
          {job.roof_type && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Roof Type</p>
              <p className="text-sm font-medium">{ROOF_TYPE_LABELS[job.roof_type] || job.roof_type}</p>
            </div>
          )}
          {job.roof_age_years != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Roof Age</p>
              <p className="text-sm font-medium">{job.roof_age_years} yrs</p>
            </div>
          )}
          {job.roof_area_sq_ft != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Roof Area</p>
              <p className="text-sm font-medium">{Number(job.roof_area_sq_ft).toLocaleString()} sq ft</p>
            </div>
          )}
          {job.layers_count != null && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Layers</p>
              <p className="text-sm font-medium">{job.layers_count}</p>
            </div>
          )}
        </div>
        {(job.damage_types || []).length > 0 && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Damage Types</p>
            <div className="flex flex-wrap gap-1.5">
              {job.damage_types.map(d => (
                <Badge key={d} variant="outline" className="text-xs capitalize">{d.replace(/_/g, " ")}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}