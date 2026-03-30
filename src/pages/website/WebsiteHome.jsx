import { Link } from "react-router-dom";
import { getCompanySettings } from "@/pages/settings/CompanySettings";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Clock, Star, ChevronRight, Phone, Mail, MapPin, CheckCircle2 } from "lucide-react";

export default function WebsiteHome() {
  const [co, setCo] = useState(getCompanySettings());
  useEffect(() => {
    const handle = () => setCo(getCompanySettings());
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  const primary = co.primaryColor || "#1e3a5f";
  const accent  = co.accentColor  || "#e8730a";
  const name    = co.companyName  || "RoofPro";

  const services = [
    { title: "New Roof Installation", desc: "Full installation of asphalt shingle, metal, tile, flat and more.", icon: "🏠" },
    { title: "Roof Repair", desc: "Fast, guaranteed repairs for leaks, storm damage and worn sections.", icon: "🔧" },
    { title: "Roof Inspection", desc: "Detailed assessments with written condition reports.", icon: "🔍" },
    { title: "Gutters & Drainage", desc: "Supply, fit and clean gutter systems for any property.", icon: "💧" },
    { title: "Siding & Fascia", desc: "External wall cladding and fascia board replacement.", icon: "🏗️" },
    { title: "Maintenance Contracts", desc: "Scheduled servicing to keep your roof in peak condition.", icon: "📋" },
  ];

  const testimonials = [
    { name: "Sarah M.", rating: 5, text: "Absolutely brilliant service. The team was on time, tidy and the roof looks perfect." },
    { name: "James O'Brien", rating: 5, text: "Very professional from quote through to completion. Highly recommend." },
    { name: "Aoife K.", rating: 5, text: "Sorted a leak that another company couldn't fix. Came same day and did a great job." },
  ];

  return (
    <div className="font-inter">
      {/* Hero */}
      <section
        className="relative min-h-[80vh] flex items-center justify-center text-white"
        style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primary}cc 60%, ${accent}44 100%)` }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=1600&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative z-10 text-center max-w-4xl mx-auto px-6">
          {co.logoUrl && <img src={co.logoUrl} alt={name} className="h-20 mx-auto mb-6 object-contain" />}
          <h1 className="text-5xl sm:text-6xl font-extrabold mb-4 leading-tight">{name}</h1>
          <p className="text-xl sm:text-2xl text-white/80 mb-8 max-w-2xl mx-auto">
            Professional roofing services you can trust. Quality workmanship, competitive pricing, guaranteed results.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/website/contact">
              <Button size="lg" style={{ background: accent }} className="text-white border-0 hover:opacity-90 text-base px-8 py-6">
                Get a Free Quote <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Link to="/website/services">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-base px-8 py-6">
                Our Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <div className="bg-white border-b py-6">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Shield, label: "Fully Insured" },
            { icon: CheckCircle2, label: "Quality Guaranteed" },
            { icon: Clock, label: "Fast Response" },
            { icon: Star, label: "5-Star Rated" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${accent}20` }}>
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <span className="text-sm font-semibold text-slate-700">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Services preview */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-3">Our Services</h2>
            <p className="text-slate-500 text-lg">Comprehensive roofing solutions for residential and commercial properties</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(s => (
              <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{s.icon}</div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/website/services">
              <Button size="lg" style={{ background: primary }} className="text-white hover:opacity-90">
                View All Services <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-800 mb-3">What Our Customers Say</h2>
            <div className="flex justify-center gap-1">
              {[1,2,3,4,5].map(i => <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />)}
              <span className="ml-2 text-slate-500 text-sm self-center">5.0 average rating</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-slate-50 rounded-2xl p-6 border">
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                </div>
                <p className="text-slate-600 text-sm italic mb-4">"{t.text}"</p>
                <p className="font-semibold text-slate-800 text-sm">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 text-white text-center" style={{ background: primary }}>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-white/75 mb-8 text-lg">Contact us today for a free, no-obligation quote.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            {co.companyPhone && (
              <a href={`tel:${co.companyPhone}`}>
                <Button size="lg" style={{ background: accent }} className="text-white border-0 hover:opacity-90 gap-2">
                  <Phone className="w-4 h-4" /> {co.companyPhone}
                </Button>
              </a>
            )}
            <Link to="/website/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 gap-2">
                <Mail className="w-4 h-4" /> Send a Message
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            {co.logoUrl && <img src={co.logoUrl} alt={name} className="h-10 mb-3 object-contain" />}
            <h3 className="text-white font-bold text-lg mb-2">{name}</h3>
            <p className="text-sm">{co.footerText || "Quality roofing you can trust."}</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              {[["Home", "/website"], ["Services", "/website/services"], ["Gallery", "/website/gallery"], ["Testimonials", "/website/testimonials"], ["Contact", "/website/contact"]].map(([l, p]) => (
                <li key={l}><Link to={p} className="hover:text-white transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Contact</h4>
            <div className="space-y-2 text-sm">
              {co.companyPhone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{co.companyPhone}</p>}
              {co.companyEmail && <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{co.companyEmail}</p>}
              {co.companyAddress && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{co.companyAddress}</p>}
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-800 text-center text-xs">
          © {new Date().getFullYear()} {name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}