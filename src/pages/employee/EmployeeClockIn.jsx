import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import PageHeader from "@/components/shared/PageHeader";
import { MapContainer, TileLayer, CircleMarker, Circle, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Clock, CheckCircle2, AlertTriangle, Loader2, Navigation } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { TimesheetStatusBadge } from "@/components/shared/StatusBadge";

const GEOFENCE_RADIUS_METRES = 100;

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // metres
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Geocode address → coords
const geoCache = {};
async function geocode(address) {
  if (!address) return null;
  if (geoCache[address]) return geoCache[address];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`, {
      headers: { "Accept-Language": "en" }
    });
    const data = await res.json();
    if (data?.[0]) {
      const c = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geoCache[address] = c;
      return c;
    }
  } catch {}
  return null;
}

function GeoMap({ jobCoords, userCoords, inRange }) {
  if (!jobCoords) return null;
  const center = userCoords
    ? [(jobCoords.lat + userCoords.lat) / 2, (jobCoords.lng + userCoords.lng) / 2]
    : [jobCoords.lat, jobCoords.lng];

  return (
    <div style={{ height: "240px" }} className="rounded-xl overflow-hidden border">
      <MapContainer center={center} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Geofence radius */}
        <Circle
          center={[jobCoords.lat, jobCoords.lng]}
          radius={GEOFENCE_RADIUS_METRES}
          pathOptions={{ color: inRange ? "#10b981" : "#f97316", fillOpacity: 0.1, weight: 2 }}
        />
        {/* Job location */}
        <CircleMarker
          center={[jobCoords.lat, jobCoords.lng]}
          radius={10}
          pathOptions={{ fillColor: "#1e3a5f", fillOpacity: 0.9, color: "#fff", weight: 2 }}
        >
          <Popup><span className="text-xs font-medium">Job Site</span></Popup>
        </CircleMarker>
        {/* User location */}
        {userCoords && (
          <CircleMarker
            center={[userCoords.lat, userCoords.lng]}
            radius={8}
            pathOptions={{ fillColor: inRange ? "#10b981" : "#ef4444", fillOpacity: 0.9, color: "#fff", weight: 2 }}
          >
            <Popup><span className="text-xs font-medium">Your Location</span></Popup>
          </CircleMarker>
        )}
      </MapContainer>
    </div>
  );
}

export default function EmployeeClockIn() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const [selectedJobId, setSelectedJobId] = useState("");
  const [notes, setNotes] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [locating, setLocating] = useState(false);
  const [jobCoords, setJobCoords] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list(),
  });

  // Current user's open (no clock_out) timesheet entry
  const { data: myTimesheets = [] } = useQuery({
    queryKey: ["my-timesheets", user?.email],
    queryFn: () => base44.entities.Timesheet.filter({ created_by: user?.email }),
    enabled: !!user?.email,
  });

  const activeJobs = jobs.filter(j => !["completed", "cancelled"].includes(j.status));
  const selectedJob = activeJobs.find(j => j.id === selectedJobId);

  // Find an open shift (no clock_out) for this job
  const openShift = myTimesheets.find(t => t.job_id === selectedJobId && t.clock_in && !t.clock_out);

  // Geocode the selected job's address
  useEffect(() => {
    if (!selectedJob) { setJobCoords(null); return; }
    const addr = [selectedJob.address, selectedJob.city, selectedJob.state, selectedJob.zip].filter(Boolean).join(", ");
    setGeocoding(true);
    geocode(addr).then(c => { setJobCoords(c); setGeocoding(false); });
  }, [selectedJobId]);

  function getLocation() {
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      err => {
        setGeoError("Location access denied. Please allow location access.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const distanceMetres = userCoords && jobCoords
    ? haversineDistance(userCoords.lat, userCoords.lng, jobCoords.lat, jobCoords.lng)
    : null;

  const inRange = distanceMetres !== null && distanceMetres <= GEOFENCE_RADIUS_METRES;

  const clockInMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      return base44.entities.Timesheet.create({
        job_id: selectedJobId,
        job_address: selectedJob?.address || "",
        date: format(now, "yyyy-MM-dd"),
        clock_in: format(now, "HH:mm"),
        notes,
        status: "pending",
        break_minutes: 0,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-timesheets", user?.email] });
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Clocked in successfully!");
      setNotes("");
    },
  });

  const clockOutMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      const clockOut = format(now, "HH:mm");
      const [hIn, mIn] = (openShift.clock_in || "00:00").split(":").map(Number);
      const [hOut, mOut] = clockOut.split(":").map(Number);
      const hours = Math.max(0, +((hOut * 60 + mOut - hIn * 60 - mIn) / 60).toFixed(2));
      return base44.entities.Timesheet.update(openShift.id, { clock_out: clockOut, hours });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-timesheets", user?.email] });
      qc.invalidateQueries({ queryKey: ["timesheets"] });
      toast.success("Clocked out successfully!");
    },
  });

  // Recent my timesheets (last 10 completed shifts)
  const recentShifts = myTimesheets
    .filter(t => t.clock_in && t.clock_out)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .slice(0, 10);

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader title="My Clock-In" subtitle="Track your time on job sites" />

      <div className="space-y-5">
        {/* Job selector */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" /> Select Job Site</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Active Job *</Label>
              <Select value={selectedJobId} onValueChange={v => { setSelectedJobId(v); setUserCoords(null); setGeoError(null); }}>
                <SelectTrigger><SelectValue placeholder="Choose a job site..." /></SelectTrigger>
                <SelectContent>
                  {activeJobs.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.customer_name} — {j.address}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedJob && (
              <>
                {geocoding ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" /> Locating job site…
                  </div>
                ) : jobCoords ? (
                  <GeoMap jobCoords={jobCoords} userCoords={userCoords} inRange={inRange} />
                ) : (
                  <div className="text-sm text-muted-foreground">Could not geocode job address.</div>
                )}

                {/* Location check */}
                <div className="space-y-2">
                  <Button type="button" variant="outline" onClick={getLocation} disabled={locating} className="w-full">
                    {locating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Navigation className="w-4 h-4 mr-2" />}
                    {locating ? "Getting your location…" : "Check My Location"}
                  </Button>
                  {geoError && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {geoError}
                    </div>
                  )}
                  {userCoords && distanceMetres !== null && (
                    <div className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${inRange ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {inRange
                        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                        : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                      {inRange
                        ? `You're within range (${Math.round(distanceMetres)}m away). Ready to clock in/out.`
                        : `You're ${Math.round(distanceMetres)}m away — must be within ${GEOFENCE_RADIUS_METRES}m to clock in/out.`}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any notes for this shift…" />
                </div>

                {/* Clock In / Out */}
                {openShift ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-3 py-2.5">
                      <Clock className="w-4 h-4 flex-shrink-0" />
                      Active shift started at <strong>{openShift.clock_in}</strong>
                    </div>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      disabled={!inRange || clockOutMutation.isPending}
                      onClick={() => clockOutMutation.mutate()}
                    >
                      {clockOutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                      Clock Out
                    </Button>
                    {!inRange && <p className="text-xs text-center text-muted-foreground">You must be within {GEOFENCE_RADIUS_METRES}m of the job site to clock out.</p>}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      disabled={!inRange || clockInMutation.isPending}
                      onClick={() => clockInMutation.mutate()}
                    >
                      {clockInMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Clock className="w-4 h-4 mr-2" />}
                      Clock In
                    </Button>
                    {!inRange && userCoords && <p className="text-xs text-center text-muted-foreground">You must be within {GEOFENCE_RADIUS_METRES}m of the job site to clock in.</p>}
                    {!userCoords && <p className="text-xs text-center text-muted-foreground">Check your location above to enable clock-in.</p>}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent shifts */}
        {recentShifts.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Recent Shifts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentShifts.map(ts => {
                  const job = jobs.find(j => j.id === ts.job_id);
                  return (
                    <div key={ts.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/40 text-sm">
                      <div>
                        <p className="font-medium">{job?.customer_name || ts.job_address || "—"}</p>
                        <p className="text-xs text-muted-foreground">{ts.date ? format(new Date(ts.date), "EEE MMM d, yyyy") : "—"} · {ts.clock_in} – {ts.clock_out}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-semibold">{ts.hours?.toFixed(1)}h</span>
                        <TimesheetStatusBadge status={ts.status} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}