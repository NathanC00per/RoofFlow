import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { useState, useEffect } from "react";
import { Star } from "lucide-react";

const TESTIMONIALS = [
  { name: "Sarah M.", location: "Dublin", rating: 5, date: "March 2025", text: "Absolutely brilliant service. The team was on time, tidy, and the roof looks perfect. Would 100% recommend to anyone." },
  { name: "James O'Brien", location: "Cork", rating: 5, date: "February 2025", text: "Very professional from quote right through to completion. They explained everything clearly and stuck to the agreed price." },
  { name: "Aoife K.", location: "Galway", rating: 5, date: "January 2025", text: "Sorted a leak that another company couldn't fix. They came the same day, diagnosed the issue, and repaired it properly." },
  { name: "Michael T.", location: "Limerick", rating: 5, date: "December 2024", text: "Had a full roof replacement done. The crew were great — professional, quick, and left the site spotless." },
  { name: "Niamh R.", location: "Waterford", rating: 5, date: "November 2024", text: "Used them for an inspection before buying a house. The report was detailed and exactly what the bank required." },
  { name: "Paul C.", location: "Dublin", rating: 4, date: "October 2024", text: "Really happy with the gutters installation. Small delay on start date but communication was good and the result is excellent." },
];

function Stars({ count }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < count ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
      ))}
    </div>
  );
}

export default function WebsiteTestimonials() {
  const [co, setCo] = useState(getCompanySettings());
  useEffect(() => {
    const handle = () => setCo(getCompanySettings());
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  const primary = co.primaryColor || "#1e3a5f";
  const accent  = co.accentColor  || "#e8730a";
  const avgRating = (TESTIMONIALS.reduce((s, t) => s + t.rating, 0) / TESTIMONIALS.length).toFixed(1);

  return (
    <div>
      <div className="py-20 text-white text-center" style={{ background: primary }}>
        <h1 className="text-5xl font-extrabold mb-4">Customer Reviews</h1>
        <div className="flex items-center justify-center gap-2 mb-2">
          <Stars count={5} />
          <span className="text-white text-2xl font-bold">{avgRating}</span>
        </div>
        <p className="text-white/70 text-base">{TESTIMONIALS.length} verified reviews</p>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-2xl p-6 border shadow-sm">
              <Stars count={t.rating} />
              <p className="mt-3 text-slate-600 italic text-sm leading-relaxed">"{t.text}"</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
                  <p className="text-xs text-slate-400">{t.location}</p>
                </div>
                <span className="text-xs text-slate-400">{t.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}