import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, ExternalLink, Layers } from "lucide-react";

const ROOF_TYPE_LABELS = {
  asphalt_shingle: "Asphalt Shingle", metal: "Metal", tile: "Tile",
  flat: "Flat", slate: "Slate", wood_shake: "Wood Shake", other: "Other"
};

const CONDITION_STYLES = {
  new: "bg-emerald-100 text-emerald-700",
  good: "bg-green-100 text-green-700",
  fair: "bg-yellow-100 text-yellow-700",
  poor: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

export default function RoofAreasDisplay({ job }) {
  const areas = job?.roof_areas || [];
  const [expanded, setExpanded] = useState({});

  if (!areas.length) return null;

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Roof Areas / Sections
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">{areas.length} area{areas.length !== 1 ? "s" : ""} documented</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {areas.map((area, idx) => {
          const isOpen = !!expanded[area.id];
          const photoCount = area.photos?.length || 0;
          return (
            <div key={area.id || idx} className="border rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer bg-muted/30 hover:bg-muted/50 transition-colors"
                onClick={() => toggle(area.id || idx)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <span className="text-xs font-bold text-muted-foreground shrink-0">#{idx + 1}</span>
                  <span className="text-sm font-semibold truncate">{area.name || "Unnamed Area"}</span>
                  {area.area_sq_ft && <span className="text-xs text-muted-foreground shrink-0">{Number(area.area_sq_ft).toLocaleString()} sq ft</span>}
                  {area.condition && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CONDITION_STYLES[area.condition] || "bg-muted text-muted-foreground"}`}>
                      {area.condition}
                    </span>
                  )}
                  {photoCount > 0 && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">{photoCount} photo{photoCount !== 1 ? "s" : ""}</span>}
                </div>
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
              </div>

              {isOpen && (
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {area.roof_type && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Roof Type</p>
                        <p className="text-sm font-medium">{ROOF_TYPE_LABELS[area.roof_type] || area.roof_type}</p>
                      </div>
                    )}
                    {area.area_sq_ft && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Area</p>
                        <p className="text-sm font-medium">{Number(area.area_sq_ft).toLocaleString()} sq ft</p>
                      </div>
                    )}
                  </div>
                  {area.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm whitespace-pre-wrap">{area.notes}</p>
                    </div>
                  )}
                  {photoCount > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Photos ({photoCount})</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {area.photos.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="relative group aspect-square block">
                            <img src={url} alt="" className="w-full h-full object-cover rounded-lg border" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                              <ExternalLink className="w-4 h-4 text-white" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}