import { Link } from "react-router-dom";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const SERVICES = [
  {
    title: "New Roof Installation",
    icon: "🏠",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    desc: "Whether you're building new or replacing an aging roof, we offer full installation of all major roofing types.",
    features: ["Asphalt shingles", "Metal roofing", "Flat/EPDM", "Tile & slate", "Wood shake"],
  },
  {
    title: "Roof Repair",
    icon: "🔧",
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    desc: "From minor leak fixes to major storm damage, our team responds fast and does the job right.",
    features: ["Storm damage", "Leak repair", "Ridge & flashing", "Fascia & soffit", "Emergency callouts"],
  },
  {
    title: "Roof Inspection",
    icon: "🔍",
    img: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
    desc: "Get a full written assessment of your roof's condition — great for insurance claims and property sales.",
    features: ["Written report", "Photo documentation", "Condition rating", "Repair recommendations", "Insurance-ready"],
  },
  {
    title: "Gutters & Drainage",
    icon: "💧",
    img: "https://images.unsplash.com/photo-1625219975831-a8060f8bb62c?w=800&q=80",
    desc: "Properly fitted gutters protect your home from water damage. We supply and install all systems.",
    features: ["uPVC gutters", "Aluminium gutters", "Gutter cleaning", "Downpipe replacement", "French drains"],
  },
  {
    title: "Siding & Fascia",
    icon: "🏗️",
    img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    desc: "Protect and enhance your property's exterior with professional siding and fascia installations.",
    features: ["Fascia boards", "Soffit panels", "External cladding", "Bargeboards", "Paintwork"],
  },
  {
    title: "Maintenance Contracts",
    icon: "📋",
    img: "https://images.unsplash.com/photo-1566792636543-96c00f3428dc?w=800&q=80",
    desc: "Keep your roof performing year-round with a scheduled maintenance agreement.",
    features: ["Annual inspection", "Priority response", "Discounted repairs", "Custom schedule", "Written reports"],
  },
];

export default function WebsiteServices() {
  const [co, setCo] = useState(getCompanySettings());
  useEffect(() => {
    const handle = () => setCo(getCompanySettings());
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  const primary = co.primaryColor || "#1e3a5f";
  const accent  = co.accentColor  || "#e8730a";

  return (
    <div>
      {/* Hero */}
      <div className="py-20 text-white text-center" style={{ background: primary }}>
        <h1 className="text-5xl font-extrabold mb-4">Our Services</h1>
        <p className="text-white/75 text-xl max-w-2xl mx-auto px-4">
          From inspections to full replacements — professional roofing for every need.
        </p>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-16 space-y-16">
        {SERVICES.map((s, i) => (
          <div key={s.title} className={`flex flex-col md:flex-row gap-10 items-center ${i % 2 === 1 ? "md:flex-row-reverse" : ""}`}>
            <div className="flex-1">
              <img src={s.img} alt={s.title} className="rounded-2xl shadow-lg w-full h-64 object-cover" />
            </div>
            <div className="flex-1">
              <div className="text-4xl mb-3">{s.icon}</div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3">{s.title}</h2>
              <p className="text-slate-500 mb-5 text-base">{s.desc}</p>
              <ul className="space-y-2 mb-6">
                {s.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-slate-600 text-sm">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: accent }} />
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/website/contact">
                <Button style={{ background: primary }} className="text-white hover:opacity-90 gap-2">
                  Get a Quote <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}