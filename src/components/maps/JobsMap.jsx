import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// Status → colour mapping
const STATUS_COLORS = {
  lead:               "#94a3b8",
  estimate_scheduled: "#38bdf8",
  estimate_sent:      "#3b82f6",
  approved:           "#8b5cf6",
  scheduled:          "#f59e0b",
  in_progress:        "#f97316",
  completed:          "#10b981",
  cancelled:          "#ef4444",
};

const STATUS_LABELS = {
  lead:               "Lead",
  estimate_scheduled: "Est. Scheduled",
  estimate_sent:      "Est. Sent",
  approved:           "Approved",
  scheduled:          "Scheduled",
  in_progress:        "In Progress",
  completed:          "Completed",
  cancelled:          "Cancelled",
};

// Geocode an address string → { lat, lng } using Nominatim
const geocodeCache = {};
async function geocode(address) {
  if (!address) return null;
  if (geocodeCache[address]) return geocodeCache[address];
  try {
    const q = encodeURIComponent(address);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { "Accept-Language": "en" }
    });
    const data = await res.json();
    if (data && data[0]) {
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[address] = coords;
      return coords;
    }
  } catch {}
  return null;
}

function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
      return;
    }
    const lats = points.map(p => p.lat);
    const lngs = points.map(p => p.lng);
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [40, 40], maxZoom: 14 }
    );
  }, [points]);
  return null;
}

/**
 * Props:
 *   jobs          – array of job objects (must have address, status, customer_name, id)
 *   singleJob     – pass a single job object to show just that one job (no filters)
 *   height        – css height string, default "400px"
 */
export default function JobsMap({ jobs = [], singleJob = null, height = "400px" }) {
  const [geocoded, setGeocoded] = useState([]);
  const [loading, setLoading] = useState(true);

  const jobList = singleJob ? [singleJob] : jobs;

  useEffect(() => {
    if (jobList.length === 0) { setLoading(false); return; }
    setLoading(true);
    let cancelled = false;

    async function run() {
      const results = await Promise.all(
        jobList.map(async (job) => {
          const addressStr = [job.address, job.city, job.state, job.zip].filter(Boolean).join(", ");
          const coords = await geocode(addressStr);
          return coords ? { ...coords, job } : null;
        })
      );
      if (!cancelled) {
        setGeocoded(results.filter(Boolean));
        setLoading(false);
      }
    }
    run();
    return () => { cancelled = true; };
  }, [jobList.map(j => j.id).join(",")]);

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl" style={{ height }}>
        <div className="w-6 h-6 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (geocoded.length === 0) {
    return (
      <div className="flex items-center justify-center bg-muted/30 rounded-xl text-muted-foreground text-sm" style={{ height }}>
        No mappable job addresses found
      </div>
    );
  }

  const center = geocoded.length > 0 ? [geocoded[0].lat, geocoded[0].lng] : [51.505, -0.09];

  return (
    <div style={{ height, isolation: "isolate" }} className="rounded-xl overflow-hidden border relative z-0">
      <MapContainer center={center} zoom={10} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={geocoded} />
        {geocoded.map(({ lat, lng, job }, i) => {
          const color = STATUS_COLORS[job.status] || "#6b7280";
          return (
            <CircleMarker
              key={job.id || i}
              center={[lat, lng]}
              radius={singleJob ? 12 : 9}
              pathOptions={{ fillColor: color, fillOpacity: 0.85, color: "#fff", weight: 2 }}
            >
              <Popup>
                <div className="text-sm space-y-1 min-w-[160px]">
                  <p className="font-semibold">{job.customer_name}</p>
                  <p className="text-muted-foreground text-xs">{job.address}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                    <span className="capitalize text-xs">{STATUS_LABELS[job.status] || job.status}</span>
                  </div>
                  {!singleJob && (
                    <Link to={`/jobs/${job.id}`} className="text-xs text-blue-600 hover:underline block mt-1">
                      View job →
                    </Link>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export function MapLegend({ statuses }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
      {statuses.map(s => (
        <div key={s} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: STATUS_COLORS[s] || "#6b7280" }} />
          {STATUS_LABELS[s] || s}
        </div>
      ))}
    </div>
  );
}