import { Link } from "react-router-dom";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const SERVICES = [
  {
    title: "New Roof Installations",
    icon: "🏠",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
    desc: "Whether you're building new or replacing an aging roof, we offer full installation across all major flat and pitched roofing systems.",
    features: ["Torch on Felt", "PVC Systems (Alkorplan, ArmourPlan, Trocal)", "Slate & Tile", "Resitrix / Rubber Based Systems", "Commercial & domestic"],
  },
  {
    title: "Roof Repairs",
    icon: "🔧",
    img: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80",
    desc: "One-off and maintenance repairs on all roof systems. Our team responds fast and does the job right — first time.",
    features: ["Torch on felt repairs", "PVC membrane repairs", "Slate & tile repairs", "Leak diagnosis & fix", "Emergency callouts"],
  },
  {
    title: "Roof Inspections & Quotations",
    icon: "🔍",
    img: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
    desc: "Free of charge roof inspections with honest, detailed quotations. No obligation, no hidden costs.",
    features: ["100% free of charge", "Detailed condition report", "Photo documentation", "Honest recommendations", "No sales pressure"],
  },
  {
    title: "PVC Roof Systems",
    icon: "🏗️",
    img: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80",
    desc: "Specialists in PVC-based flat roof systems for commercial and domestic properties — durable, weatherproof and long-lasting.",
    features: ["Alkorplan", "ArmourPlan", "Trocal", "Fully welded seams", "20+ year guarantees"],
  },
  {
    title: "Resitrix & Rubber Roofing",
    icon: "💧",
    img: "https://images.unsplash.com/photo-1625219975831-a8060f8bb62c?w=800&q=80",
    desc: "Installation and repair of Resitrix and other rubber-based flat roof systems — ideal for low-pitch and flat roofs.",
    features: ["Resitrix EPDM", "Single-ply membranes", "New installations", "Repair & overlay", "Long-term weatherproofing"],
  },
  {
    title: "Maintenance Contracts",
    icon: "📋",
    img: "https://images.unsplash.com/photo-1566792636543-96c00f3428dc?w=800&q=80",
    desc: "Scheduled maintenance and servicing to keep your roof in peak condition all year round. Priority response included.",
    features: ["Regular scheduled visits", "Annual inspection", "Priority emergency response", "Discounted repair rates", "Written condition reports"],
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
          From free inspections to full installations — professional roofing across Dublin and Ireland with 20+ years experience.
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